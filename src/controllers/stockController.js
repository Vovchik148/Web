const { matchedData } = require("express-validator");
const stockModel = require("../models/stock");
const productModel = require("../models/product");
const { serialize: serializeProduct } = require("./productController");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { parsePagination, buildPagination } = require("../utils/pagination");

// GET /api/stock - поточні залишки (фільтр за товаром / складом)
const getStocks = asyncHandler(async (req, res) => {
  const { productId, warehouseId } = req.query;
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

// GET /api/stock/low - товари, сумарний залишок яких нижчий за minStock
const getLowStock = asyncHandler(async (req, res) => {
  const products = await productModel.findAllWithMinStock();

  const data = products
    .map((p) => serializeProduct(p))
    .filter((p) => p.totalQuantity < p.minStock)
    .map((p) => ({ ...p, deficit: p.minStock - p.totalQuantity }));

  res.json({ data, total: data.length });
});

// GET /api/movements - журнал руху з фільтрами
const getMovements = asyncHandler(async (req, res) => {
  const { productId, warehouseId, userId, type, from, to } = req.query;
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
const createMovement = asyncHandler(async (req, res) => {
  const data = matchedData(req, { locations: ["body"] });
  const movement = await stockModel.applyMovement({ ...data, userId: req.user.id });
  res.status(201).json(movement);
});

module.exports = { getStocks, getLowStock, getMovements, getMovementById, createMovement };
