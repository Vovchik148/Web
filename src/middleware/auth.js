import jwt from "jsonwebtoken";
import config from "../utils/config.js";
import { prisma } from "../db.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

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

  try {
    req.user = verifyAccessToken(authHeader.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Недійсний або прострочений токен' });
  }

  req.user = { id: user.id, email: user.email, role: user.role };
  next();
});

export { authenticate, authorize };
