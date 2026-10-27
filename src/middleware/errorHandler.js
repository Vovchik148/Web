const { STATUS_CODES } = require("http");
const config = require("../utils/config");
const ApiError = require("../utils/ApiError");

const respond = (res, status, message, details) =>
  res.status(status).json({
    error: STATUS_CODES[status],
    message,
    ...(details && { errors: details }),
  });

// Єдина точка обробки всіх помилок (має бути підключена останньою)
// eslint-disable-next-line no-unused-vars
const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  // Наші власні помилки
  if (error instanceof ApiError) {
    return respond(res, error.statusCode, error.message, error.details);
  }

  // Некоректний JSON у тілі запиту
  if (error.type === "entity.parse.failed") {
    return respond(res, 400, "Некоректний JSON у тілі запиту");
  }

  // Помилки Prisma
  if (error.code === "P2002") {
    const fields = [].concat(error.meta?.target || []).join(", ");
    return respond(res, 409, `Запис з таким значенням вже існує${fields ? ` (${fields})` : ""}`);
  }
  if (error.code === "P2025") {
    return respond(res, 404, "Запис не знайдено");
  }
  if (error.code === "P2003") {
    return respond(res, 400, "Вказано неіснуючий пов'язаний запис (категорія, постачальник тощо)");
  }

  // Помилки JWT
  if (error.name === "TokenExpiredError") {
    return respond(res, 401, "Термін дії токена закінчився, увійдіть знову");
  }
  if (error.name === "JsonWebTokenError") {
    return respond(res, 401, "Недійсний токен авторизації");
  }

  // Все інше - 500, деталі показуємо лише в режимі розробки
  console.error("Unhandled error:", error);
  return respond(
    res,
    500,
    config.nodeEnv === "development" ? error.message : "Внутрішня помилка сервера",
  );
};

module.exports = errorHandler;
