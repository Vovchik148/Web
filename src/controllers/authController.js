import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { matchedData } from "express-validator";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import config from "../utils/config.js";
import { prisma } from "../db.js";
import userModel from "../models/user.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { logAction } from "../utils/audit.js";
import { sendMail } from "../utils/mailer.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateTwoFactorTempToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const ISSUER_NAME = "Warehouse Inventory API";
// Термін дії одноразового токена скидання пароля
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

// Створює пару токенів і зберігає хеш refresh токена в БД, щоб його можна було відкликати
const issueTokens = async (user) => {
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);
  const { exp } = verifyRefreshToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash: sha256(refreshToken),
      userId: user.id,
      expiresAt: new Date(exp * 1000),
    },
  });

  return { accessToken, refreshToken };
};

const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = matchedData(req, { locations: ["body"] });

  if (await userModel.findByEmail(email)) {
    throw new ApiError(409, "Користувач з таким email вже існує");
  }

  // Публічна реєстрація завжди створює роль WORKER; вищі ролі видає лише ADMIN
  const user = await userModel.create({
    email,
    firstName,
    lastName,
    password: await hashPassword(password),
  });

  logAction(req, "auth.register", { entity: "user", entityId: user.id, details: { email } });

  res.status(201).json({
    message: "Користувача зареєстровано",
    user,
    tokens: await issueTokens(user),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = matchedData(req, { locations: ["body"] });

  const user = await userModel.findByEmail(email);
  // Однакова відповідь для «немає користувача» і «невірний пароль» - щоб не розкривати, які email існують
  if (!user || !(await comparePassword(password, user.password))) {
    logAction(req, "auth.login_failed", { entity: "user", details: { email } });
    throw new ApiError(401, "Невірний email або пароль");
  }
  if (!user.isActive) throw new ApiError(403, "Обліковий запис деактивовано");

  // При увімкненій 2FA пароль - лише перший крок: повертаємо короткоживучий
  // тимчасовий токен, а повні токени видаємо після перевірки коду (POST /auth/2fa/verify)
  if (user.twoFactorEnabled) {
    const tempToken = generateTwoFactorTempToken(user.id);
    res.json({
      message: "Вкажіть код двофакторної автентифікації",
      twoFactorRequired: true,
      tempToken,
    });
    return;
  }

  logAction(req, "auth.login", { entity: "user", entityId: user.id });

  // twoFactorSecret не повинен потрапляти у відповідь
  const { password: _hash, twoFactorSecret: _secret, ...safeUser } = user;
  res.json({ message: "Вхід виконано", user: safeUser, tokens: await issueTokens(user) });
});

// Другий крок входу при увімкненій 2FA
const verifyTwoFactor = asyncHandler(async (req, res) => {
  const { tempToken, code } = matchedData(req, { locations: ["body"] });

  let decoded;
  try {
    decoded = jwt.verify(tempToken, config.jwtSecret);
  } catch {
    throw new ApiError(401, "Тимчасовий токен недійсний або його термін закінчився");
  }
  if (decoded.purpose !== "2fa") {
    throw new ApiError(401, "Тимчасовий токен недійсний");
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || !user.isActive || !user.twoFactorEnabled) {
    throw new ApiError(401, "Користувача не знайдено або 2FA не увімкнено");
  }

  if (!authenticator.verify({ token: code, secret: user.twoFactorSecret })) {
    logAction(req, "auth.2fa_failed", { entity: "user", entityId: user.id });
    throw new ApiError(401, "Невірний код підтвердження");
  }

  logAction(req, "auth.login", { entity: "user", entityId: user.id, details: { twoFactor: true } });

  const { password: _hash, twoFactorSecret: _secret, ...safeUser } = user;
  res.json({ message: "Вхід виконано", user: safeUser, tokens: await issueTokens(user) });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body ?? {};

  if (!refreshToken) throw new ApiError(400, "Refresh токен відсутній");

  try {
    verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Недійсний refresh токен");
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(refreshToken) },
    include: { user: true },
  });

  if (!stored || stored.revokedAt) {
    // Повторне використання відкликаного токена: відкликаємо всі токени користувача
    if (stored) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    throw new ApiError(401, "Недійсний refresh токен");
  }

  if (!stored.user.isActive) throw new ApiError(401, "Обліковий запис деактивовано");

  // Ротація: старий токен відкликаємо, видаємо нову пару
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  res.json({ tokens: await issueTokens(stored.user) });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body ?? {};

  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  logAction(req, "auth.logout", { entity: "user", entityId: req.user?.id });

  res.status(204).end();
});

