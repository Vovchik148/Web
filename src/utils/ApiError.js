// Помилка з HTTP-статусом: кидаємо її в контролерах/моделях, а errorHandler формує відповідь
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = ApiError;
