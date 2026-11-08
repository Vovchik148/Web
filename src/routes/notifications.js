import express from "express";
import { param, query } from "express-validator";
import * as ctrl from "../controllers/notificationController.js";
import { authenticate } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { paginationRules } from "../utils/validators.js";

const intId = param("id").isInt({ gt: 0 }).withMessage("id має бути додатним цілим числом").toInt();

const router = express.Router();

router.use(authenticate); // сповіщення доступні лише власнику - окремих дозволів адміністратора немає

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Сповіщення поточного користувача
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: unread, schema: { type: boolean }, description: "true - лише непрочитані" }
 *       - { in: query, name: type, schema: { type: string, enum: [LOW_STOCK, MOVEMENT, SYSTEM, PRODUCT] } }
 *       - { in: query, name: priority, schema: { type: string, enum: [LOW, NORMAL, HIGH, CRITICAL] } }
 *     responses:
 *       200: { description: Список сповіщень з лічильником непрочитаних }
 *       401: { description: Не авторизовано }
 */
router.get(
  "/",
  [
    ...paginationRules,
    query("unread").optional().isBoolean().withMessage("unread має бути true або false").toBoolean(),
    query("type").optional().isIn(["LOW_STOCK", "MOVEMENT", "SYSTEM", "PRODUCT"]),
    query("priority").optional().isIn(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  ],
  validate,
  ctrl.getAll,
);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Кількість непрочитаних сповіщень
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: "{ unreadCount: number }" }
 *       401: { description: Не авторизовано }
 */
router.get("/unread-count", ctrl.getUnreadCount);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Позначити всі сповіщення прочитаними
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: "{ updated: number }" }
 *       401: { description: Не авторизовано }
 */
router.patch("/read-all", ctrl.markAllRead);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Позначити сповіщення прочитаним
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Оновлене сповіщення }
 *       404: { description: Сповіщення не знайдено або воно чужe }
 */
router.patch("/:id/read", intId, validate, ctrl.markRead);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Видалити сповіщення
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Видалено }
 *       404: { description: Сповіщення не знайдено або воно чужe }
 */
router.delete("/:id", intId, validate, ctrl.remove);

export default router;
