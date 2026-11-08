// Обмеження частоти подій WebSocket (рівень 3): алгоритм "токенне відро".
// Кожен сокет отримує відро на WS_RATE_LIMIT_EVENTS подій,
// яке наповнюється рівномірно протягом WS_RATE_LIMIT_WINDOW_MS.
// Це захищає сервер від клієнта, який спамить подіями (room:join, events:sync тощо).

const buckets = new Map(); // socketId -> { tokens, lastRefill }

let limit = Number(process.env.WS_RATE_LIMIT_EVENTS) || 30;
let windowMs = Number(process.env.WS_RATE_LIMIT_WINDOW_MS) || 1000;

// Періодичне очищення buckets відключених сокетів, щоб Map не ріс необмежено
const cleanup = setInterval(() => {
  const cutoff = Date.now() - windowMs * 10;
  for (const [id, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) buckets.delete(id);
  }
}, 60_000);
cleanup.unref(); // не тримаємо процес Node живим лише заради таймера

/**
 * Перевіряє, чи дозволена чергова подія для сокета.
 * @returns {boolean} true - подія пропускається, false - ліміт вичерпано
 */
export const checkRateLimit = (socketId) => {
  const now = Date.now();
  let bucket = buckets.get(socketId);

  if (!bucket) {
    bucket = { tokens: limit, lastRefill: now };
    buckets.set(socketId, bucket);
  }

  // Наповнюємо відро пропорційно до часу, що минув
  const refill = ((now - bucket.lastRefill) / windowMs) * limit;
  bucket.tokens = Math.min(limit, bucket.tokens + refill);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
};
