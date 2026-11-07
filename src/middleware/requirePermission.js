import ApiError from "../utils/ApiError.js";
import { hasPermission } from "../config/permissions.js";

/**
 * Перевіряє, що автентифікований користувач має усі перелічені дозволи.
 * Використовується замість authorize у маршрутах:
 *
 *   router.post("/", requirePermission(PERMISSIONS.PRODUCTS_WRITE), ...);
 *
 * @param {...string} required - дозволи з PERMISSIONS, наприклад "products:write"
 */
export function requirePermission(...required) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Необхідна аутентифікація"));
    }

    const missing = required.find((permission) => !hasPermission(req.user.role, permission));
    if (missing) {
      return next(
        new ApiError(403, `Недостатньо прав для виконання цієї операції (потрібен дозвіл: ${missing})`),
      );
    }

    next();
  };
}
