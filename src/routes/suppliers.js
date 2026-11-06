import express from "express";
import { body } from "express-validator";
import ctrl from "../controllers/supplierController.js";
import { authenticate} from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import validate from "../middleware/validate.js";
import { idParam, maybe, paginationRules, searchRule } from "../utils/validators.js";

const router = express.Router();

const supplierRules = (isUpdate = false) => [
  maybe(
    body("name")
      .trim()
      .notEmpty().withMessage("name обов'язкове")
      .isLength({ max: 150 }).withMessage("name не довше за 150 символів"),
    isUpdate,
  ),
  body("email").optional().trim().isEmail().withMessage("Вкажіть коректний email").toLowerCase(),
  body("phone")
    .optional()
    .trim()
    .matches(/^\+?[0-9\s()-]{7,20}$/)
    .withMessage("Некоректний номер телефону"),
  body("address").optional().trim().isLength({ max: 255 }).withMessage("address не довше за 255 символів"),
];

router.use(authenticate);

/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     summary: Список постачальників
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200: { description: Список постачальників }
 *       400: { description: Помилка валідації параметрів }
 *       401: { description: Не авторизовано }
 */
router.get("/", [...paginationRules, searchRule], validate, ctrl.getAll);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   get:
 *     summary: Отримати постачальника за id
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }
 *     responses:
 *       200: { description: Постачальник }
 *       401: { description: Не авторизовано }
 *       404: { description: Постачальника не знайдено }
 */
router.get("/:id", idParam(), validate, ctrl.getById);

/**
 * @swagger
 * /api/suppliers:
 *   post:
 *     summary: Створити постачальника (ADMIN, MANAGER)
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, maxLength: 150 }
 *               email: { type: string, format: email }
 *               phone: { type: string, example: "+380 50 123 45 67" }
 *               address: { type: string, maxLength: 255 }
 *     responses:
 *       201: { description: Постачальника створено }
 *       400: { description: Помилка валідації даних }
 *       401: { description: Не авторизовано }
 *       403: { description: Недостатньо прав }
 */
router.post("/", authorize("ADMIN", "MANAGER"), supplierRules(), validate, ctrl.create);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   put:
 *     summary: Оновити постачальника (ADMIN, MANAGER)
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, maxLength: 150 }
 *               email: { type: string, format: email }
 *               phone: { type: string, example: "+380 50 123 45 67" }
 *               address: { type: string, maxLength: 255 }
 *     responses:
 *       200: { description: Постачальника оновлено }
 *       400: { description: Помилка валідації даних }
 *       401: { description: Не авторизовано }
 *       403: { description: Недостатньо прав }
 *       404: { description: Постачальника не знайдено }
 */
router.put("/:id", authorize("ADMIN", "MANAGER"), idParam(), supplierRules(true), validate, ctrl.update);

/**
 * @swagger
 * /api/suppliers/{id}:
 *   delete:
 *     summary: Видалити постачальника (ADMIN)
 *     tags: [Suppliers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }
 *     responses:
 *       204: { description: Постачальника видалено }
 *       401: { description: Не авторизовано }
 *       403: { description: Недостатньо прав }
 *       404: { description: Постачальника не знайдено }
 */
router.delete("/:id", authorize("ADMIN"), idParam(), validate, ctrl.remove);

export default router;
