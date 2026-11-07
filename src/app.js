import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";

import config from "./utils/config.js"; // завантажує .env і перевіряє обов'язкові змінні
import { swaggerSpecs } from "./config/swagger.js";
import ApiError from "./utils/ApiError.js";
import routes from "./routes/index.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

// --- Middleware ---
app.use(helmet()); // безпечні HTTP-заголовки
app.use(
  cors({
    origin: config.corsOrigin || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Обмеження кількості запитів до API (до express.json, щоб відсікати зайве раніше)
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 хвилин
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message: "Забагато запитів, спробуйте пізніше",
    },
  })
);

// Суворіший ліміт для ендпоінтів автентифікації - захист від підбору паролів (брутфорсу)
app.use(
  "/api/auth/",
  rateLimit({
    windowMs: config.authRateLimitWindowMinutes * 60 * 1000,
    limit: config.authRateLimitMax, // 20 запитів за 15 хвилин за замовчуванням
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message: "Забагато спроб входу, спробуйте пізніше",
    },
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// --- Документація Swagger ---
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// --- Маршрути ---
app.get("/", (req, res) => {
  res.json({
    name: "Warehouse Inventory API",
    version: "1.0.0",
    endpoints: {
      docs: "/api-docs",
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

export default app;
