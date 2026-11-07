import express from "express";
import { query } from "express-validator";
import * as ctrl from "../controllers/auditController.js";
import { authenticate } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { PERMISSIONS } from "../config/permissions.js";
import validate from "../middleware/validate.js";
import { paginationRules } from "../utils/validators.js";

const router = express.Router();

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Журнал дій користувачів (лише ADMIN)
 *     description: >
 *       Аудит усіх значущих дій у системі: вхід/реєстрація, зміна пароля,
 *       CRUD товарів, завантаження/видалення файлів, 2FA тощо.
 *       Підтримує пагінацію та фільтри.
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: userId, schema: { type: integer, minimum: 1 }, description: Дії конкретного користувача }
 *       - { in: query, name: action, schema: { type: string }, description: Пошук за назвою дії (наприклад auth.login) }
 *       - { in: query, name: entity, schema: { type: string }, description: Назва сутності (user, product, file) }
 *       - { in: query, name: entityId, schema: { type: string }, description: Ідентифікатор сутності }
 *       - { in: query, name: from, schema: { type: string, format: date-time }, description: Дії з цієї дати (ISO 8601) }
 *       - { in: query, name: to, schema: { type: string, format: date-time }, description: Дії до цієї дати (ISO 8601) }
 *     responses:
 *       200:
 *         description: Список записів журналу
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/AuditLog' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       400: { description: Помилка валідації параметрів }
 *       401: { description: Не авторизовано }
 *       403: { description: Недостатньо прав (лише ADMIN) }
 */
router.get(
  "/",
  authenticate,
  requirePermission(PERMISSIONS.AUDIT_READ),
  [
    ...paginationRules,
    query("userId").optional().isInt({ gt: 0 }).withMessage("userId має бути додатним цілим числом").toInt(),
    query("action").optional().trim().isLength({ max: 100 }).withMessage("action не довше за 100 символів"),
    query("entity").optional().trim().isLength({ max: 50 }).withMessage("entity не довше за 50 символів"),
    query("entityId").optional().trim().isLength({ max: 50 }).withMessage("entityId не довше за 50 символів"),
    query("from").optional().isISO8601().withMessage("from має бути датою у форматі ISO 8601").toDate(),
    query("to").optional().isISO8601().withMessage("to має бути датою у форматі ISO 8601").toDate(),
  ],
  validate,
  ctrl.getAll,
);

export default router;
