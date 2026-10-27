const express = require("express");
const { body, query } = require("express-validator");
const ctrl = require("../controllers/stockController");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam, paginationRules } = require("../utils/validators");

const router = express.Router();

const TYPES = ["INBOUND", "OUTBOUND", "ADJUSTMENT"];
const intQuery = (name) =>
  query(name).optional().isInt({ gt: 0 }).withMessage(`${name} має бути додатним цілим числом`).toInt();

const listRules = [
  ...paginationRules,
  intQuery("productId"),
  intQuery("warehouseId"),
  intQuery("userId"),
  query("type").optional().isIn(TYPES).withMessage(`type: ${TYPES.join(", ")}`),
  query("from").optional().isISO8601().withMessage("from має бути датою у форматі ISO 8601"),
  query("to").optional().isISO8601().withMessage("to має бути датою у форматі ISO 8601"),
];

const createRules = [
  body("type").isIn(TYPES).withMessage(`type: ${TYPES.join(", ")}`),
  body("productId").isInt({ gt: 0 }).withMessage("productId має бути додатним цілим числом").toInt(),
  body("warehouseId").isInt({ gt: 0 }).withMessage("warehouseId має бути додатним цілим числом").toInt(),
  body("quantity")
    .isInt({ min: -1000000, max: 1000000 })
    .withMessage("quantity має бути цілим числом (до 1 000 000 за модулем)")
    .toInt()
    .custom((value, { req }) => {
      if (req.body.type === "ADJUSTMENT") {
        if (value === 0) throw new Error("Для ADJUSTMENT quantity не може бути 0 (використовуйте + або -)");
      } else if (value < 1) {
        throw new Error("Для INBOUND/OUTBOUND quantity має бути >= 1");
      }
      return true;
    }),
  body("note").optional().trim().isLength({ max: 255 }).withMessage("note не довша за 255 символів"),
];

// Журнал руху незмінний (аудит): доступні лише читання та створення нових записів.
// Помилкову операцію виправляють новою операцією ADJUSTMENT.
router.use(authenticate);

router.get("/", listRules, validate, ctrl.getMovements);
router.get("/:id", idParam(), validate, ctrl.getMovementById);
router.post("/", createRules, validate, ctrl.createMovement);

module.exports = router;
