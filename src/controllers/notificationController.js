import { matchedData } from "express-validator";
import { prisma } from "../db.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { parsePagination, buildPagination } from "../utils/pagination.js";
import { serialize } from "../services/notificationService.js";

// GET /api/notifications - сповіщення поточного користувача (з пагінацією та фільтрами)
const getAll = asyncHandler(async (req, res) => {
  const { unread, type, priority } = matchedData(req, { locations: ["query"] });
  const { page, limit, skip } = parsePagination(req.query);

  const where = { userId: req.user.id };
  if (unread !== undefined) where.readAt = unread ? null : { not: null };
  if (type) where.type = type;
  if (priority) where.priority = priority;

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
  ]);

  res.json({ data: data.map(serialize), unreadCount, pagination: buildPagination(page, limit, total) });
});

// GET /api/notifications/unread-count - лічильник непрочитаних (для значка в UI)
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user.id, readAt: null },
  });
  res.json({ unreadCount: count });
});

// PATCH /api/notifications/:id/read - позначити одне сповіщення прочитаним
const markRead = asyncHandler(async (req, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification || notification.userId !== req.user.id) {
    throw new ApiError(404, "Сповіщення не знайдено");
  }
  const updated = await prisma.notification.update({
    where: { id: notification.id },
    data: { readAt: notification.readAt ?? new Date() }, // не перезаписуємо час першого читання
  });
  res.json(serialize(updated));
});

// PATCH /api/notifications/read-all - позначити всі сповіщення прочитаними
const markAllRead = asyncHandler(async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ updated: result.count });
});

// DELETE /api/notifications/:id - видалити сповіщення
const remove = asyncHandler(async (req, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification || notification.userId !== req.user.id) {
    throw new ApiError(404, "Сповіщення не знайдено");
  }
  await prisma.notification.delete({ where: { id: notification.id } });
  res.status(204).send();
});

export { getAll, getUnreadCount, markRead, markAllRead, remove };
