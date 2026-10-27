const { matchedData } = require("express-validator");
const productModel = require("../models/product");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { parsePagination, buildPagination } = require("../utils/pagination");

// Додає totalQuantity - сумарний залишок по всіх складах
const serialize = (product, { withStocks = false } = {}) => {
  const { stocks, ...rest } = product;
  const totalQuantity = stocks.reduce((sum, s) => sum + s.quantity, 0);
  return withStocks ? { ...rest, totalQuantity, stocks } : { ...rest, totalQuantity };
};

const getAll = asyncHandler(async (req, res) => {
  const { search, categoryId, supplierId, isActive, sortBy = "createdAt", order = "desc" } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (supplierId) where.supplierId = supplierId;
  if (isActive !== undefined) where.isActive = isActive;

  const [products, total] = await Promise.all([
    productModel.findMany({ where, skip, take: limit, orderBy: { [sortBy]: order } }),
    productModel.count(where),
  ]);

  res.json({ data: products.map((p) => serialize(p)), pagination: buildPagination(page, limit, total) });
});

const getById = asyncHandler(async (req, res) => {
  const product = await productModel.findById(req.params.id);
  if (!product) throw new ApiError(404, "Товар не знайдено");
  res.json(serialize(product, { withStocks: true }));
});

const create = asyncHandler(async (req, res) => {
  const product = await productModel.create(matchedData(req, { locations: ["body"] }));
  res.status(201).json(serialize(product));
});

const update = asyncHandler(async (req, res) => {
  const product = await productModel.update(req.params.id, matchedData(req, { locations: ["body"] }));
  res.json(serialize(product));
});

const remove = asyncHandler(async (req, res) => {
  await productModel.remove(req.params.id);
  res.status(204).send();
});

module.exports = { getAll, getById, create, update, remove, serialize };
