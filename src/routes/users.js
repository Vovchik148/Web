const express = require("express");
const { body, query } = require("express-validator");
const ctrl = require("../controllers/userController");
const { authenticate, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam, paginationRules, searchRule } = require("../utils/validators");

const router = express.Router();

router.use(authenticate, authorize("ADMIN"));

router.get(
  "/",
  [...paginationRules, searchRule, query("role").optional().isIn(["ADMIN", "MANAGER", "WORKER"]).withMessage("role: ADMIN, MANAGER або WORKER")],
  validate,
  ctrl.getAll,
);

router.put(
  "/:id",
  [
    idParam(),
    body("role").optional().isIn(["ADMIN", "MANAGER", "WORKER"]).withMessage("role: ADMIN, MANAGER або WORKER"),
    body("isActive").optional().isBoolean().withMessage("isActive має бути true/false").toBoolean(),
  ],
  validate,
  ctrl.update,
);

module.exports = router;
