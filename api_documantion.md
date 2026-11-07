# Warehouse Inventory API — документація

**Base URL:** `http://localhost:3000`  
**Формат:** JSON. Усі ендпоінти, окрім `/api/health` та публічних auth-ендпоінтів, вимагають заголовок:

```
Authorization: Bearer <token>
```

> Грошові поля (`price`) Prisma повертає як рядок (`"245.50"`) — так зберігається точність Decimal.

## Rate limiting (п. 5)

- **Загальний ліміт API:** 100 запитів за 15 хвилин на IP (усі маршрути `/api/`).
- **Суворий ліміт автентифікації:** `AUTH_RATE_LIMIT_MAX` (за замовчуванням **20**) запитів за `AUTH_RATE_LIMIT_WINDOW_MINUTES` (за замовчуванням **15**) хвилин на IP для `/api/auth/*` — захист від підбору паролів.

Значення налаштовуються в `.env`. При перевищенні повертається `429` із заголовками `RateLimit-*`.

## Пагінація

Списки приймають `?page=1&limit=10` (limit ≤ 100) та повертають:

```json
{ "data": [ ... ], "pagination": { "page": 1, "limit": 10, "total": 25, "pages": 3 } }
```

---

## Службові

| Метод | URL | Опис |
|---|---|---|
| GET | `/` | Інформація про API |
| GET | `/api/health` | Перевірка сервера та з'єднання з БД |

## Автентифікація — `/api/auth`

| Метод | URL | Доступ | Опис |
|---|---|---|---|
| POST | `/api/auth/register` | публічно | Реєстрація (роль `WORKER`) |
| POST | `/api/auth/login` | публічно | Вхід, повертає JWT (або запит коду 2FA) |
| POST | `/api/auth/refresh` | публічно | Ротація refresh-токена |
| POST | `/api/auth/logout` | публічно | Відкликання refresh-токена |
| POST | `/api/auth/forgot-password` | публічно | Запит листа для відновлення пароля |
| POST | `/api/auth/reset-password` | публічно | Скидання пароля за одноразовим токеном |
| POST | `/api/auth/2fa/setup` | авторизований | Крок 1 увімкнення 2FA (секрет + QR-код) |
| POST | `/api/auth/2fa/enable` | авторизований | Крок 2 увімкнення 2FA (підтвердження кодом) |
| POST | `/api/auth/2fa/disable` | авторизований | Вимкнути 2FA |
| POST | `/api/auth/2fa/verify` | публічно | Другий крок входу — код 2FA |
| GET | `/api/auth/github` | публічно | Вхід через GitHub (редирект) |
| GET | `/api/auth/github/callback` | GitHub | Callback OAuth |
| GET | `/api/auth/profile` | авторизований | Поточний користувач |
| PUT | `/api/auth/profile` | авторизований | Змінити `firstName`, `lastName` |
| PUT | `/api/auth/change-password` | авторизований | Змінити пароль |

**POST /api/auth/register**
```json
{ "email": "new@example.com", "password": "Password123", "firstName": "Іван", "lastName": "Іваненко" }
```
Пароль: 6–72 символи, мала + велика літера + цифра. Відповідь `201`:
```json
{ "message": "Користувача зареєстровано", "user": { "id": 4, "email": "new@example.com", "role": "WORKER", "...": "..." }, "token": "eyJhbGci..." }
```

**POST /api/auth/login**
```json
{ "email": "admin@warehouse.com", "password": "Admin123" }
```

**PUT /api/auth/change-password**
```json
{ "currentPassword": "Admin123", "newPassword": "NewPassword456" }
```

## Користувачі — `/api/users` (лише ADMIN)

| Метод | URL | Опис |
|---|---|---|
| GET | `/api/users?role=WORKER&search=ivan` | Список користувачів |
| PUT | `/api/users/:id` | Змінити `role` та/або `isActive` (не можна для себе) |

```json
{ "role": "MANAGER", "isActive": true }
```

## Категорії — `/api/categories`

| Метод | URL | Доступ |
|---|---|---|
| GET | `/api/categories?search=` | усі авторизовані |
| GET | `/api/categories/:id` | усі авторизовані |
| POST | `/api/categories` | ADMIN, MANAGER |
| PUT | `/api/categories/:id` | ADMIN, MANAGER |
| DELETE | `/api/categories/:id` | ADMIN |

```json
{ "name": "Електроніка", "description": "Комплектуючі та пристрої" }
```
У відповіді є `productCount`. Видалення категорії з товарами → `409`.

## Постачальники — `/api/suppliers`

Ті самі методи й права, що й у категорій.

```json
{ "name": "ТехПостач", "email": "sales@techpostach.ua", "phone": "+380441234567", "address": "м. Київ, вул. Промислова, 5" }
```
`name` — обов'язкове; `email`, `phone`, `address` — необов'язкові.

## Склади — `/api/warehouses`

Ті самі методи й права.

