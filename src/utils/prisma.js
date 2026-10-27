const { PrismaClient } = require("@prisma/client");

// Один спільний екземпляр клієнта на весь застосунок (один пул з'єднань)
const prisma = new PrismaClient();

module.exports = prisma;
