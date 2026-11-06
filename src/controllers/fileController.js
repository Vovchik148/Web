import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../db.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

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
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    throw error;
  }
});

export const getFile = asyncHandler(async (req, res) => {
  const file = await prisma.file.findUnique({ where: { id: parseId(req) } });

  if (!file) {
    throw new ApiError(404, "Файл не знайдено");
  }

  res.sendFile(path.resolve(file.path));
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

  res.json({ message: "Файл успішно видалено" });
});
