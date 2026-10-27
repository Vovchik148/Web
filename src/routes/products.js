const express = require("express");
const { body, query } = require("express-validator");
const ctrl = require("../controllers/productController");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam, maybe, paginationRules, searchRule } = require("../utils/validators");

const router = express.Router();

const productRules = (isUpdate = false) => [
  maybe(
    body("sku")
      .trim()
      .toUpperCase()
      .matches(/^[A-Z0-9-]{3,30}$/)
      .withMessage("sku: 3-30 символів (латинські літери, цифри, дефіс)"),
    isUpdate,
  ),
  maybe(
    body("name")
      .trim()
      .notEmpty().withMessage("name обов'язкове")
      .isLength({ max: 150 }).withMessage("name не довше за 150 символів"),
    isUpdate,
  ),
  body("description").optional().trim().isLength({ max: 1000 }).withMessage("description не довше за 1000 символів"),
  body("unit").optional().trim().isLength({ min: 1, max: 20 }).withMessage("unit: 1-20 символів"),
  maybe(
    body("price").isFloat({ min: 0, max: 99999999 }).withMessage("price має бути числом >= 0").toFloat(),
    isUpdate,
  ),
  body("minStock").optional().isInt({ min: 0, max: 1000000 }).withMessage("minStock має бути цілим числом >= 0").toInt(),
  body("isActive").optional().isBoolean().withMessage("isActive має бути true/false").toBoolean(),
  maybe(body("categoryId").isInt({ gt: 0 }).withMessage("categoryId має бути додатним цілим числом").toInt(), isUpdate),
  body("supplierId").optional().isInt({ gt: 0 }).withMessage("supplierId має бути додатним цілим числом").toInt(),
];

const listRules = [
  ...paginationRules,
  searchRule,
  query("categoryId").optional().isInt({ gt: 0 }).withMessage("categoryId має бути додатним цілим числом").toInt(),
  query("supplierId").optional().isInt({ gt: 0 }).withMessage("supplierId має бути додатним цілим числом").toInt(),
  query("isActive").optional().isBoolean().withMessage("isActive має бути true/false").toBoolean(),
  query("sortBy").optional().isIn(["name", "sku", "price", "createdAt"]).withMessage("sortBy: name, sku, price або createdAt"),
  query("order").optional().isIn(["asc", "desc"]).withMessage("order: asc або desc"),
];

router.use(authenticate);

router.get("/", listRules, validate, ctrl.getAll);
router.get("/:id", idParam(), validate, ctrl.getById);
router.post("/", authorize("ADMIN", "MANAGER"), productRules(), validate, ctrl.create);
router.put("/:id", authorize("ADMIN", "MANAGER"), idParam(), productRules(true), validate, ctrl.update);
router.delete("/:id", authorize("ADMIN"), idParam(), validate, ctrl.remove);

module.exports = router;
