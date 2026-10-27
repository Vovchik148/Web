const express = require("express");
const { query } = require("express-validator");
const ctrl = require("../controllers/stockController");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { paginationRules } = require("../utils/validators");

const router = express.Router();

const intQuery = (name) =>
  query(name).optional().isInt({ gt: 0 }).withMessage(`${name} має бути додатним цілим числом`).toInt();

router.use(authenticate);

router.get("/", [...paginationRules, intQuery("productId"), intQuery("warehouseId")], validate, ctrl.getStocks);

// Важливо: /low оголошений до можливих параметричних маршрутів
router.get("/low", ctrl.getLowStock);

module.exports = router;
