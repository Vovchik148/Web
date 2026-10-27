require("dotenv").config();

// Перевіряємо обов'язкові змінні середовища при старті, щоб помилка була зрозумілою
const required = ["DATABASE_URL", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Відсутні обов'язкові змінні середовища: ${missing.join(", ")}. Перевірте файл .env`,
  );
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
};
