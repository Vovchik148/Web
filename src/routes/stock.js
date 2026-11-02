import express from "express";
import { query } from "express-validator";
import * as ctrl from "../controllers/stockController.js";
import { authenticate } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { paginationRules } from "../utils/validators.js";

const router = express.Router();

const intQuery = (name) =>
  query(name).optional().isInt({ gt: 0 }).withMessage(`${name} має бути додатним цілим числом`).toInt();

router.use(authenticate);

router.get("/", [...paginationRules, intQuery("productId"), intQuery("warehouseId")], validate, ctrl.getStocks);

// Важливо: /low оголошений до можливих параметричних маршрутів
router.get("/low", ctrl.getLowStock);

export default router;
