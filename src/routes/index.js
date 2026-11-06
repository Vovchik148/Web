import express from "express";
import { prisma } from "../db.js";
import asyncHandler from "../utils/asyncHandler.js";
import fileRoutes from "../controllers/fileRoutes.js";

import authRoutes from "./auth.js";
import userRoutes from "./users.js";
import categoryRoutes from "./categories.js";
import supplierRoutes from "./suppliers.js";
import warehouseRoutes from "./warehouses.js";
import productRoutes from "./products.js";
import stockRoutes from "./stock.js";
import movementRoutes from "./movements.js";

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Перевірка стану сервера та підключення до БД
 *     tags: [Health]
 *     responses:
 *       200: { description: Сервер працює, база даних підключена }
 *       500: { description: Помилка підключення до бази даних }
 */
router.get(
  "/health",
  asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", uptime: process.uptime() });
  }),
);

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/categories", categoryRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/warehouses", warehouseRoutes);
router.use("/products", productRoutes);
router.use("/stock", stockRoutes);
router.use("/movements", movementRoutes);
router.use("/files", fileRoutes);
export default router;
