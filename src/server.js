import app from "./app.js";
import config from "./utils/config.js";
import { prisma } from "./db.js";

const PORT = config.port || 3000;

const server = app.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`);
  console.log(`Документація API: http://localhost:${PORT}/api-docs`);
});

// Коректне завершення: закриваємо сервер і відключаємо Prisma
const shutdown = () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
