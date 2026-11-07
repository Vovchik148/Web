import { Router } from "express";
import { uploadFile, uploadFiles, getFile, updateFile, deleteFile } from "../controllers/fileController.js";
import { authenticate } from "../middleware/auth.js";
import { upload, uploadMany } from "../middleware/upload.js";

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
 * /api/files/upload-multiple:
 *   post:
 *     summary: Завантаження кількох файлів (до 10)
 *     description: >
 *       Поле форми files може містити кілька файлів. Якщо під час запису
 *       в базу даних сталася помилка - усі вже збережені файли видаляються
 *       (файли та записи не «осиротівають»).
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
 *               files:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201: { description: Файли успішно завантажено }
 *       400: { description: Файли не надано або невалідні }
 *       401: { description: Необхідна аутентифікація }
 */
router.post("/upload-multiple", authenticate, uploadMany.array("files", 10), uploadFiles);

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
