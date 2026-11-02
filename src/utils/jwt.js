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

export const verifyRefreshToken = (token) => jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);