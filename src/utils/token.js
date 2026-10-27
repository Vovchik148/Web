const jwt = require("jsonwebtoken");
const config = require("./config");

const signToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

module.exports = { signToken };
