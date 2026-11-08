import { createServer } from "node:http";
import app from "./app.js";
import config from "./utils/config.js";
import { prisma } from "./db.js";
import { initSocket, closeSocketAdapter } from "./socket/index.js";
import { closeQueue } from "./services/queue.js";
import { closeRedis } from "./utils/cache.js";

const PORT = config.port || 3000;

// Socket.io підключається не до app, а до HTTP-сервера, тому створюємо його явно
const httpServer = createServer(app);

// Доступ до io з будь-якого контролера: req.app.get('io') або services/realtime.js
app.set("io", initSocket(httpServer));

httpServer.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`);
  console.log(`Документація API: http://localhost:${PORT}/api-docs`);
  console.log(`Метрики: http://localhost:${PORT}/metrics`);
});

// Коректне завершення: закриваємо HTTP-сервер і Socket.io, чергу та Prisma
const shutdown = () => {
  const io = app.get("io");
  io.close(); // розриваємо всі WebSocket-з'єднання
  httpServer.close(async () => {
    await closeSocketAdapter();
    await closeQueue();
    await closeRedis();
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
