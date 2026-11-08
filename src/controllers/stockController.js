import { matchedData } from "express-validator";
import stockModel from "../models/stock.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { parsePagination, buildPagination } from "../utils/pagination.js";
import { publishEvent } from "../services/realtime.js";
import { notifyLowStock } from "../services/notificationService.js";
import { logAction } from "../utils/audit.js";

// GET /api/stock - поточні залишки (фільтр за товаром / складом)
const getStocks = asyncHandler(async (req, res) => {
  const { productId, warehouseId } = matchedData(req, { locations: ["query"] });
  const { page, limit, skip } = parsePagination(req.query);

  const where = {};
  if (productId) where.productId = productId;
  if (warehouseId) where.warehouseId = warehouseId;

  const [data, total] = await Promise.all([
    stockModel.findStocks({ where, skip, take: limit }),
    stockModel.countStocks(where),
  ]);

  res.json({ data, pagination: buildPagination(page, limit, total) });
});

// GET /api/stock/low - товари, сумарний залишок яких нижчий за minStock.
// Оптимізовано: один агрегатний SQL-запит на рівні БД замість завантаження
// всіх товарів з залишками та фільтрації в JS (див. stockModel.findLowStockProducts).
const getLowStock = asyncHandler(async (req, res) => {
  const data = await stockModel.findLowStockProducts();
  res.json({ data, total: data.length });
});

// GET /api/movements - журнал руху з фільтрами
const getMovements = asyncHandler(async (req, res) => {
  const { productId, warehouseId, userId, type, from, to } = matchedData(req, { locations: ["query"] });
  const { page, limit, skip } = parsePagination(req.query);

  const where = {};
  if (productId) where.productId = productId;
  if (warehouseId) where.warehouseId = warehouseId;
  if (userId) where.userId = userId;
  if (type) where.type = type;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [data, total] = await Promise.all([
    stockModel.findMovements({ where, skip, take: limit }),
    stockModel.countMovements(where),
  ]);

  res.json({ data, pagination: buildPagination(page, limit, total) });
});

const getMovementById = asyncHandler(async (req, res) => {
  const movement = await stockModel.findMovementById(req.params.id);
  if (!movement) throw new ApiError(404, "Операцію не знайдено");
  res.json(movement);
});

// POST /api/movements - нова операція (оновлює залишок)
// Після транзакції розсилає події реального часу в кімнату складу
// та генерує сповіщення про низький залишок (якщо він виник).
const createMovement = asyncHandler(async (req, res) => {
  const data = matchedData(req, { locations: ["body"] });
  const movement = await stockModel.applyMovement({ ...data, userId: req.user.id });

  const room = `warehouse:${movement.warehouseId}`;

  // stock:updated - новий залишок цього товару на цьому складі
  const stock = await stockModel.findStock(movement.productId, movement.warehouseId);
  publishEvent(room, "stock:updated", {
    productId: movement.productId,
    warehouseId: movement.warehouseId,
    quantity: stock.quantity,
    updatedAt: stock.updatedAt,
  });

  // movement:created - сама операція (для живого журналу руху)
  publishEvent(room, "movement:created", movement);
  logAction(req, "movement.create", { entity: "movement", entityId: movement.id, details: { type: movement.type, productId: movement.productId } });

  // Сповіщення про низький залишок: сума по всіх складах проти minStock
  const { _sum } = await stockModel.getTotalQuantity(movement.productId);
  const totalQuantity = _sum.quantity ?? 0;
  const product = await stockModel.findProductForStockCheck(movement.productId);
  if (product && totalQuantity < product.minStock) {
    await notifyLowStock(product, totalQuantity);
  }

  res.status(201).json(movement);
});

export { getStocks, getLowStock, getMovements, getMovementById, createMovement };
