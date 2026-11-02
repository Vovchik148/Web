import { createHash } from "node:crypto";
import { matchedData } from "express-validator";
import { prisma } from "../db.js";
import userModel from "../models/user.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

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
    throw new ApiError(401, "Невірний email або пароль");
  }
  if (!user.isActive) throw new ApiError(403, "Обліковий запис деактивовано");

  const { password: _hash, ...safeUser } = user;
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
  res.json({ message: "Пароль змінено" });
});

export {
  register,
  login,
  refresh,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  issueTokens,
};
