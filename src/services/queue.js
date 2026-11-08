import { queueJobsTotal } from "../utils/metrics.js";
import { getRedis } from "../utils/cache.js";

// Система черг для фонових задач (BullMQ поверх Redis).
//
// Навіщо: важкі/некритичні дії (розсилка сповіщень багатьом користувачам,
// надсилання email) виконуються поза HTTP-запитом - клієнт не чекає на них,
// а тимчасові збої не ламають основну операцію.
//
// Без Redis (не заданий REDIS_URL) черга деградує чесно:
// задачі виконуються одразу у фоні того ж процесу.

const QUEUE_NAME = "background";

const handlers = new Map(); // назва задачі -> обробник
let queue = null;
let worker = null;
let initTried = false;

/**
 * Реєструє обробник фонової задачі. Викликається сервісами при імпорті.
 * @param {string} name - назва задачі, наприклад "notification.batch"
 * @param {(data: object) => Promise<void>} handler
 */
export const registerJob = (name, handler) => {
  handlers.set(name, handler);
};

const initQueue = () => {
  if (initTried || queue) return;
  initTried = true;

  const connection = getRedis();
  if (!connection) return; // без Redis BullMQ не піднімаємо

  Promise.all([import("bullmq")])
    .then(([{ Queue, Worker }]) => {
      queue = new Queue(QUEUE_NAME, { connection });

      // Воркер у тому ж процесі: для лабораторної роботи цього достатньо,
      // за потреби воркер виноситься в окремий процес без зміни коду задач
      worker = new Worker(
        QUEUE_NAME,
        async (job) => {
          const handler = handlers.get(job.name);
          if (!handler) throw new Error(`Немає обробника задачі "${job.name}"`);
          await handler(job.data);
          queueJobsTotal.inc({ job: job.name, status: "completed" });
        },
        { connection },
      );

      worker.on("failed", (job, err) => {
        queueJobsTotal.inc({ job: job?.name ?? "unknown", status: "failed" });
        console.error(`[queue] Задача "${job?.name}" не вдалася:`, err.message);
      });

      console.log("[queue] Черга BullMQ запущена");
    })
    .catch((err) => console.error("[queue] Не вдалося ініціалізувати BullMQ:", err.message));
};

/**
 * Ставить задачу в чергу. Коли Redis недоступний - виконує її одразу у фоні.
 * Ніколи не кидає виняток: фонові задачі не повинні ламати основну операцію.
 */
export const enqueue = async (name, data) => {
  const handler = handlers.get(name);
  if (!handler) {
    console.error(`[queue] Спроба поставити задачу без обробника: "${name}"`);
    return;
  }

  initQueue();

  if (queue) {
    try {
      await queue.add(name, data, {
        attempts: 3, // повторні спроби при збої
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      });
      return;
    } catch (err) {
      console.error(`[queue] Не вдалося додати задачу "${name}", виконую одразу:`, err.message);
    }
  }

  // Fallback без черги: виконуємо в фоні, помилки лише логуємо
  handler(data).catch((err) => {
    queueJobsTotal.inc({ job: name, status: "failed" });
    console.error(`[queue] Задача "${name}" не вдалася:`, err.message);
  });
};

/** Коректне закриття черги при зупинці сервера */
export const closeQueue = async () => {
  if (worker) await worker.close();
  if (queue) await queue.close();
};
