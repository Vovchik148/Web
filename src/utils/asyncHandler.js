// Express 4 не ловить помилки в async-функціях сам - передаємо їх у next()
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
