import express from "express";
import { body } from "express-validator";
import ctrl from "../controllers/warehouseController.js";
import { authenticate} from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import validate from "../middleware/validate.js";
import { idParam, maybe, paginationRules, searchRule } from "../utils/validators.js";

const router = express.Router();

const warehouseRules = (isUpdate = false) => [
  maybe(
    body("name")
      .trim()
      .notEmpty().withMessage("name обов'язкове")
      .isLength({ max: 100 }).withMessage("name не довше за 100 символів"),
    isUpdate,
  ),
  maybe(
    body("location")
      .trim()
      .notEmpty().withMessage("location обов'язкове")
      .isLength({ max: 255 }).withMessage("location не довше за 255 символів"),
    isUpdate,
  ),
  body("capacity").optional().isInt({ min: 1, max: 100000000 }).withMessage("capacity має бути додатним цілим числом").toInt(),
];

router.use(authenticate);

/**
 * @swagger
 * /api/warehouses:
 *   get:
 *     summary: Список складів
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200: { description: Список складів }
 *       400: { description: Помилка валідації параметрів }
 *       401: { description: Не авторизовано }
 */
router.get("/", [...paginationRules, searchRule], validate, ctrl.getAll);

/**
 * @swagger
 * /api/warehouses/{id}:
 *   get:
 *     summary: Отримати склад за id
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }
 *     responses:
 *       200: { description: Склад }
 *       401: { description: Не авторизовано }
 *       404: { description: Склад не знайдено }
 */
router.get("/:id", idParam(), validate, ctrl.getById);

/**
 * @swagger
 * /api/warehouses:
 *   post:
 *     summary: Створити склад (ADMIN, MANAGER)
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, location]
 *             properties:
 *               name: { type: string, maxLength: 100 }
 *               location: { type: string, maxLength: 255 }
 *               capacity: { type: integer, minimum: 1, maximum: 100000000 }
 *     responses:
 *       201: { description: Склад створено }
 *       400: { description: Помилка валідації даних }
 *       401: { description: Не авторизовано }
 *       403: { description: Недостатньо прав }
 */
router.post("/", authorize("ADMIN", "MANAGER"), warehouseRules(), validate, ctrl.create);

/**
 * @swagger
 * /api/warehouses/{id}:
 *   put:
 *     summary: Оновити склад (ADMIN, MANAGER)
 *     tags: [Warehouses]
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
 *               name: { type: string, maxLength: 100 }
 *               location: { type: string, maxLength: 255 }
 *               capacity: { type: integer, minimum: 1, maximum: 100000000 }
 *     responses:
 *       200: { description: Склад оновлено }
 *       400: { description: Помилка валідації даних }
 *       401: { description: Не авторизовано }
 *       403: { description: Недостатньо прав }
 *       404: { description: Склад не знайдено }
 */
router.put("/:id", authorize("ADMIN", "MANAGER"), idParam(), warehouseRules(true), validate, ctrl.update);

/**
 * @swagger
 * /api/warehouses/{id}:
 *   delete:
 *     summary: Видалити склад (ADMIN)
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }
 *     responses:
 *       204: { description: Склад видалено }
 *       401: { description: Не авторизовано }
 *       403: { description: Недостатньо прав }
 *       404: { description: Склад не знайдено }
 */
router.delete("/:id", authorize("ADMIN"), idParam(), validate, ctrl.remove);

export default router;
