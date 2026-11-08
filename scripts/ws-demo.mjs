// Демонстрація WebSocket-функціональності.
//
// Запуск у окремому терміналі (сервер має бути запущений: npm run dev):
//   node --env-file=.env scripts/ws-demo.mjs
//
// Перед першим запуском потрібні тестові дані:
//   npm run db:seed
//
// Скрипт показує: відхилення підключення без токена, кімнати, події
// реального часу (рух товару), онлайн-статус, персональні сповіщення
// та відновлення пропущених подій (events:sync).
import { io } from "socket.io-client";

const API = process.env.API_URL || "http://localhost:3000";

const label = (who, event, data) => {
  const payload = data === undefined ? "" : " " + JSON.stringify(data).slice(0, 130);
  console.log(`  [${who}] ← ${event}${payload}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = (emitter, event, timeoutMs = 10000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Не дочекався події "${event}"`)), timeoutMs);
    emitter.once(event, (...args) => {
      clearTimeout(timer);
      resolve(args);
    });
  });

const login = async (email, password) => {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Не вдалося увійти як ${email} (HTTP ${res.status}). Запусти npm run db:seed`);
  const body = await res.json();
  return body.tokens.accessToken;
};

const api = (token) => ({
  get: (path) => fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
  post: (path, data) =>
    fetch(`${API}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) })),
  del: (path) => fetch(`${API}${path}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).then((r) => r.status),
});

console.log(`=== Демонстрація WebSocket (Socket.io): ${API} ===\n`);

// --- 0. Автентифікація підключень ---
console.log("0) Спроба підключення БЕЗ токена (очікуємо відхилення 'unauthorized'):");
const anonymous = io(API, { reconnection: false });
anonymous.on("connect_error", (err) => console.log(`  [анонім] ← connect_error: ${err.message}\n`));
await waitFor(anonymous, "connect_error");
anonymous.close();

// --- 1. Логін двох користувачів і підключення ---
const adminToken = await login("admin@warehouse.com", "Admin123");
const workerToken = await login("worker@warehouse.com", "Worker123");
console.log("1) Токени отримано (admin + worker), підключаємо клієнтів...");

const admin = io(API, { auth: { token: adminToken } });
const worker = io(API, { auth: { token: workerToken } });

// Останній отриманий _seq (потрібен для events:sync)
let lastSeq = 0;

// Онлайн-статус і всі події виводяться в консоль
admin.onAny((e, d) => {
  if (d && typeof d === "object" && d._seq) lastSeq = Math.max(lastSeq, d._seq);
  label("ADMIN", e, d);
});
worker.onAny((e, d) => label("WORKER", e, d));

await waitFor(admin, "connect");
await waitFor(worker, "connect");
console.log("  Обидва підключені; особисті кімнати user:<id> приєднано автоматично.");
console.log("  (вище видно presence:update / presence:list - онлайн-статус)\n");

// --- 2. Кімнати ---
const warehouses = await api(adminToken).get("/api/warehouses?limit=1");
const warehouse = warehouses.data[0];
console.log(`2) Приєднуємось до кімнати "warehouse:${warehouse.id}" (склад "${warehouse.name}")...`);
const joinA = await admin.emitWithAck("room:join", `warehouse:${warehouse.id}`);
const joinW = await worker.emitWithAck("room:join", `warehouse:${warehouse.id}`);
console.log(`   room:join → admin: ${JSON.stringify(joinA)}, worker: ${JSON.stringify(joinW)}\n`);
await sleep(300);

// --- 3. Подія реального часу: рух товару ---
const products = await api(adminToken).get("/api/products?limit=1");
const product = products.data[0];
console.log(`3) Реєструємо надходження "${product.name}" (id=${product.id}) на склад "${warehouse.name}"...`);
const movement = await api(adminToken).post("/api/movements", {
  type: "INBOUND",
  productId: product.id,
  warehouseId: warehouse.id,
  quantity: 1,
});
if (movement.status !== 201) throw new Error(`Помилка створення руху: ${JSON.stringify(movement.body)}`);
await sleep(1500);
console.log("  (вище кожен клієнт у кімнаті складу отримав stock:updated і movement:created)\n");

// --- 4. Відновлення пропущених подій (events:sync) ---
console.log("4) Третій клієнт підключається і 'доганяє' пропущені події через events:sync...");
const latecomer = io(API, { auth: { token: adminToken } });
latecomer.onAny((e, d) => label("LATECOMER", e, d));
await waitFor(latecomer, "connect");
await latecomer.emitWithAck("room:join", `warehouse:${warehouse.id}`);
const seq = Math.max(0, lastSeq - 2); // "останній seq, який клієнт бачив" - два кроки тому
const ack = await latecomer.emitWithAck("events:sync", seq);
console.log(`  events:sync(${seq}) → сервер повернув ${ack.count} пропущених подій (вище)\n`);
latecomer.close();

// --- 5. Низький залишок → персональне сповіщення ---
console.log("5) Створюємо товар з minStock=100 і оприбутковуємо лише 10 одиниць...");
const categories = await api(adminToken).get("/api/categories?limit=1");
const created = await api(adminToken).post("/api/products", {
  sku: `WS-DEMO-${Date.now()}`,
  name: "Демо-товар для сповіщення",
  price: 100,
  categoryId: categories.data[0].id,
  minStock: 100,
});
if (created.status !== 201) throw new Error(`Помилка створення товару: ${JSON.stringify(created.body)}`);
const demoProduct = created.body;
console.log(`   Товар "${demoProduct.name}" (id=${demoProduct.id}) створено, залишок 10 < 100...`);
await api(adminToken).post("/api/movements", { type: "INBOUND", productId: demoProduct.id, warehouseId: warehouse.id, quantity: 10 });
await waitFor(admin, "notification").then(([n]) => {
  console.log("  Очікуємо персональне сповіщення (йде через чергу фонових задач):");
  label("ADMIN", "notification", n);
});
await sleep(500);

// Прибираємо демо-товар
await api(adminToken).del(`/api/products/${demoProduct.id}`);

console.log("\n=== Кінець демонстрації ===");
admin.close();
worker.close();
process.exit(0);
