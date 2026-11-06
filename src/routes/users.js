import express from "express";
import { body, query } from "express-validator";
import * as ctrl from "../controllers/userController.js";
import { authenticate} from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import validate from "../middleware/validate.js";
import { idParam, paginationRules, searchRule } from "../utils/validators.js";

const router = express.Router();

router.use(authenticate, authorize("ADMIN"));

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Список користувачів (ADMIN)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: role, schema: { type: string, enum: [ADMIN, MANAGER, WORKER] } }
 *     responses:
 *       200: { description: Список користувачів }
 *       400: { description: Помилка валідації параметрів }
 *       401: { description: Не авторизовано }
 *       403: { description: Недостатньо прав }
 */
router.get(
  "/",
  [...paginationRules, searchRule, query("role").optional().isIn(["ADMIN", "MANAGER", "WORKER"]).withMessage("role: ADMIN, MANAGER або WORKER")],
  validate,
  ctrl.getAll,
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Змінити роль або активність користувача (ADMIN)
 *     tags: [Users]
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
 *               role: { type: string, enum: [ADMIN, MANAGER, WORKER] }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Користувача оновлено }
 *       400: { description: Помилка валідації даних }
 *       401: { description: Не авторизовано }
 *       403: { description: Недостатньо прав }
 *       404: { description: Користувача не знайдено }
 */
router.put(
  "/:id",
  [
    idParam(),
    body("role").optional().isIn(["ADMIN", "MANAGER", "WORKER"]).withMessage("role: ADMIN, MANAGER або WORKER"),
    body("isActive").optional().isBoolean().withMessage("isActive має бути true/false").toBoolean(),
  ],
  validate,
  ctrl.update,
);

export default router;
