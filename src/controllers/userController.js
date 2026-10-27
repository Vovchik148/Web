const { matchedData } = require("express-validator");
const userModel = require("../models/user");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { parsePagination, buildPagination } = require("../utils/pagination");

// GET /api/users (ADMIN)
const getAll = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query);

  const where = {};
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    userModel.findMany({ where, skip, take: limit }),
    userModel.count(where),
  ]);

  res.json({ data, pagination: buildPagination(page, limit, total) });
});

// PUT /api/users/:id (ADMIN) - змінити роль або деактивувати
const update = asyncHandler(async (req, res) => {
  const data = matchedData(req, { locations: ["body"] });

  if (req.params.id === req.user.id) {
    throw new ApiError(400, "Не можна змінювати власну роль або статус");
  }

  res.json(await userModel.update(req.params.id, data));
});

module.exports = { getAll, update };
