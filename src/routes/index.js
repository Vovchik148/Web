const express = require("express");
const prisma = require("../utils/prisma");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/health",
  asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`; // перевірка з'єднання з БД
    res.json({ status: "ok", database: "connected", uptime: process.uptime() });
  }),
);

router.use("/auth", require("./auth"));
router.use("/users", require("./users"));
router.use("/categories", require("./categories"));
router.use("/suppliers", require("./suppliers"));
router.use("/warehouses", require("./warehouses"));
router.use("/products", require("./products"));
router.use("/stock", require("./stock"));
router.use("/movements", require("./movements"));

module.exports = router;
