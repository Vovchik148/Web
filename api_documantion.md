# Warehouse Inventory API — документація

**Base URL:** `http://localhost:3000`  
**Формат:** JSON. Усі ендпоінти, окрім `/api/health`, `/api/auth/register`, `/api/auth/login`, вимагають заголовок:

```
Authorization: Bearer <token>
```

> Грошові поля (`price`) Prisma повертає як рядок (`"245.50"`) — так зберігається точність Decimal.

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
| POST | `/api/auth/login` | публічно | Вхід, повертає JWT |
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

## Коди відповідей

| Код | Значення |
|---|---|
| 200 / 201 / 204 | Успіх / створено / видалено |
| 400 | Помилка валідації |
| 401 | Немає або недійсний токен |
| 403 | Недостатньо прав |
| 404 | Не знайдено |
| 409 | Конфлікт (дублікат, недостатньо залишку, запис використовується) |
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
