import { cacheHitsTotal, cacheMissesTotal } from "./metrics.js";

// Кеш з TTL для даних, які рідко змінюються.
//
// Два рівні:
// - REDIS_URL заданий  -> Redis (працює і за кількох екземплярів сервера);
// - Redis недоступний  -> кеш у пам'яті процесу (Map + час життя запису).
//
// Інвалідація: при кожній зміні даних контролер видаляє ключі префікса
// (наприклад "category:list*"), тому застарілі значення не віддаються.

const memoryStore = new Map(); // key -> { value, expiresAt }

let redis = null;
let connecting = false;

/**
 * Єдине підключення до Redis для всього застосунку (кеш, черги).
 * Якщо REDIS_URL не заданий або Redis недоступний - повертає null,
 * і всі механізми коректно працюють без нього.
 */
export const getRedis = () => {
  if (!process.env.REDIS_URL) return null;
  if (redis) return redis;
  if (connecting) return null;
  connecting = true;

  // Динамічний імпорт, щоб без REDIS_URL ioredis взагалі не ініціалізувався
  import("ioredis")
    .then(({ default: Redis }) => {
      redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 2,
        lazyConnect: false,
      });
      redis.on("error", (err) => console.error("[redis] Помилка з'єднання:", err.message));
      console.log("[redis] Підключено за адресою", process.env.REDIS_URL);
    })
    .catch((err) => console.error("[redis] Не вдалося завантажити ioredis:", err.message));

  return null; // перші виклики йдуть у пам'ять, Redis підхопить наступні
};

const fromMemory = (key) => {
  const entry = memoryStore.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return undefined;
  }
  return entry.value;
};

const toMemory = (key, value, ttlSec) => {
  // Обмежуємо розмір кешу в пам'яті, щоб не зростав безмежно
  if (memoryStore.size > 500) {
    const oldest = memoryStore.keys().next().value;
    memoryStore.delete(oldest);
  }
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
};

/** Закриває Redis-з'єднання (використовується при зупинці сервера та в тестах) */
export const closeRedis = async () => {
  if (redis) {
    await redis.quit().catch(() => redis.disconnect());
    redis = null;
  }
};

export const cache = {
  async get(key) {
    const r = getRedis();
    if (r) {
      try {
        const raw = await r.get(key);
        if (raw === null) {
          cacheMissesTotal.inc();
          return undefined;
        }
        cacheHitsTotal.inc();
        return JSON.parse(raw);
      } catch {
        // Redis впав - деградуємо до пам'яті
      }
    }
    const value = fromMemory(key);
    value === undefined ? cacheMissesTotal.inc() : cacheHitsTotal.inc();
    return value;
  },

  async set(key, value, ttlSec = 60) {
    const r = getRedis();
    if (r) {
      try {
        await r.set(key, JSON.stringify(value), "EX", ttlSec);
        return;
      } catch {
        // впали в пам'ять нижче
      }
    }
    toMemory(key, value, ttlSec);
  },

  async del(key) {
    memoryStore.delete(key);
    const r = getRedis();
    if (r) {
      try {
        await r.del(key);
      } catch {
        /* ігноруємо */
      }
    }
  },

  /** Видаляє всі ключі з префіксом, наприклад "product:list" -> "product:list:*" */
  async delPrefix(prefix) {
    for (const key of memoryStore.keys()) {
      if (key.startsWith(prefix)) memoryStore.delete(key);
    }
    const r = getRedis();
    if (r) {
      try {
        // SCAN, а не KEYS: не блокує Redis на великих обсягах
        let cursor = "0";
        do {
          const [next, keys] = await r.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
          cursor = next;
          if (keys.length) await r.del(...keys);
        } while (cursor !== "0");
      } catch {
        /* ігноруємо */
      }
    }
  },

  /**
   * Головний спосіб використання: повертає значення з кешу,
   * за промахом - викликає fetchFn, зберігає результат і повертає його.
   */
  async wrap(key, ttlSec, fetchFn) {
    const cached = await this.get(key);
    if (cached !== undefined) return cached;
    const value = await fetchFn();
    await this.set(key, value, ttlSec);
    return value;
  },
};

export default cache;
