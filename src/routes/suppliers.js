const express = require("express");
const { body } = require("express-validator");
const ctrl = require("../controllers/supplierController");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam, maybe, paginationRules, searchRule } = require("../utils/validators");

const router = express.Router();

const supplierRules = (isUpdate = false) => [
  maybe(
    body("name")
      .trim()
      .notEmpty().withMessage("name обов'язкове")
      .isLength({ max: 150 }).withMessage("name не довше за 150 символів"),
    isUpdate,
  ),
  body("email").optional().trim().isEmail().withMessage("Вкажіть коректний email").toLowerCase(),
  body("phone")
    .optional()
    .trim()
    .matches(/^\+?[0-9\s()-]{7,20}$/)
    .withMessage("Некоректний номер телефону"),
  body("address").optional().trim().isLength({ max: 255 }).withMessage("address не довше за 255 символів"),
];

router.use(authenticate);

router.get("/", [...paginationRules, searchRule], validate, ctrl.getAll);
router.get("/:id", idParam(), validate, ctrl.getById);
router.post("/", authorize("ADMIN", "MANAGER"), supplierRules(), validate, ctrl.create);
router.put("/:id", authorize("ADMIN", "MANAGER"), idParam(), supplierRules(true), validate, ctrl.update);
router.delete("/:id", authorize("ADMIN"), idParam(), validate, ctrl.remove);

module.exports = router;
