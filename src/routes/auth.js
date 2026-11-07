import express from "express";
import { body } from "express-validator";
import * as ctrl from "../controllers/authController.js";
import * as oauth from "../controllers/oauthController.js";
import { authenticate } from "../middleware/auth.js";
import validate from "../middleware/validate.js";

const router = express.Router();

const passwordRule = (field) =>
  body(field)
    .isLength({ min: 8, max: 72 })
    .withMessage("Пароль має містити від 8 до 72 символів")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Пароль має містити малу літеру, велику літеру та цифру");

const nameRule = (field, isUpdate) => {
  const chain = body(field)
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(`${field} має містити від 2 до 50 символів`);
  return isUpdate ? chain.optional() : chain;
};

const emailRule = body("email").trim().isEmail().withMessage("Вкажіть коректний email").toLowerCase();

const registerRules = [emailRule, passwordRule("password"), nameRule("firstName"), nameRule("lastName")];
const loginRules = [emailRule, body("password").notEmpty().withMessage("Пароль обов'язковий")];
const profileRules = [nameRule("firstName", true), nameRule("lastName", true)];
const changePasswordRules = [
  body("currentPassword").notEmpty().withMessage("Поточний пароль обов'язковий"),
  passwordRule("newPassword"),
];
const forgotPasswordRules = [emailRule];
const resetPasswordRules = [
  body("token").trim().notEmpty().withMessage("Токен відновлення обов'язковий"),
  passwordRule("password"),
];
const twoFactorVerifyRules = [
  body("tempToken").trim().notEmpty().withMessage("Тимчасовий токен обов'язковий"),
  body("code").trim().isLength({ min: 6, max: 8 }).withMessage("Код має містити 6 цифр"),
];
const twoFactorCodeRules = [
  body("code").trim().isLength({ min: 6, max: 8 }).withMessage("Код має містити 6 цифр"),
];

// Публічні

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Реєстрація нового користувача
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8, maxLength: 72, description: Мала й велика літера та цифра }
 *               firstName: { type: string, minLength: 2, maxLength: 50 }
 *               lastName: { type: string, minLength: 2, maxLength: 50 }
 *     responses:
 *       201: { description: Користувач успішно зареєстрований }
 *       400: { description: Помилка валідації даних }
 *       409: { description: Користувач вже існує }
 */
router.post("/register", registerRules, validate, ctrl.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вхід користувача
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Успішний вхід }
 *       400: { description: Помилка валідації даних }
 *       401: { description: Невірні дані для входу }
 */
router.post("/login", loginRules, validate, ctrl.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Оновлення пари токенів (ротація refresh токена)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Токени успішно оновлено }
 *       401: { description: Недійсний або відкликаний refresh токен }
 */
router.post("/refresh", ctrl.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Вихід (відкликання refresh токена)
 *     tags: [Authentication]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       204: { description: Токен відкликано }
 */
router.post("/logout", ctrl.logout);

// Потребують авторизації

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Отримати профіль поточного користувача
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Профіль користувача }
 *       401: { description: Не авторизовано }
 */
router.get("/profile", authenticate, ctrl.getProfile);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Оновити профіль поточного користувача
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string, minLength: 2, maxLength: 50 }
 *               lastName: { type: string, minLength: 2, maxLength: 50 }
 *     responses:
 *       200: { description: Профіль оновлено }
 *       400: { description: Помилка валідації даних }
 *       401: { description: Не авторизовано }
 */
router.put("/profile", authenticate, profileRules, validate, ctrl.updateProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Змінити пароль поточного користувача
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8, maxLength: 72, description: Мала й велика літера та цифра }
 *     responses:
 *       200: { description: Пароль змінено }
 *       400: { description: Помилка валідації даних }
 *       401: { description: Не авторизовано або невірний поточний пароль }
 */
router.put("/change-password", authenticate, changePasswordRules, validate, ctrl.changePassword);

// --- Відновлення пароля ---

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Запит на відновлення пароля
 *     description: >
 *       Завжди повертає 200, щоб з відповіді не можна було дізнатися,
 *       чи існує email у системі. Якщо email зареєстровано, надсилається лист
 *       з одноразовим посиланням (діє 15 хвилин). Для розробки використовується
 *       тестова скринька Ethereal - прев'ю листа з'являється в консолі сервера.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Відповідь однакова незалежно від існування email }
 *       400: { description: Помилка валідації даних }
 *       429: { description: Забагато запитів (ліміт /api/auth) }
 */
