import express from "express";
import { body } from "express-validator";
import * as ctrl from "../controllers/authController.js";
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

export default router;
