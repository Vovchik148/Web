import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../db.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { logAction } from "../utils/audit.js";

const parseId = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Некоректний ID файлу");
  return id;
};

const canModify = (file, user) => file.uploadedBy === user.id || user.role === "ADMIN";

export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Файл не надано");
  }

  try {
    const file = await prisma.file.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadedBy: req.user.id,
      },
    });

    res.status(201).json({ message: "Файл успішно завантажено", file });
    logAction(req, "file.upload", { entity: "file", entityId: file.id, details: { filename: file.originalName } });
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    throw error;
  }
});

// Багатофайлове завантаження (POST /api/files/upload-multiple)
export const uploadFiles = asyncHandler(async (req, res) => {
  if (!req.files?.length) {
    throw new ApiError(400, "Файли не надано");
  }

  const created = [];
  try {
    for (const file of req.files) {
      created.push(
        await prisma.file.create({
          data: {
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            uploadedBy: req.user.id,
          },
        }),
      );
    }

    res.status(201).json({ message: `Завантажено файлів: ${created.length}`, files: created });
    logAction(req, "file.upload_many", {
      entity: "file",
      details: { count: created.length, filenames: created.map((f) => f.originalName) },
    });
  } catch (error) {
    // Помилка БД: видаляємо всі вже збережені файли, щоб не лишити «осиротілі» записи
    await Promise.all(created.map((f) => prisma.file.delete({ where: { id: f.id } }).catch(() => {})));
    await Promise.all(req.files.map((f) => fs.unlink(f.path).catch(() => {})));
    throw error;
  }
});

export const getFile = asyncHandler(async (req, res) => {
  const file = await prisma.file.findUnique({ where: { id: parseId(req) } });

  if (!file) {
    throw new ApiError(404, "Файл не знайдено");
  }

  // dotfiles: "allow" - шлях береться з БД (не з URL користувача), а проєкт
  // може бути розгорнутий у прихованій теці (наприклад .zcode\workspace), яку
  // send за замовчуванням блокує
  res.sendFile(path.resolve(file.path), { dotfiles: "allow" });
});

export const updateFile = asyncHandler(async (req, res) => {
  let saved = false;

  try {
    if (!req.file) {
      throw new ApiError(400, "Файл не надано");
    }

    const file = await prisma.file.findUnique({ where: { id: parseId(req) } });

    if (!file) {
      throw new ApiError(404, "Файл не знайдено");
    }

    if (!canModify(file, req.user)) {
      throw new ApiError(403, "Ви не маєте прав для оновлення цього файлу");
    }

    const updated = await prisma.file.update({
      where: { id: file.id },
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
      },
    });
    saved = true;

    await fs.unlink(file.path).catch(() => {});

    res.json({ message: "Файл успішно оновлено", file: updated });
  } catch (error) {
    if (req.file && !saved) await fs.unlink(req.file.path).catch(() => {});
    throw error;
  }
});

export const deleteFile = asyncHandler(async (req, res) => {
  const file = await prisma.file.findUnique({ where: { id: parseId(req) } });

  if (!file) {
    throw new ApiError(404, "Файл не знайдено");
  }

  if (!canModify(file, req.user)) {
    throw new ApiError(403, "Ви не маєте прав для видалення цього файлу");
  }

  await prisma.file.delete({ where: { id: file.id } });
  await fs.unlink(file.path).catch(() => {});

  logAction(req, "file.delete", { entity: "file", entityId: file.id, details: { filename: file.originalName } });

  res.json({ message: "Файл успішно видалено" });
});
