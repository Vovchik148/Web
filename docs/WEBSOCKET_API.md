# WebSocket API (Socket.io)

## Загальні відомості

Застосунок використовує **Socket.io 4** поверх протоколу WebSocket для обміну даними в реальному часі. Клієнтська частина підключається бібліотекою `socket.io-client` (звичайний браузерний `WebSocket` **не підійде** — Socket.io використовує власний протокол поверх WebSocket).

- **URL підключення:** той самий адреса, що й REST API, наприклад `http://localhost:3000`
- **Шлях:** `/socket.io` (стандартний для Socket.io)
- **Автентифікація:** JWT access-токен у `auth.token` під час handshake
- **Fallback:** якщо WebSocket недоступний, Socket.io автоматично переходить на HTTP long-polling

## Підключення

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: accessToken }, // JWT з POST /api/auth/login
  reconnection: true,
});

socket.on('connect', () => console.log('підключено', socket.id));
socket.on('connect_error', (err) => {
  if (err.message === 'unauthorized') {
    // Токен сплив або невалідний: оновлюємо через POST /api/auth/refresh
    // і перепідключаємося з новим auth.token
  }
});
```

### Автентифікація

- Токен перевіряється **один раз при встановленні з'єднання** (`io.use(...)` у `src/socket/index.js`);
- Невалідний/відсутній токен → з'єднання відхиляється з помилкою `unauthorized`;
- Коли access-токен спливає **під час активного з'єднання**, з'єднання НЕ розривається (Socket.io не перевіряє токен повторно), але при наступному перепідключенні клієнт мусить передати свіжий токен;
- Отже, клієнтська логіка: перехопити `connect_error: unauthorized` → `POST /api/auth/refresh` → перепідключитися з новим токеном.

## Кімнати (rooms)

| Кімната | Хто приєднується | Що транслюється |
|---|---|---|
| `user:<userId>` | автоматично кожному | персональні сповіщення (`notification`), персональні події |
| `presence` | автоматично кожному | онлайн-статуси (`presence:update`, `presence:list`) |
| `products` | за запитом | зміни каталогу товарів |
| `categories` | за запитом | зміни категорій |
| `suppliers` | за запитом | зміни постачальників |
| `warehouses` | за запитом | зміни складів |
| `warehouse:<id>` | за запитом | залишки та рухи конкретного складу |

Приєднання/від'єднання за запитом (з підтвердженням — acknowledgement):

```javascript
socket.emit('room:join', 'warehouse:1', (res) => {
  // res = { ok: true } або { ok: false, error: 'unknown_room' }
});
socket.emit('room:leave', 'warehouse:1');
```

До невідомих кімнат приєднатися не можна (білий список шаблонів на сервері).

## Події сервер → клієнт

Кожна подія даних містить службові поля:

| Поле | Опис |
|---|---|
| `_seq` | порядковий номер події в історії (`event_logs.id`) — використовується для `events:sync` |
| `_type` | тип події, наприклад `stock:updated` |
| `_room` | кімната, в яку розіслано подію |
| `_at` | ISO-час виникнення |

### `product:created` / `product:updated` / `product:deleted`

Розсилка в кімнату `products` при зміні каталогу через REST API.

```javascript
socket.on('product:updated', (product) => {
  // { id, sku, name, price, totalQuantity, ..., _seq }
});
```

`product:deleted` містить лише `{ id, sku, _seq, ... }`.

### `category:created|updated|deleted`, `supplier:created|updated|deleted`, `warehouse:created|updated|deleted`

Аналогічно, у кімнатах `categories` / `suppliers` / `warehouses`.

### `stock:updated`

Кімната `warehouse:<id>`. Приходить після кожної операції з руху товару:

```javascript
socket.on('stock:updated', (stock) => {
  // { productId, warehouseId, quantity, updatedAt, _seq }
});
```

### `movement:created`

Кімната `warehouse:<id>`. Нова операція журналу руху (з даними product, warehouse, user):

```javascript
socket.on('movement:created', (movement) => {
  // { id, type, quantity, note, product, warehouse, user, createdAt, _seq }
});
```

### `notification`

Кімната `user:<id>` — персональні сповіщення (низький залишок, системні тощо):

```javascript
socket.on('notification', (n) => {
  // {
  //   type: 'LOW_STOCK' | 'MOVEMENT' | 'SYSTEM' | 'PRODUCT',
  //   priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL',
  //   title, message, data, _seq
  // }
});
```

Сповіщення зберігаються в БД (таблиця `notifications`) і доступні через REST `/api/notifications` навіть коли користувач був офлайн. Пріоритет `CRITICAL` означає порожній залишок товару.

### `presence:update` / `presence:list`

```javascript
socket.on('presence:update', ({ userId, online }) => {
  // користувач вийшов у мережу або повністю від'єднався
});
socket.on('presence:list', ({ onlineUserIds }) => {
  // повний список онлайн-користувачів, надсилається при підключенні
});
```

### `error`

Обробка помилок подій: невідома кімната, помилка обробки, перевищення ліміту частоти.

```javascript
socket.on('error', ({ event, message }) => { /* ... */ });
```

## Події клієнт → сервер

| Подія | Аргументи | Ack-відповідь |
|---|---|---|
| `room:join` | `(room: string)` | `{ ok: true }` / `{ ok: false, error }` |
| `room:leave` | `(room: string)` | — |
| `events:sync` | `(lastSeq: number)` | `{ ok: true, count }` + події в порядку зростання `_seq` |

### Відновлення пропущених подій після перепідключення

Socket.io перепідключається автоматично, але події, що сталися офлайн, загублені. Механізм відновлення:

1. Клієнт зберігає останній отриманий `_seq` (наприклад, у localStorage);
2. Після події `connect` (включно з reconnect) клієнт викликає `events:sync` з цим `_seq`;
3. Сервер повертає до 100 пропущених подій тих кімнат, у яких клієнт зараз перебуває, у порядку `_seq`;
4. Якщо пропущено більше 100 подій — повторити `events:sync` з останнім `_seq` отриманої партії.

```javascript
socket.on('connect', async () => {
  const lastSeq = Number(localStorage.getItem('lastSeq') || 0);
  socket.emit('events:sync', lastSeq, (res) => console.log('відновлено подій:', res.count));
});

