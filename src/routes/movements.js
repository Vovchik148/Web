import express from "express";
import { body, query } from "express-validator";
import * as ctrl from "../controllers/stockController.js";
import { authenticate } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { idParam, paginationRules } from "../utils/validators.js";

const router = express.Router();

const TYPES = ["INBOUND", "OUTBOUND", "ADJUSTMENT"];
const intQuery = (name) =>
  query(name).optional().isInt({ gt: 0 }).withMessage(`${name} має бути додатним цілим числом`).toInt();

const listRules = [
  ...paginationRules,
  intQuery("productId"),
  intQuery("warehouseId"),
  intQuery("userId"),
  query("type").optional().isIn(TYPES).withMessage(`type: ${TYPES.join(", ")}`),
  query("from").optional().isISO8601().withMessage("from має бути датою у форматі ISO 8601"),
  query("to").optional().isISO8601().withMessage("to має бути датою у форматі ISO 8601"),
];

const createRules = [
  body("type").isIn(TYPES).withMessage(`type: ${TYPES.join(", ")}`),
  body("productId").isInt({ gt: 0 }).withMessage("productId має бути додатним цілим числом").toInt(),
  body("warehouseId").isInt({ gt: 0 }).withMessage("warehouseId має бути додатним цілим числом").toInt(),
  body("quantity")
    .isInt({ min: -1000000, max: 1000000 })
    .withMessage("quantity має бути цілим числом (до 1 000 000 за модулем)")
    .toInt()
    .custom((value, { req }) => {
      if (req.body.type === "ADJUSTMENT") {
        if (value === 0) throw new Error("Для ADJUSTMENT quantity не може бути 0 (використовуйте + або -)");
      } else if (value < 1) {
        throw new Error("Для INBOUND/OUTBOUND quantity має бути >= 1");
      }
      return true;
    }),
  body("note").optional().trim().isLength({ max: 255 }).withMessage("note не довша за 255 символів"),
];

// Журнал руху незмінний (аудит): доступні лише читання та створення нових записів.
// Помилкову операцію виправляють новою операцією ADJUSTMENT.
router.use(authenticate);

/**
 * @swagger
 * /api/movements:
 *   get:
 *     summary: Журнал руху товарів
 *     tags: [Movements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: productId, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: warehouseId, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: userId, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: type, schema: { type: string, enum: [INBOUND, OUTBOUND, ADJUSTMENT] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *     responses:
 *       200: { description: Список операцій }
 *       400: { description: Помилка валідації параметрів }
 *       401: { description: Не авторизовано }
 */
router.get("/", listRules, validate, ctrl.getMovements);

/**
 * @swagger
 * /api/movements/{id}:
 *   get:
 *     summary: Отримати операцію за id
 *     tags: [Movements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } }
 *     responses:
 *       200: { description: Операція }
 *       401: { description: Не авторизовано }
 *       404: { description: Операцію не знайдено }
 */
router.get("/:id", idParam(), validate, ctrl.getMovementById);

/**
 * @swagger
 * /api/movements:
 *   post:
 *     summary: Створити операцію руху товару (запис незмінний)
 *     description: INBOUND/OUTBOUND — quantity >= 1; ADJUSTMENT — ненульове значення зі знаком + або -.
 *     tags: [Movements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, productId, warehouseId, quantity]
 *             properties:
 *               type: { type: string, enum: [INBOUND, OUTBOUND, ADJUSTMENT] }
 *               productId: { type: integer, minimum: 1 }
 *               warehouseId: { type: integer, minimum: 1 }
 *               quantity: { type: integer, minimum: -1000000, maximum: 1000000 }
 *               note: { type: string, maxLength: 255 }
 *     responses:
 *       201: { description: Операцію створено }
 *       400: { description: Помилка валідації даних або недостатньо товару на складі }
 *       401: { description: Не авторизовано }
 *       404: { description: Товар або склад не знайдено }
 */
router.post("/", createRules, validate, ctrl.createMovement);

export default router;
