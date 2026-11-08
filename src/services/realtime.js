import { prisma } from "../db.js";
import { wsEventsTotal } from "../utils/metrics.js";

// Сервіс подій реального часу.
//
// Будь-яка зміна даних проходить сюди: подія зберігається в таблицю
// event_logs (з порядковим номером id) і розсилається в кімнату Socket.io.
// Завдяки запису в БД клієнт після перепідключення може запросити
// пропущені події (socket "events:sync" з останнім отриманим _seq).

let io = null;

/** Викликається з initSocket: дає сервісу доступ до екземпляра Socket.io */
export const setIo = (instance) => {
  io = instance;
};

export const getIo = () => io;

/**
 * Публікує подію: запис в історію + розсилка всім клієнтам кімнати.
 * Клієнт отримує подію з іменем type (наприклад "stock:updated"),
 * а в payload додано службові поля _seq (порядковий номер) і _at.
 *
 * Помилка запису в БД не блокує розсилку: подія все одно піде клієнтам,
 * лише без _seq (це той самий принцип, що й в audit log).
 */
export const publishEvent = async (room, type, payload = {}) => {
  if (!io) return null;

  const saved = await prisma.eventLog
    .create({ data: { type, room, payload } })
    .catch((err) => {
      console.error("[realtime] Не вдалося зберегти подію в історію:", err.message);
      return null;
    });

  const event = {
    ...payload,
    _type: type,
    _room: room,
    _at: new Date().toISOString(),
    ...(saved ? { _seq: saved.id } : {}),
  };

  io.to(room).emit(type, event);
  wsEventsTotal.inc({ event: type, direction: "out" });
  return event;
};

/**
 * Розсилка персональної події в особисту кімнату користувача
 * (сповіщення, зміни, що стосуються лише цього користувача).
 */
export const publishToUser = (userId, type, payload = {}) =>
  publishEvent(`user:${userId}`, type, payload);
