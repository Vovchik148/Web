import { Router } from "express";
import { uploadFile, getFile, updateFile, deleteFile } from "../controllers/fileController.js";
import { authenticate } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: Завантаження файлу
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201: { description: Файл успішно завантажено }
 *       400: { description: Файл не надано або невалідний }
 *       401: { description: Необхідна аутентифікація }
 */
router.post("/upload", authenticate, upload.single("file"), uploadFile);

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     summary: Отримання файлу за ID
 *     tags: [Files]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Файл успішно отримано }
 *       404: { description: Файл не знайдено }
 */
router.get("/:id", getFile);

/**
 * @swagger
 * /api/files/{id}:
 *   put:
 *     summary: Оновлення (заміна) файлу
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200: { description: Файл успішно оновлено }
 *       400: { description: Файл не надано або невалідний }
 *       401: { description: Необхідна аутентифікація }
 *       403: { description: Недостатньо прав }
 *       404: { description: Файл не знайдено }
 */
router.put("/:id", authenticate, upload.single("file"), updateFile);

/**
 * @swagger
 * /api/files/{id}:
 *   delete:
 *     summary: Видалення файлу
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Файл успішно видалено }
 *       403: { description: Недостатньо прав }
 *       404: { description: Файл не знайдено }
 */
router.delete("/:id", authenticate, deleteFile);

export default router;
