import express from "express";
import { body, query } from "express-validator";
import * as ctrl from "../controllers/productController.js";
import { authenticate} from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import validate from "../middleware/validate.js";
import { idParam, maybe, paginationRules, searchRule } from "../utils/validators.js";

const router = express.Router();

const productRules = (isUpdate = false) => [
  maybe(
    body("sku")
      .trim()
      .toUpperCase()
      .matches(/^[A-Z0-9-]{3,30}$/)
      .withMessage("sku: 3-30 символів (латинські літери, цифри, дефіс)"),
    isUpdate,
  ),
  maybe(
    body("name")
      .trim()
      .notEmpty().withMessage("name обов'язкове")
      .isLength({ max: 150 }).withMessage("name не довше за 150 символів"),
    isUpdate,
  ),
  body("description").optional().trim().isLength({ max: 1000 }).withMessage("description не довше за 1000 символів"),
  body("unit").optional().trim().isLength({ min: 1, max: 20 }).withMessage("unit: 1-20 символів"),
  maybe(
    body("price").isFloat({ min: 0, max: 99999999 }).withMessage("price має бути числом >= 0").toFloat(),
    isUpdate,
  ),
  body("minStock").optional().isInt({ min: 0, max: 1000000 }).withMessage("minStock має бути цілим числом >= 0").toInt(),
  body("isActive").optional().isBoolean().withMessage("isActive має бути true/false").toBoolean(),
  maybe(body("categoryId").isInt({ gt: 0 }).withMessage("categoryId має бути додатним цілим числом").toInt(), isUpdate),
  body("supplierId").optional().isInt({ gt: 0 }).withMessage("supplierId має бути додатним цілим числом").toInt(),
];

const listRules = [
  ...paginationRules,
  searchRule,
  query("categoryId").optional().isInt({ gt: 0 }).withMessage("categoryId має бути додатним цілим числом").toInt(),
  query("supplierId").optional().isInt({ gt: 0 }).withMessage("supplierId має бути додатним цілим числом").toInt(),
  query("isActive").optional().isBoolean().withMessage("isActive має бути true/false").toBoolean(),
  query("sortBy").optional().isIn(["name", "sku", "price", "createdAt"]).withMessage("sortBy: name, sku, price або createdAt"),
  query("order").optional().isIn(["asc", "desc"]).withMessage("order: asc або desc"),
];

router.use(authenticate);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Список товарів
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: categoryId, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: supplierId, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: isActive, schema: { type: boolean } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [name, sku, price, createdAt] } }
 *       - { in: query, name: order, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200: { description: Список товарів }
 *       400: { description: Помилка валідації параметрів }
 *       401: { description: Не авторизовано }
 */
router.get("/", listRules, validate, ctrl.getAll);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Отримати товар за id
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }
 *     responses:
 *       200: { description: Товар }
 *       401: { description: Не авторизовано }
 *       404: { description: Товар не знайдено }
 */
router.get("/:id", idParam(), validate, ctrl.getById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Створити товар (ADMIN, MANAGER)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sku, name, price, categoryId]
 *             properties:
 *               sku: { type: string, pattern: "^[A-Z0-9-]{3,30}$", example: LAP-001 }
 *               name: { type: string, maxLength: 150 }
 *               description: { type: string, maxLength: 1000 }
 *               unit: { type: string, minLength: 1, maxLength: 20, example: шт }
 *               price: { type: number, minimum: 0 }
 *               minStock: { type: integer, minimum: 0 }
 *               isActive: { type: boolean }
 *               categoryId: { type: integer, minimum: 1 }
 *               supplierId: { type: integer, minimum: 1 }
 *     responses:
 *       201: { description: Товар створено }
 *       400: { description: Помилка валідації даних }
 *       401: { description: Не авторизовано }
 *       403: { description: Недостатньо прав }
 *       409: { description: Товар із таким sku вже існує }
 */
router.post("/", authorize("ADMIN", "MANAGER"), productRules(), validate, ctrl.create);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Оновити товар (ADMIN, MANAGER)
 *     tags: [Products]
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
 *               sku: { type: string, pattern: "^[A-Z0-9-]{3,30}$" }
 *               name: { type: string, maxLength: 150 }
 *               description: { type: string, maxLength: 1000 }
 *               unit: { type: string, minLength: 1, maxLength: 20 }
 *               price: { type: number, minimum: 0 }
 *               minStock: { type: integer, minimum: 0 }
 *               isActive: { type: boolean }
 *               categoryId: { type: integer, minimum: 1 }
 *               supplierId: { type: integer, minimum: 1 }
 *     responses:
 *       200: { description: Товар оновлено }
 *       400: { description: Помилка валідації даних }
 *       401: { description: Не авторизовано }
 *       403: { description: Недостатньо прав }
 *       404: { description: Товар не знайдено }
 */
router.put("/:id", authorize("ADMIN", "MANAGER"), idParam(), productRules(true), validate, ctrl.update);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Видалити товар (ADMIN)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }
 *     responses:
 *       204: { description: Товар видалено }
 *       401: { description: Не авторизовано }
 *       403: { description: Недостатньо прав }
 *       404: { description: Товар не знайдено }
 */
router.delete("/:id", authorize("ADMIN"), idParam(), validate, ctrl.remove);

export default router;
