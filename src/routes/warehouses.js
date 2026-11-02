import express from "express";
import { body } from "express-validator";
import ctrl from "../controllers/warehouseController.js";
import { authenticate} from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import validate from "../middleware/validate.js";
import { idParam, maybe, paginationRules, searchRule } from "../utils/validators.js";

const router = express.Router();

const warehouseRules = (isUpdate = false) => [
  maybe(
    body("name")
      .trim()
      .notEmpty().withMessage("name обов'язкове")
      .isLength({ max: 100 }).withMessage("name не довше за 100 символів"),
    isUpdate,
  ),
  maybe(
    body("location")
      .trim()
      .notEmpty().withMessage("location обов'язкове")
      .isLength({ max: 255 }).withMessage("location не довше за 255 символів"),
    isUpdate,
  ),
  body("capacity").optional().isInt({ min: 1, max: 100000000 }).withMessage("capacity має бути додатним цілим числом").toInt(),
];

router.use(authenticate);

router.get("/", [...paginationRules, searchRule], validate, ctrl.getAll);
router.get("/:id", idParam(), validate, ctrl.getById);
router.post("/", authorize("ADMIN", "MANAGER"), warehouseRules(), validate, ctrl.create);
router.put("/:id", authorize("ADMIN", "MANAGER"), idParam(), warehouseRules(true), validate, ctrl.update);
router.delete("/:id", authorize("ADMIN"), idParam(), validate, ctrl.remove);

export default router;
