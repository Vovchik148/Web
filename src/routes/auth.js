const express = require("express");
const { body } = require("express-validator");
const ctrl = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

const passwordRule = (field) =>
  body(field)
    .isLength({ min: 6, max: 72 })
    .withMessage("Пароль має містити від 6 до 72 символів")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Пароль має містити малу літеру, велику літеру та цифру");

const nameRule = (field, isUpdate) => {
  const chain = body(field)
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(`${field} має містити від 2 до 50 символів`);
  return isUpdate ? chain.optional() : chain;
};

const emailRule = body("email").trim().isEmail().withMessage("Вкажіть коректний email").toLowerCase();

const registerRules = [emailRule, passwordRule("password"), nameRule("firstName"), nameRule("lastName")];
const loginRules = [emailRule, body("password").notEmpty().withMessage("Пароль обов'язковий")];
const profileRules = [nameRule("firstName", true), nameRule("lastName", true)];
const changePasswordRules = [
  body("currentPassword").notEmpty().withMessage("Поточний пароль обов'язковий"),
  passwordRule("newPassword"),
];

// Публічні
router.post("/register", registerRules, validate, ctrl.register);
router.post("/login", loginRules, validate, ctrl.login);

// Потребують авторизації
router.get("/profile", authenticate, ctrl.getProfile);
router.put("/profile", authenticate, profileRules, validate, ctrl.updateProfile);
router.put("/change-password", authenticate, changePasswordRules, validate, ctrl.changePassword);

module.exports = router;