```json
{ "name": "Центральний склад", "location": "м. Київ, вул. Складська, 1", "capacity": 5000 }
```
`name`, `location` — обов'язкові; `capacity` — необов'язкове (ціле число > 0).

## Товари — `/api/products`

| Метод | URL | Доступ |
|---|---|---|
| GET | `/api/products` | усі авторизовані |
| GET | `/api/products/:id` | усі авторизовані (з розбивкою залишків по складах) |
| POST | `/api/products` | ADMIN, MANAGER |
| PUT | `/api/products/:id` | ADMIN, MANAGER (часткове оновлення) |
| DELETE | `/api/products/:id` | ADMIN |

**Query для GET /api/products:** `page`, `limit`, `search` (назва/SKU), `categoryId`, `supplierId`, `isActive` (true/false), `sortBy` (`name|sku|price|createdAt`), `order` (`asc|desc`).

**POST /api/products**
```json
{
  "sku": "EL-0003",
  "name": "Датчик температури DS18B20",
  "description": "Цифровий датчик",
  "unit": "шт",
  "price": 59.9,
  "minStock": 25,
  "categoryId": 1,
  "supplierId": 1
}
```
Обов'язкові: `sku` (3–30 символів: A–Z, 0–9, дефіс; приводиться до верхнього регістру), `name`, `price` (≥ 0), `categoryId`. У відповіді є `totalQuantity` — сума залишків по всіх складах.

Видалення товару, по якому вже є операції в журналі → `409`. Замість видалення використовуйте `PUT` з `{ "isActive": false }`.

## Залишки — `/api/stock`

| Метод | URL | Опис |
|---|---|---|
| GET | `/api/stock?productId=1&warehouseId=2` | Поточні залишки (товар × склад) |
| GET | `/api/stock/low` | Товари, у яких сумарний залишок < `minStock` (з полем `deficit`) |

## Журнал руху — `/api/movements`

| Метод | URL | Доступ |
|---|---|---|
| GET | `/api/movements` | усі авторизовані |
| GET | `/api/movements/:id` | усі авторизовані |
| POST | `/api/movements` | усі авторизовані |

Фільтри GET: `productId`, `warehouseId`, `userId`, `type`, `from`, `to` (дати ISO 8601), `page`, `limit`.

**POST /api/movements** — реєструє операцію та змінює залишок в одній транзакції.
```json
{ "type": "INBOUND", "productId": 1, "warehouseId": 1, "quantity": 50, "note": "Поставка №123" }
```

| `type` | `quantity` | Дія |
|---|---|---|
| `INBOUND` | ≥ 1 | залишок збільшується |
| `OUTBOUND` | ≥ 1 | залишок зменшується; якщо не вистачає → `409` |
| `ADJUSTMENT` | ≠ 0, зі знаком | коригування (`+5` або `-3`) за результатами інвентаризації |

Журнал **незмінний** (для аудиту): редагування й видалення операцій немає. Помилкову операцію виправляють новою `ADJUSTMENT`.

## Відновлення пароля (п. 1)

**POST /api/auth/forgot-password** — завжди повертає `200`, щоб з відповіді не можна було дізнатися, чи існує email:
```json
{ "email": "admin@warehouse.com" }
```
```json
{ "message": "Якщо email зареєстровано, лист із посиланням для відновлення надіслано" }
```

**POST /api/auth/reset-password** — одноразовий токен із листа діє 15 хвилин, у БД зберігається лише його хеш. Після скидання **відкликаються всі refresh-токени користувача** (усі сесії):
```json
{ "token": "<токен з листа>", "password": "NewPassword456" }
```

> Для розробки використовується тестова скринька **Ethereal**: SMTP-змінні в `.env` не задані → листи не доставляються, а прев'ю виводиться в консоль сервера (`[mailer] Лист збережено в Ethereal, перегляд: ...`). Для реальної пошти задайте `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.

## Двофакторна автентифікація — TOTP (п. 2)

Пакети `otplib` + `qrcode`. Сумісно з Google Authenticator, Authy тощо.

1. **POST /api/auth/2fa/setup** (авторизований) → повертає `secret`, `otpauthUrl` та `qrCodeDataUrl` (data URL для `<img>`). Секрет зберігається, але 2FA ще не активна.
2. **POST /api/auth/2fa/enable** з кодом з аутентифікатора `{ "code": "123456" }` → 2FA увімкнено.
3. **POST /api/auth/2fa/disable** — вимкнення, також потребує чергового кода з аутентифікатора.

**Вхід з увімкненою 2FA** — два кроки:

```
POST /api/auth/login  { "email": "...", "password": "..." }
→ 200 { "twoFactorRequired": true, "tempToken": "eyJ..." }   // токен діє ~5 хв

POST /api/auth/2fa/verify { "tempToken": "eyJ...", "code": "123456" }
→ 200 { "message": "Вхід виконано", "user": {...}, "tokens": {...} }
```

## Вхід через GitHub — OAuth (п. 3)

Без passport, лише `fetch` (Authorization Code). Налаштування:

1. https://github.com/settings/developers → **New OAuth App**.
2. Homepage: `http://localhost:3000`, Callback URL: `http://localhost:3000/api/auth/github/callback`.
3. Додати в `.env`: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (і `APP_URL`).

Потік: `GET /api/auth/github` → редирект на GitHub (з CSRF-станом `state`) → `GET /api/auth/github/callback` → обмін `code` на `access_token` → отримання профілю і email → знаходження/створення користувача (роль `WORKER`; якщо email уже зареєстровано — акаунт прив'язується до нього через `OAuthAccount`) → видача пари JWT → редирект на `FRONTEND_URL/oauth/callback?accessToken=...&refreshToken=...`. При помилці — редирект на `FRONTEND_URL/login?error=...`.

## Файли: багатофайлове завантаження (п. 7)

| Метод | URL | Опис |
|---|---|---|
| POST | `/api/files/upload` | Один файл (поле `file`) |
| POST | `/api/files/upload-multiple` | До 10 файлів (поле `files`) |

```bash
curl -X POST http://localhost:3000/api/files/upload-multiple \
  -H "Authorization: Bearer <token>" \
  -F "files=@a.png" -F "files=@b.pdf" -F "files=@c.jpg"
```
```json
{ "message": "Завантажено файлів: 3", "files": [ { "id": 11, "...": "..." } ] }
```

Ті самі обмеження типу/розміру, що й для одного файлу. Якщо під час запису в БД сталася помилка — **всі вже збережені файли видаляються** (ні файлів, ні записів на диску не залишається).

## Журнал аудиту — `/api/audit-logs` (лише ADMIN)

Кожна значуща дія потрапляє в `audit_logs`: реєстрація, вхід (успішний і невдалий), вихід, зміна/скидання пароля, увімкнення/вимкнення 2FA, OAuth-вхід, створення/оновлення/видалення товарів, завантаження/видалення файлів.

| Метод | URL | Опис |
|---|---|---|
| GET | `/api/audit-logs` | Список з пагінацією `?page=&limit=` та фільтрами |

**Фільтри:** `userId`, `action` (пошук, напр. `auth.`), `entity` (`user`, `product`, `file`), `entityId`, `from`, `to` (ISO 8601).

```json
{
  "data": [
    {
      "id": 12,
      "userId": 1,
      "action": "product.create",
      "entity": "product",
      "entityId": "5",
      "ip": "::1",
      "details": { "sku": "EL-0003", "name": "Датчик температури DS18B20" },
      "createdAt": "2026-11-07T10:00:00.000Z",
      "user": { "email": "admin@warehouse.com", "firstName": "Олена", "lastName": "Адмінчук" }
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 }
}
```

## Детальні дозволи (п. 6)

Замість перевірки ролей (`authorize("ADMIN", "MANAGER")`) частина маршрутів використовує дозволи `"<сутність>:<операція>"` (`src/config/permissions.js`, middleware `requirePermission`). Замінено: `/api/products` (POST/PUT/DELETE) та `/api/users` (GET/PUT), `/api/audit-logs`.

| Дозвіл | WORKER | MANAGER | ADMIN |
|---|---|---|---|
| `products:read` | ✅ | ✅ | ✅ |
| `products:write` | — | ✅ | ✅ |
| `products:delete` | — | — | ✅ |
| `stock:read` / `stock:write` | ✅ | ✅ | ✅ |
| `catalog:write` (категорії/постачальники/склади) | — | ✅ | ✅ |
| `catalog:delete` | — | — | ✅ |
| `files:read` / `files:write` | ✅ | ✅ | ✅ |
| `files:delete` | — | ✅ | ✅ |
| `users:read` / `users:manage` | — | — | ✅ |
| `audit:read` | — | — | ✅ |

Додавання нової ролі або зміна прав — лише в одній мапі `ROLE_PERMISSIONS`.

## Коди відповідей

| Код | Значення |
|---|---|
| 200 / 201 / 204 | Успіх / створено / видалено |
| 400 | Помилка валідації |
| 401 | Немає або недійсний токен / невірний код 2FA |
| 403 | Недостатньо прав |
| 404 | Не знайдено |
| 409 | Конфлікт (дублікат, недостатньо залишку, запис використовується) |
| 429 | Перевищено ліміт запитів (rate limiting) |
| 500 | Внутрішня помилка сервера |

## Приклади curl

```bash
# Вхід
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@warehouse.com","password":"Manager123"}'

# Список товарів (підставте свій токен)
curl "http://localhost:3000/api/products?search=esp&sortBy=price&order=asc" \
  -H "Authorization: Bearer <token>"

# Надходження товару
curl -X POST http://localhost:3000/api/movements \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"type":"INBOUND","productId":1,"warehouseId":1,"quantity":50,"note":"Поставка"}'

# Відвантаження більше, ніж є -> 409
curl -X POST http://localhost:3000/api/movements \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"type":"OUTBOUND","productId":1,"warehouseId":1,"quantity":999999}'
```