socket.onAny((eventName, payload) => {
  if (payload && typeof payload === 'object' && payload._seq) {
    localStorage.setItem('lastSeq', String(payload._seq));
  }
});
```

## Обмеження частоти (rate limiting)

Події клієнт → сервер лімітуються алгоритмом «токенного відра»: за замовчуванням **30 подій на секунду** на кожне з'єднання (`WS_RATE_LIMIT_EVENTS`, `WS_RATE_LIMIT_WINDOW_MS` у `.env`). При перевищенні:

- подія відкидається;
- клієнт отримує подію `error` з повідомленням «Забагато подій»;
- ack-виклики отримують `{ ok: false, error: 'rate_limited' }`.

## Метрики та моніторинг

Стан WebSocket-модуля експортується в Prometheus на `GET /metrics`:

- `ws_connections_active` — активні з'єднання;
- `ws_connections_total` — всього підключень;
- `ws_events_total{event,direction}` — події в обидва боки;
- `ws_rejected_total` — відхилені з'єднання (невалідний токен);
- `ws_rate_limited_total` — події, відкинуті лімітом.

## Горизонтальне масштабування

Якщо заданий `REDIS_URL`, увімкається **Redis-адаптер** (`@socket.io/redis-adapter`): розсилки `io.to(room).emit(...)` транслируються через Redis pub/sub, тож клієнти, підключені до різних екземплярів сервера, отримують ті самі події. За кількох екземплярів обов'язкові **sticky sessions** (див. [docs/DEPLOYMENT.md](DEPLOYMENT.md)).

Онлайн-статус (presence) і rate limiting на рівні 3 реалізації — у пам'яті процесу: за кількох екземплярів їх треба переносити в Redis (для presence — зберігати `userId → sockets` у Redis, для ліміту — token bucket у Lua-скрипті). Це зафіксовано як відоме обмеження архітектури.
