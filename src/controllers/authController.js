const bcrypt = require("bcryptjs");
const { matchedData } = require("express-validator");
const userModel = require("../models/user");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { signToken } = require("../utils/token");

const SALT_ROUNDS = 12;

const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = matchedData(req, { locations: ["body"] });

  if (await userModel.findByEmail(email)) {
    throw new ApiError(409, "Користувач з таким email вже існує");
  }

  // Публічна реєстрація завжди створює роль WORKER; вищі ролі видає лише ADMIN
  const user = await userModel.create({
    email,
    firstName,
    lastName,
    password: await bcrypt.hash(password, SALT_ROUNDS),
  });

  res.status(201).json({ message: "Користувача зареєстровано", user, token: signToken(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = matchedData(req, { locations: ["body"] });

  const user = await userModel.findByEmail(email);
  // Однакова відповідь для «немає користувача» і «невірний пароль» - щоб не розкривати, які email існують
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, "Невірний email або пароль");
  }
  if (!user.isActive) throw new ApiError(403, "Обліковий запис деактивовано");

  const { password: _hash, ...safeUser } = user;
  res.json({ message: "Вхід виконано", user: safeUser, token: signToken(user) });
});

const getProfile = asyncHandler(async (req, res) => {
  res.json(await userModel.findById(req.user.id));
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await userModel.update(req.user.id, matchedData(req, { locations: ["body"] }));
  res.json({ message: "Профіль оновлено", user });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = matchedData(req, { locations: ["body"] });

  const user = await userModel.findByIdWithPassword(req.user.id);
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw new ApiError(400, "Поточний пароль невірний");
  }

  await userModel.update(req.user.id, { password: await bcrypt.hash(newPassword, SALT_ROUNDS) });
  res.json({ message: "Пароль змінено" });
});

module.exports = { register, login, getProfile, updateProfile, changePassword };