router.post("/forgot-password", forgotPasswordRules, validate, ctrl.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Скидання пароля за одноразовим токеном
 *     description: >
 *       Після успішного скидання відкликаються всі refresh-токени користувача,
 *       тобто всі активні сесії.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string, description: Одноразовий токен з листа }
 *               password: { type: string, minLength: 8, maxLength: 72, description: Новий пароль }
 *     responses:
 *       200: { description: Пароль змінено }
 *       400: { description: Некоректні дані або токен недійсний/використаний/протух }
 *       403: { description: Обліковий запис деактивовано }
 */
router.post("/reset-password", resetPasswordRules, validate, ctrl.resetPassword);

// --- Двофакторна автентифікація (TOTP) ---

/**
 * @swagger
 * /api/auth/2fa/setup:
 *   post:
 *     summary: Крок 1 увімкнення 2FA - отримати секрет і QR-код
 *     tags: [TwoFactor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Секрет, otpauth-URL та QR-код (data URL) для застосунку-аутентифікатора }
 *       400: { description: 2FA вже увімкнено }
 *       401: { description: Не авторизовано }
 */
router.post("/2fa/setup", authenticate, ctrl.setupTwoFactor);

/**
 * @swagger
 * /api/auth/2fa/enable:
 *   post:
 *     summary: Крок 2 увімкнення 2FA - підтвердити код з аутентифікатора
 *     tags: [TwoFactor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200: { description: 2FA увімкнено }
 *       400: { description: Невірний код або 2FA не налаштовано / вже увімкнено }
 *       401: { description: Не авторизовано }
 */
router.post("/2fa/enable", authenticate, twoFactorCodeRules, validate, ctrl.enableTwoFactor);

/**
 * @swagger
 * /api/auth/2fa/disable:
 *   post:
 *     summary: Вимкнути 2FA (потребує кода з аутентифікатора)
 *     tags: [TwoFactor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200: { description: 2FA вимкнено }
 *       400: { description: Невірний код або 2FA не увімкнено }
 *       401: { description: Не авторизовано }
 */
router.post("/2fa/disable", authenticate, twoFactorCodeRules, validate, ctrl.disableTwoFactor);

/**
 * @swagger
 * /api/auth/2fa/verify:
 *   post:
 *     summary: Другий крок входу - перевірка кода 2FA
 *     description: >
 *       Викликається після login, який повернув twoFactorRequired: true і tempToken.
 *       У разі успіху повертає повну пару токенів.
 *     tags: [TwoFactor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tempToken, code]
 *             properties:
 *               tempToken: { type: string, description: Тимчасовий токен із відповіді login }
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200: { description: Вхід виконано, повернуто повну пару токенів }
 *       400: { description: Помилка валідації даних }
 *       401: { description: Недійсний тимчасовий токен або невірний код }
 */
router.post("/2fa/verify", twoFactorVerifyRules, validate, ctrl.verifyTwoFactor);

// --- OAuth (GitHub, Authorization Code без passport) ---

/**
 * @swagger
 * /api/auth/github:
 *   get:
 *     summary: Вхід через GitHub - перенаправлення на сторінку авторизації
 *     description: >
 *       Потребує GITHUB_CLIENT_ID і GITHUB_CLIENT_SECRET у .env
 *       (OAuth App: https://github.com/settings/developers, callback URL -
 *       http://localhost:3000/api/auth/github/callback).
 *     tags: [Authentication]
 *     responses:
 *       302: { description: Перенаправлення на GitHub }
 *       500: { description: OAuth не налаштовано }
 */
router.get("/github", oauth.githubLogin);

/**
 * @swagger
 * /api/auth/github/callback:
 *   get:
 *     summary: Callback GitHub - обмін кода на токени та вхід
 *     description: >
 *       Не викликається вручну: сюди GitHub повертає користувача з code і state.
 *       У кінці видається пара JWT і виконується редирект на фронтенд
 *       (FRONTEND_URL)/oauth/callback?accessToken=...&refreshToken=...
 *     tags: [Authentication]
 *     parameters:
 *       - { in: query, name: code, schema: { type: string } }
 *       - { in: query, name: state, schema: { type: string } }
 *     responses:
 *       302: { description: Редирект на фронтенд із токенами або з ?error=... }
 *       401: { description: Недійсний стан (state) }
 */
router.get("/github/callback", oauth.githubCallback);

export default router;
