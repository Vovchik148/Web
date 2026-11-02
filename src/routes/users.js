import express from "express";
import { body, query } from "express-validator";
import * as ctrl from "../controllers/userController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { idParam, paginationRules, searchRule } from "../utils/validators.js";

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

export default router;
