const { validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

// Збирає помилки, знайдені ланцюжками express-validator, в одну 400-відповідь
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  throw new ApiError(400, "Помилка валідації вхідних даних", details);
};

module.exports = validate;
