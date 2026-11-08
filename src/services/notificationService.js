import { prisma } from "../db.js";
import { publishToUser, getIo } from "./realtime.js";
import { enqueue, registerJob } from "./queue.js";

// Сервіс сповіщень (рівень 2-3).
//
// Кожне сповіщення:
// 1) зберігається в БД (таблиця notifications) - клієнт бачить його навіть
//    якщо був офлайн;
// 2) доставляється в реальному часі через WebSocket в особисту кімнату
//    user:<id> подією "notification".
//
// Сповіщення мають тип (NotificationType) і пріоритет (NotificationPriority),
// що дозволяє клієнту сортувати та підсвічувати їх по-різному.

/**
 * Створює сповіщення та доставляє його в реальному часі.
 * @param {object} input
 * @param {number} input.userId - отримувач
 * @param {string} input.type - тип: LOW_STOCK | MOVEMENT | SYSTEM | PRODUCT
 * @param {string} [input.priority] - LOW | NORMAL | HIGH | CRITICAL
 * @param {string} input.title
 * @param {string} input.message
 * @param {object} [input.data] - довільні деталі (id товару, дефіцит тощо)
 */
export const createNotification = async ({ userId, type, priority, title, message, data }) => {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      priority: priority ?? "NORMAL",
      title,
      message,
      data,
    },
  });

  publishToUser(userId, "notification", serialize(notification));
  return notification;
};

/**
 * Групова розсилка (batch): одне сповіщення багатьом користувачам.
 * Виконується через чергу фонових задач, щоб не навантажувати HTTP-запит.
 */
export const createBatchNotification = (userIds, input) =>
  enqueue("notification.batch", { userIds: [...userIds], ...input });

registerJob("notification.batch", async ({ userIds, ...input }) => {
  if (!userIds.length) return;
  const rows = userIds.map((userId) => ({
    userId,
    type: input.type,
    priority: input.priority ?? "NORMAL",
    title: input.title,
    message: input.message,
    data: input.data,
  }));
  await prisma.notification.createMany({ data: rows });
  // Доставка в реальному часі: лише тим, хто зараз онлайн
  const io = getIo();
  userIds.forEach((userId) => publishToUser(userId, "notification", input));
  if (io) wsLogBatch(userIds.length);
});

const wsLogBatch = (count) => console.log(`[notify] Розіслано ${count} сповіщень(batch)`);

/** Сирі дані з БД серіалізуємо до однакового вигляду (Decimal → string тощо) */
export const serialize = (notification) => ({
  id: notification.id,
  userId: notification.userId,
  type: notification.type,
  priority: notification.priority,
  title: notification.title,
  message: notification.message,
  data: notification.data,
  read: notification.readAt !== null,
  readAt: notification.readAt,
  createdAt: notification.createdAt,
});

/**
 * Сповіщення про низький залишок товару (викликається після руху товару).
 * Щоб не спамити: попередні непрочитані LOW_STOCK про той самий товар
 * позначаються прочитаними, і створюється одне актуальне.
 * Розсилка - всім активним ADMIN і MANAGER (batch через чергу).
 */
export const notifyLowStock = async (product, totalQuantity) => {
  const deficit = product.minStock - totalQuantity;

  // Позначаємо попередні непрочитані сповіщення про цей товар прочитаними
  await prisma.notification.updateMany({
    where: {
      type: "LOW_STOCK",
      readAt: null,
      data: { path: ["productId"], equals: product.id },
    },
    data: { readAt: new Date() },
  });

  const recipients = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["ADMIN", "MANAGER"] } },
    select: { id: true },
  });

  await createBatchNotification(
    recipients.map((u) => u.id),
    {
      type: "LOW_STOCK",
      priority: deficit < 0 ? "CRITICAL" : "HIGH", // дефіцит > 0 (порожньо) - критично
      title: "Низький залишок товару",
      message: `Товар "${product.name}" (SKU ${product.sku}): залишок ${totalQuantity} ${product.unit} при мінімумі ${product.minStock}`,
      data: { productId: product.id, sku: product.sku, totalQuantity, minStock: product.minStock, deficit },
    },
  );
};
