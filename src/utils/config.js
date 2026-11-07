import "dotenv/config";

// Перевіряємо обов'язкові змінні середовища при старті, щоб помилка була зрозумілою
const required = ["DATABASE_URL", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Відсутні обов'язкові змінні середовища: ${missing.join(", ")}. Перевірте файл .env`,
  );
}

export default {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
  // URL фронтенду: куди повертаємо користувача після OAuth
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  // Зовнішня адреса API - для формування redirect_uri OAuth
  appUrl: process.env.APP_URL || "http://localhost:3000",
  // Суворий ліміт для /api/auth (брутфорс-захист), значення беруться з .env
  authRateLimitWindowMinutes: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES) || 15,
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
};
