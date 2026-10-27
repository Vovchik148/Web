const express = require("express");
const { body } = require("express-validator");
const ctrl = require("../controllers/categoryController");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam, maybe, paginationRules, searchRule } = require("../utils/validators");

const router = express.Router();

const categoryRules = (isUpdate = false) => [
  maybe(
    body("name")
      .trim()
      .notEmpty().withMessage("name обов'язкове")
      .isLength({ max: 100 }).withMessage("name не довше за 100 символів"),
    isUpdate,
  ),
  body("description").optional().trim().isLength({ max: 500 }).withMessage("description не довше за 500 символів"),
];

router.use(authenticate);

router.get("/", [...paginationRules, searchRule], validate, ctrl.getAll);
router.get("/:id", idParam(), validate, ctrl.getById);
router.post("/", authorize("ADMIN", "MANAGER"), categoryRules(), validate, ctrl.create);
router.put("/:id", authorize("ADMIN", "MANAGER"), idParam(), categoryRules(true), validate, ctrl.update);
router.delete("/:id", authorize("ADMIN"), idParam(), validate, ctrl.remove);

module.exports = router;
