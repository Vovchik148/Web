const jwt = require("jsonwebtoken");
const config = require("../utils/config");
const prisma = require("../utils/prisma");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// Перевіряє JWT з заголовка Authorization: Bearer <token>
const authenticate = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new ApiError(401, "Потрібен токен авторизації (Authorization: Bearer <token>)");
  }

  const decoded = jwt.verify(token, config.jwtSecret); // помилки JWT обробить errorHandler
  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

  if (!user || !user.isActive) {
    throw new ApiError(401, "Користувача не знайдено або його деактивовано");
  }

  req.user = { id: user.id, email: user.email, role: user.role };
  next();
});

// Дозволяє доступ лише вказаним ролям: authorize("ADMIN", "MANAGER")
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, "Недостатньо прав для цієї дії");
    }
    next();
  };

module.exports = { authenticate, authorize };
