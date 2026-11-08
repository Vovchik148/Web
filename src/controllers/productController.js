import { matchedData } from "express-validator";
import productModel from "../models/product.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { logAction } from "../utils/audit.js";
import { parsePagination, buildPagination } from "../utils/pagination.js";
import { publishEvent } from "../services/realtime.js";
import cache from "../utils/cache.js";

// Зміни товарів транслюються в кімнату "products" (події product:created|updated|deleted)
const broadcast = (action, payload) => publishEvent("products", `product:${action}`, payload);

// Кеш списку товарів інвалідується при будь-якій зміні каталогу
const invalidateCache = () => cache.delPrefix("product:list");

// Додає totalQuantity - сумарний залишок по всіх складах
const serialize = (product, { withStocks = false } = {}) => {
  const { stocks, ...rest } = product;
  const totalQuantity = stocks.reduce((sum, s) => sum + s.quantity, 0);
  return withStocks ? { ...rest, totalQuantity, stocks } : { ...rest, totalQuantity };
};

const getAll = asyncHandler(async (req, res) => {
  const { search, categoryId, supplierId, isActive, sortBy = "createdAt", order = "desc" } = matchedData(req, { locations: ["query"] });
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
  logAction(req, "product.create", { entity: "product", entityId: product.id, details: { sku: product.sku, name: product.name } });
  invalidateCache();
  broadcast("created", serialize(product)); // подія product:created у кімнату products
  res.status(201).json(serialize(product));
});

const update = asyncHandler(async (req, res) => {
  const product = await productModel.update(req.params.id, matchedData(req, { locations: ["body"] }));
  logAction(req, "product.update", { entity: "product", entityId: product.id, details: { sku: product.sku } });
  invalidateCache();
  broadcast("updated", serialize(product)); // подія product:updated
  res.json(serialize(product));
});

const remove = asyncHandler(async (req, res) => {
  const product = await productModel.findById(req.params.id);
  if (!product) throw new ApiError(404, "Товар не знайдено");
  await productModel.remove(req.params.id);
  logAction(req, "product.delete", { entity: "product", entityId: product.id, details: { sku: product.sku } });
  invalidateCache();
  broadcast("deleted", { id: product.id, sku: product.sku }); // подія product:deleted
  res.status(204).send();
});

export { getAll, getById, create, update, remove, serialize };
