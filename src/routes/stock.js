import express from "express";
import { query } from "express-validator";
import * as ctrl from "../controllers/stockController.js";
import { authenticate } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { paginationRules } from "../utils/validators.js";

const router = express.Router();

const intQuery = (name) =>
  query(name).optional().isInt({ gt: 0 }).withMessage(`${name} має бути додатним цілим числом`).toInt();

router.use(authenticate);

/**
 * @swagger
 * /api/stock:
 *   get:
 *     summary: Залишки товарів на складах
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: productId, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: warehouseId, schema: { type: integer, minimum: 1 } }
 *     responses:
 *       200: { description: Список залишків }
 *       400: { description: Помилка валідації параметрів }
 *       401: { description: Не авторизовано }
 */
router.get("/", [...paginationRules, intQuery("productId"), intQuery("warehouseId")], validate, ctrl.getStocks);

// Важливо: /low оголошений до можливих параметричних маршрутів

/**
 * @swagger
 * /api/stock/low:
 *   get:
 *     summary: Товари із залишком нижче мінімального
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Список товарів з низьким залишком }
 *       401: { description: Не авторизовано }
 */
router.get("/low", ctrl.getLowStock);

export default router;
