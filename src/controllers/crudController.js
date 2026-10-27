const { matchedData } = require("express-validator");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { parsePagination, buildPagination } = require("../utils/pagination");

// Фабрика контролерів для простих сутностей. Контролер не знає про Prisma -
// він лише приймає запит, викликає модель і формує HTTP-відповідь.
const createCrudController = ({ model, entity, serialize = (item) => item }) => ({
  getAll: asyncHandler(async (req, res) => {
    const { search } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    const [items, total] = await Promise.all([
      model.findMany({ search, skip, take: limit }),
      model.count({ search }),
    ]);

    res.json({ data: items.map(serialize), pagination: buildPagination(page, limit, total) });
  }),

  getById: asyncHandler(async (req, res) => {
    const item = await model.findById(req.params.id);
    if (!item) throw new ApiError(404, `${entity} не знайдено`);
    res.json(serialize(item));
  }),

  create: asyncHandler(async (req, res) => {
    // matchedData повертає лише поля, що пройшли валідацію (захист від зайвих полів)
    const item = await model.create(matchedData(req, { locations: ["body"] }));
    res.status(201).json(serialize(item));
  }),

  update: asyncHandler(async (req, res) => {
    const item = await model.update(req.params.id, matchedData(req, { locations: ["body"] }));
    res.json(serialize(item));
  }),

  remove: asyncHandler(async (req, res) => {
    await model.remove(req.params.id);
    res.status(204).send();
  }),
});

module.exports = createCrudController;
