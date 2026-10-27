const { param, query } = require("express-validator");

// Перевірка та перетворення :id у число
const idParam = (name = "id") =>
  param(name)
    .isInt({ gt: 0 })
    .withMessage(`${name} має бути додатним цілим числом`)
    .toInt();

// Для PUT робимо всі поля необов'язковими, для POST - обов'язковими
const maybe = (chain, isUpdate) => (isUpdate ? chain.optional() : chain);

const paginationRules = [
  query("page").optional().isInt({ min: 1 }).withMessage("page має бути цілим числом >= 1"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit має бути від 1 до 100"),
];

const searchRule = query("search")
  .optional()
  .trim()
  .isLength({ max: 100 })
  .withMessage("search не довший за 100 символів");

module.exports = { idParam, maybe, paginationRules, searchRule };
