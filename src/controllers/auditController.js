import { matchedData } from "express-validator";
import asyncHandler from "../utils/asyncHandler.js";
import auditLogModel from "../models/auditLog.js";
import { parsePagination, buildPagination } from "../utils/pagination.js";

// Список дій із журналу аудиту (пагінація + фільтри). Маршрут доступний лише ADMIN.
const getAll = asyncHandler(async (req, res) => {
  const { userId, action, entity, entityId, from, to } = matchedData(req, { locations: ["query"] });
  const { page, limit, skip } = parsePagination(req.query);

  const where = {};
  if (userId) where.userId = userId;
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (entity) where.entity = { contains: entity, mode: "insensitive" };
  if (entityId) where.entityId = String(entityId);
  if (from || to) where.createdAt = { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) };

  const [logs, total] = await Promise.all([
    auditLogModel.findMany({ where, skip, take: limit }),
    auditLogModel.count(where),
  ]);

  res.json({ data: logs, pagination: buildPagination(page, limit, total) });
});

export { getAll };
