import express from "express";
import { body } from "express-validator";
import ctrl from "../controllers/supplierController.js";
import { authenticate} from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import validate from "../middleware/validate.js";
import { idParam, maybe, paginationRules, searchRule } from "../utils/validators.js";

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

export default router;
