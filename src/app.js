const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const config = require("./utils/config"); // завантажує .env і перевіряє обов'язкові змінні
const prisma = require("./utils/prisma");
const ApiError = require("./utils/ApiError");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// --- Middleware ---
app.use(helmet()); // безпечні HTTP-заголовки
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// --- Маршрути ---
app.get("/", (req, res) => {
  res.json({
    name: "Warehouse Inventory API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      users: "/api/users",
      categories: "/api/categories",
      suppliers: "/api/suppliers",
      warehouses: "/api/warehouses",
      products: "/api/products",
      stock: "/api/stock",
      movements: "/api/movements",
    },
  });
});
app.use("/api", routes);

// --- 404 і обробка помилок (завжди в кінці) ---
app.use((req, res, next) => {
  next(new ApiError(404, `Маршрут ${req.method} ${req.originalUrl} не знайдено`));
});
app.use(errorHandler);

// Запускаємо сервер лише коли файл виконано напряму (не при require у тестах)
if (require.main === module) {
  const server = app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port} (${config.nodeEnv})`);
    console.log(`📍 http://localhost:${config.port}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

module.exports = app;
