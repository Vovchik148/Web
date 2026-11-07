import { prisma } from "../db.js";

/**
 * Логує дію користувача в журнал аудиту (таблиця audit_logs).
 *
 * Виклик НЕ блокує відповідь і НЕ перериває обробку запиту:
 * якщо запис у журнал не вдався, у консоль потрапить помилка,
 * але клієнт цього не помітить.
 *
 * @param {object} req - об'єкт запиту Express (звідки беремо користувача та IP)
 * @param {string} action - дія у форматі "<сутність>.<операція>", наприклад "product.create"
 * @param {object} [options]
 * @param {string} [options.entity] - назва сутності ("user", "product", "file" тощо)
 * @param {number|string} [options.entityId] - ідентифікатор сутності
 * @param {object} [options.details] - довільні деталі (JSON у БД)
 */
const logAction = (req, action, { entity, entityId, details } = {}) => {
  prisma.auditLog
    .create({
      data: {
        userId: req.user?.id ?? null, // null - дія неавтентифікованого користувача (наприклад, невдалий вхід)
        action,
        entity: entity ?? null,
        entityId: entityId !== undefined ? String(entityId) : null,
        ip: req.ip,
        details: details === undefined ? undefined : details,
      },
    })
    .catch((error) => console.error("Не вдалося записати дію в журнал аудиту:", error));
};

export { logAction };
