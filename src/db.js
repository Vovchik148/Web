import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.ts';
import { dbQueryDuration } from './utils/metrics.js';

// PRISMA_QUERY_LOG=1 - журналювання кожного SQL-запиту з часом виконання.
// Використовується для пошуку повільних запитів (які потім аналізуються
// через EXPLAIN ANALYZE у psql), у production вимикається.
const logQueries = process.env.PRISMA_QUERY_LOG === "1";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  ...(logQueries ? { log: [{ emit: "event", level: "query" }] } : {}),
});

if (logQueries) {
  prisma.$on("query", (e) => {
    console.log(`[sql] ${e.duration}ms ${e.query}`);
    dbQueryDuration.observe(e.duration / 1000);
  });
}
