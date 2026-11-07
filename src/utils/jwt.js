import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

export function generateAccessToken(userId, role) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

export function generateRefreshToken(userId) {
  // jti робить кожен refresh токен унікальним, навіть якщо їх видано в одну секунду
  return jwt.sign({ userId, jti: randomUUID() }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
  });
}

export const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

// Короткоживучий тимчасовий токен для другого кроку входу з 2FA:
// повні токени видаються лише після успішного введення коду
export function generateTwoFactorTempToken(userId) {
  return jwt.sign({ userId, purpose: "2fa" }, process.env.JWT_SECRET, {
    expiresIn: process.env.TWO_FACTOR_TEMP_TOKEN_EXPIRES_IN || "5m",
  });
}

export const verifyRefreshToken = (token) => jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);