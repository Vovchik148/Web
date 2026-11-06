import express from "express";
import { body } from "express-validator";
import ctrl from "../controllers/categoryController.js";
import { authenticate} from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import validate from "../middleware/validate.js";
import { idParam, maybe, paginationRules, searchRule } from "../utils/validators.js";

const router = express.Router();

const categoryRules = (isUpdate = false) => [
  maybe(
    body("name")
      .trim()
      .notEmpty().withMessage("name обов'язкове")
      .isLength({ max: 100 }).withMessage("name не довше за 100 символів"),
    isUpdate,
  ),
  body("description").optional().trim().isLength({ max: 500 }).withMessage("description не довше за 500 символів"),
];

router.use(authenticate);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Список категорій
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200: { description: Список категорій }
 *       400: { description: Помилка валідації параметрів }
 *       401: { description: Не авторизовано }
 */
router.get("/", [...paginationRules, searchRule], validate, ctrl.getAll);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Отримати категорію за id
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }
 *     responses:
 *       200: { description: Категорія }
 *       401: { description: Не авторизовано }
 *       404: { description: Категорію не знайдено }
 */
router.get("/:id", idParam(), validate, ctrl.getById);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Створити категорію (ADMIN, MANAGER)
 *     tags: [Categories]
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
 *               name: { type: string, maxLength: 100 }
 *               description: { type: string, maxLength: 500 }
 *     responses:
 *       201: { description: Категорію створено }
 *       400: { description: Помилка валідації даних }
 *       401: { description: Не авторизовано }
 *       403: { description: Недостатньо прав }
 */
router.post("/", authorize("ADMIN", "MANAGER"), categoryRules(), validate, ctrl.create);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Оновити категорію (ADMIN, MANAGER)
 *     tags: [Categories]
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
 *               description: { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: Категорію оновлено }
 *       400: { description: Помилка валідації даних }
 *       401: { description: Не авторизовано }
 *       403: { description: Недостатньо прав }
 *       404: { description: Категорію не знайдено }
 */
router.put("/:id", authorize("ADMIN", "MANAGER"), idParam(), categoryRules(true), validate, ctrl.update);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Видалити категорію (ADMIN)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }
 *     responses:
 *       204: { description: Категорію видалено }
 *       401: { description: Не авторизовано }
 *       403: { description: Недостатньо прав }
 *       404: { description: Категорію не знайдено }
 */
router.delete("/:id", authorize("ADMIN"), idParam(), validate, ctrl.remove);

export default router;