const getProfile = asyncHandler(async (req, res) => {
  res.json(await userModel.findById(req.user.id));
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await userModel.update(req.user.id, matchedData(req, { locations: ["body"] }));
  res.json({ message: "Профіль оновлено", user });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = matchedData(req, { locations: ["body"] });

  const user = await userModel.findByIdWithPassword(req.user.id);
  if (!(await comparePassword(currentPassword, user.password))) {
    throw new ApiError(400, "Поточний пароль невірний");
  }

  await userModel.update(req.user.id, { password: await hashPassword(newPassword) });
  logAction(req, "auth.password_changed", { entity: "user", entityId: req.user.id });
  res.json({ message: "Пароль змінено" });
});

// Запит на відновлення пароля. Відповідь ЗАВЖДИ 200 - щоб з відповіді
// не можна було дізнатися, чи існує в системі email
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = matchedData(req, { locations: ["body"] });
  const user = await userModel.findByEmail(email);

  if (user?.isActive) {
    // У БД зберігаємо лише хеш: сирий токен йде в лист одноразово
    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        tokenHash: sha256(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });

    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
    try {
      await sendMail({
        to: user.email,
        subject: "Відновлення пароля - Warehouse Inventory API",
        text:
          `Ви (або хтось інший) запросили скидання пароля.\n\n` +
          `Посилання діє 15 хвилин і є одноразовим:\n${resetUrl}\n\n` +
          `Якщо це були не ви - просто проігноруйте цей лист.`,
      });
    } catch (error) {
      // Помилка пошти не має переривати відповідь і розкривати існування email
      console.error("Не вдалося надіслати лист для відновлення пароля:", error.message);
    }

    logAction(req, "auth.password_reset_requested", { entity: "user", entityId: user.id, details: { email } });
  }

  res.json({ message: "Якщо email зареєстровано, лист із посиланням для відновлення надіслано" });
});

// Скидання пароля за одноразовим токеном із листа
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = matchedData(req, { locations: ["body"] });

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError(400, "Посилання для відновлення недійсне або вже використане");
  }
  if (!record.user.isActive) throw new ApiError(403, "Обліковий запис деактивовано");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: await hashPassword(password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Після скидання пароля відкликаємо всі refresh-токени користувача (усі сесії)
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  logAction(req, "auth.password_reset", { entity: "user", entityId: record.userId });

  res.json({ message: "Пароль змінено. Увійдіть із новим паролем" });
});

// Крок 1 налаштування 2FA: генеруємо секрет і QR-код для застосунку-аутентифікатора
const setupTwoFactor = asyncHandler(async (req, res) => {
  const user = await userModel.findByIdWithPassword(req.user.id);
  if (user.twoFactorEnabled) {
    throw new ApiError(400, "Двофакторну автентифікацію вже увімкнено. Спочатку вимкніть її");
  }

  const secret = authenticator.generateSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });

  const otpauthUrl = authenticator.keyuri(user.email, ISSUER_NAME, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  res.json({
    message: "Відскануйте QR-код у застосунку-аутентифікаторі та підтвердіть кодом (POST /api/auth/2fa/enable)",
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  });
});

// Крок 2: підтвердження кодом з аутентифікатора - лише після цього 2FA вмикається
const enableTwoFactor = asyncHandler(async (req, res) => {
  const { code } = req.body ?? {};
  const user = await userModel.findByIdWithPassword(req.user.id);

  if (!user.twoFactorSecret) {
    throw new ApiError(400, "Спочатку виконайте налаштування (POST /api/auth/2fa/setup)");
  }
  if (user.twoFactorEnabled) {
    throw new ApiError(400, "Двофакторну автентифікацію вже увімкнено");
  }
  if (!authenticator.verify({ token: code, secret: user.twoFactorSecret })) {
    throw new ApiError(400, "Невірний код підтвердження");
  }

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  logAction(req, "auth.2fa_enabled", { entity: "user", entityId: user.id });

  res.json({ message: "Двофакторну автентифікацію увімкнено" });
});

const disableTwoFactor = asyncHandler(async (req, res) => {
  const { code } = req.body ?? {};
  const user = await userModel.findByIdWithPassword(req.user.id);

  if (!user.twoFactorEnabled) {
    throw new ApiError(400, "Двофакторну автентифікацію не увімкнено");
  }
  if (!authenticator.verify({ token: code, secret: user.twoFactorSecret })) {
    throw new ApiError(400, "Невірний код підтвердження");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  logAction(req, "auth.2fa_disabled", { entity: "user", entityId: user.id });

  res.json({ message: "Двофакторну автентифікацію вимкнено" });
});

export {
  register,
  login,
  verifyTwoFactor,
  refresh,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  issueTokens,
};
