import client from "prom-client";

// Єдиний реєстр метрик Prometheus для всього застосунку.
// Ендпоінт GET /metrics віддає їх у форматі, який читають Prometheus/Grafana.
export const register = new client.Registry();

// Базові метрики процесу Node.js (пам'ять, CPU, event loop lag тощо)
client.collectDefaultMetrics({ register });

// --- HTTP ---
export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Загальна кількість HTTP-запитів",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Тривалість обробки HTTP-запитів",
  labelNames: ["method", "route"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// --- WebSocket ---
export const wsConnectionsActive = new client.Gauge({
  name: "ws_connections_active",
  help: "Кількість активних WebSocket-з'єднань",
  registers: [register],
});

export const wsConnectionsTotal = new client.Counter({
  name: "ws_connections_total",
  help: "Загальна кількість встановлених WebSocket-з'єднань",
  registers: [register],
});

export const wsEventsTotal = new client.Counter({
  name: "ws_events_total",
  help: "Кількість WebSocket-подій",
  labelNames: ["event", "direction"], // direction: in | out
  registers: [register],
});

export const wsRejectedTotal = new client.Counter({
  name: "ws_rejected_total",
  help: "Кількість відхилених WebSocket-підключень (невалідний токен)",
  registers: [register],
});

export const wsRateLimitedTotal = new client.Counter({
  name: "ws_rate_limited_total",
  help: "Кількість подій, відкинутих лімітом частоти",
  registers: [register],
});

// --- Кеш ---
export const cacheHitsTotal = new client.Counter({
  name: "cache_hits_total",
  help: "Кількість влучань у кеш",
  registers: [register],
});

export const cacheMissesTotal = new client.Counter({
  name: "cache_misses_total",
  help: "Кількість промахів кешу",
  registers: [register],
});

// --- База даних ---
export const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Тривалість SQL-запитів до бази даних",
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

// --- Черги фонових задач ---
export const queueJobsTotal = new client.Counter({
  name: "queue_jobs_total",
  help: "Кількість фонових задач",
  labelNames: ["job", "status"], // status: completed | failed
  registers: [register],
});

/**
 * Express-middleware: вимірює тривалість і лічильник запитів.
 * Маршрут береться з req.route.path (після обробки), щоб у мітки
 * потрапляв шаблон (/api/products/:id), а не конкретна адреса.
 */
export const metricsMiddleware = (req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.originalUrl.split("?")[0];
    httpRequestsTotal.inc({ method: req.method, route, status: res.statusCode });
    end({ method: req.method, route });
  });
  next();
};
