import { Server } from "socket.io";
import { verifyAccessToken } from "../utils/jwt.js";
import { prisma } from "../db.js";
import { wsConnectionsActive, wsConnectionsTotal, wsRejectedTotal, wsEventsTotal, wsRateLimitedTotal } from "../utils/metrics.js";
import { setIo } from "../services/realtime.js";
import { presence } from "./presence.js";
import { checkRateLimit } from "./rateLimit.js";

// Кімнати предметної області, до яких дозволено приєднуватися:
// - products / categories / suppliers / warehouses  - зміни довідників і каталогу;
// - warehouse:<id> - залишки та рухи конкретного складу.
// Особиста кімната user:<userId> приєднується автоматично після автентифікації.
const ROOM_PATTERNS = [
  /^products$/,
  /^categories$/,
  /^suppliers$/,
  /^warehouses$/,
  /^warehouse:\d+$/,
];

const isRoomAllowed = (room) => ROOM_PATTERNS.some((pattern) => pattern.test(room));

/**
 * Реєструє обробник події з обмеженням частоти та обробкою помилок:
 * - ліміт частоти: понад WS_RATE_LIMIT_EVENTS за вікно подія відкидається;
 * - будь-який виняток в обробнику не падає у process, а йде клієнту подією "error".
 */
const onEvent = (socket, name, handler) => {
  socket.on(name, async (...args) => {
    wsEventsTotal.inc({ event: name, direction: "in" });

    const ack = typeof args[args.length - 1] === "function" ? args[args.length - 1] : null;

    if (!checkRateLimit(socket.id)) {
      wsRateLimitedTotal.inc();
      socket.emit("error", { event: name, message: "Забагато подій, спробуйте пізніше" });
      ack?.({ ok: false, error: "rate_limited" });
      return;
    }

    try {
      await handler(...args);
    } catch (err) {
      console.error(`[socket] Помилка обробки події "${name}":`, err.message);
      socket.emit("error", { event: name, message: "Внутрішня помилка сервера" });
      ack?.({ ok: false, error: "server_error" });
    }
  });
};

/**
 * Ініціалізує Socket.io поверх HTTP-сервера.
 *
 * Автентифікація: клієнт передає JWT у handshake.auth.token; коли токен
 * спливає, з'єднання відхиляється ("unauthorized"), клієнт оновлює токен
 * через POST /api/auth/refresh і перепідключається з новим auth.token.
 *
 * Горизонтальне масштабування: якщо заданий REDIS_URL, вмикається
 * Redis-адаптер - події досягають клієнтів, підключених до інших
 * екземплярів сервера (за кількох інстансів потрібні sticky sessions).
 */
export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // --- Автентифікація підключення за JWT ---
  io.use((socket, next) => {
    try {
      socket.user = verifyAccessToken(socket.handshake.auth?.token);
      next();
    } catch {
      wsRejectedTotal.inc();
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.userId;

    wsConnectionsTotal.inc();
    wsConnectionsActive.set(presence.totalSockets() + 1);

    // Особиста кімната для персональних сповіщень
    socket.join(`user:${userId}`);
    socket.join("presence"); // кімната трансляції онлайн-статусів

    const justOnline = presence.connect(userId, socket.id);
    if (justOnline) {
      // Повідомляємо всім підключеним клієнтам, що користувач онлайн
      io.to("presence").emit("presence:update", { userId, online: true });
    }
    socket.emit("presence:list", { onlineUserIds: presence.onlineUserIds() });

    onEvent(socket, "room:join", (room, ack) => {
      if (!isRoomAllowed(room)) {
        socket.emit("error", { event: "room:join", message: `Кімната "${room}" не існує` });
        ack?.({ ok: false, error: "unknown_room" });
        return;
      }
      socket.join(room);
      ack?.({ ok: true });
    });

    onEvent(socket, "room:leave", (room) => socket.leave(room));

    /**
     * Відновлення пропущених подій після перепідключення (рівень 2).
     * Клієнт передає останній отриманий _seq; сервер повертає всі події
     * з історії (event_logs), що стосуються кімнат цього сокета.
     */
    onEvent(socket, "events:sync", async (lastSeq, ack) => {
      const rooms = [...socket.rooms];
      const events = await prismaEventLogSync(lastSeq, rooms);
      events.forEach((row) => {
        socket.emit(row.type, {
          ...row.payload,
          _type: row.type,
          _room: row.room,
          _seq: row.id,
          _at: row.createdAt,
        });
        wsEventsTotal.inc({ event: row.type, direction: "out" });
      });
      ack?.({ ok: true, count: events.length });
    });

    socket.on("disconnect", () => {
      const wentOffline = presence.disconnect(userId, socket.id);
      wsConnectionsActive.set(presence.totalSockets());
      if (wentOffline) {
        io.to("presence").emit("presence:update", { userId, online: false });
      }
    });
  });

  // --- Горизонтальне масштабування через Redis-адаптер (рівень 3) ---
  if (process.env.REDIS_URL) {
    Promise.all([
      import("@socket.io/redis-adapter"),
      import("ioredis"),
    ])
      .then(([{ createAdapter }, { default: Redis }]) => {
        // Адаптеру потрібні два з'єднання: pub і sub.
        // Обробник error обов'язковий, інакше ioredis попереджає про
        // некеровану помилку при розриві з'єднання
        const onError = (client) => (err) =>
          console.error(`[socket] Помилка Redis-адаптера (${client}):`, err.message);
        adapterClients.pub = new Redis(process.env.REDIS_URL).on("error", onError("pub"));
        adapterClients.sub = new Redis(process.env.REDIS_URL).on("error", onError("sub"));
        io.adapter(createAdapter(adapterClients.pub, adapterClients.sub));
        console.log("[socket] Redis-адаптер увімкнено (горизонтальне масштабування)");
      })
      .catch((err) => console.error("[socket] Redis-адаптер не запущено:", err.message));
  }

  setIo(io); // сервіс подій тепер може розсилати події з будь-якого контролера
  return io;
}

// З'єднання Redis-адаптера (для коректного закриття при зупинці сервера)
const adapterClients = { pub: null, sub: null };

export const closeSocketAdapter = async () => {
  // quit() може зависнути на очікуванні відповідей, тому після нього гарантовано
  // розриваємо TCP-з'єднання через disconnect()
  await Promise.all([
    adapterClients.pub?.quit().catch(() => {}),
    adapterClients.sub?.quit().catch(() => {}),
  ]);
  adapterClients.pub?.disconnect();
  adapterClients.sub?.disconnect();
  adapterClients.pub = null;
  adapterClients.sub = null;
};

const prismaEventLogSync = (lastSeq, rooms) =>
  prisma.eventLog.findMany({
    where: {
      id: { gt: Number(lastSeq) || 0 },
      room: { in: rooms },
    },
    orderBy: { id: "asc" },
    take: 100, // за один раз віддаємо щонайбільше 100 подій, решта - наступним events:sync
  });
