# Система обліку інвентарю на складі — Backend API

Серверна частина системи обліку інвентарю на складі, розроблена з використанням Node.js, Express.js та PostgreSQL.

## 🚀 Технології

- **Node.js** - серверне середовище JavaScript
- **Express.js** - веб-фреймворк
- **PostgreSQL** - реляційна база даних
- **Prisma** - ORM для роботи з базою даних
- **JWT** - автентифікація та авторизація
- **bcryptjs** - хешування паролів
- **express-validator** - валідація вхідних даних

## 📋 Функціональність

- ✅ Аутентифікація та авторизація користувачів
- ✅ Управління категоріями товарів, постачальниками та складами
- ✅ CRUD операції з товарами
- ✅ Облік залишків товарів по складах
- ✅ Журнал руху товарів (надходження, відвантаження, коригування)
- ✅ Звіт про товари з низьким залишком
- ✅ Система ролей (адміністратор/менеджер/комірник)
- ✅ Валідація вхідних даних
- ✅ Обробка помилок
- ✅ RESTful API

## 🗂 Структура проєкту

```
warehouse-backend/
├── src/
│   ├── controllers/          # Контролери
│   ├── models/              # Моделі (робота з БД через Prisma)
│   ├── routes/              # Маршрути API
│   ├── middleware/          # Проміжні обробники
│   ├── utils/               # Допоміжні функції
│   └── app.js              # Головний файл додатку
├── prisma/
│   ├── schema.prisma       # Схема бази даних
│   └── seed.js             # Файл для заповнення тестовими даними
├── reports/                # Звіти лабораторних робіт
├── docker-compose.yml      # PostgreSQL у Docker
├── API_DOCUMENTATION.md    # Докладна документація API
└── .env                    # Змінні середовища
```

## 🛠 Встановлення та запуск

### Вимоги
- Node.js (версія 18+)
- npm або yarn
- PostgreSQL (версія 12+) або Docker

```bash
# Ініціалізуємо npm проєкт
npm init -y

# Встановлюємо основні залежності
npm install express prisma @prisma/client bcryptjs jsonwebtoken cors helmet dotenv express-validator

# Встановлюємо залежності для розробки
npm install -D nodemon prisma
```

### 1. Клонування репозиторію
```bash
git clone <your-repo-url>
cd warehouse-backend
```

### 2. Встановлення залежностей
```bash
npm install
```

### 3. Налаштування бази даних
Створіть файл `.env` в корені проєкту (можна скопіювати `.env.example`):

```env
DATABASE_URL="postgresql://warehouse_user:warehouse_password@localhost:5432/warehouse_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="24h"
PORT=3000
NODE_ENV=development
```

Запустіть PostgreSQL у Docker:
```bash
docker compose up -d
```

### 4. Створення бази даних та міграцій
```bash
# Генерація Prisma клієнта
npx prisma generate

# Створення та застосування міграцій
npx prisma migrate dev --name init

# Заповнення бази тестовими даними
npm run db:seed
```

### 5. Запуск сервера
```bash

# Розробка
npm run dev

# Продакшн
npm start
```

Сервер буде доступний за адресою: `http://localhost:3000`

## 📚 API Endpoints

Повний опис із прикладами відповідей: [api_documantion.md](./api_documantion.md)

### Аутентифікація
- `POST /api/auth/register` - Реєстрація користувача
- `POST /api/auth/login` - Вхід користувача
- `GET /api/auth/profile` - Отримати профіль (потребує авторизації)
- `PUT /api/auth/profile` - Оновити профіль (потребує авторизації)
- `PUT /api/auth/change-password` - Змінити пароль (потребує авторизації)

### Користувачі
- `GET /api/users` - Отримати всіх користувачів (тільки адмін)
- `PUT /api/users/:id` - Змінити роль або деактивувати користувача (тільки адмін)

### Категорії
- `GET /api/categories` - Отримати всі категорії
- `GET /api/categories/:id` - Отримати категорію за ID
- `POST /api/categories` - Створити категорію (адмін, менеджер)
- `PUT /api/categories/:id` - Оновити категорію (адмін, менеджер)
- `DELETE /api/categories/:id` - Видалити категорію (тільки адмін)

### Постачальники
- `GET /api/suppliers` - Отримати всіх постачальників
- `GET /api/suppliers/:id` - Отримати постачальника за ID
- `POST /api/suppliers` - Створити постачальника (адмін, менеджер)
- `PUT /api/suppliers/:id` - Оновити постачальника (адмін, менеджер)
- `DELETE /api/suppliers/:id` - Видалити постачальника (тільки адмін)

### Склади
- `GET /api/warehouses` - Отримати всі склади
- `GET /api/warehouses/:id` - Отримати склад за ID
- `POST /api/warehouses` - Створити склад (адмін, менеджер)
- `PUT /api/warehouses/:id` - Оновити склад (адмін, менеджер)
- `DELETE /api/warehouses/:id` - Видалити склад (тільки адмін)

### Товари
- `GET /api/products` - Отримати всі товари (з пагінацією, пошуком, фільтрацією та сортуванням)
- `GET /api/products/:id` - Отримати товар за ID (з залишками по складах)
- `POST /api/products` - Створити товар (адмін, менеджер)
- `PUT /api/products/:id` - Оновити товар (адмін, менеджер)
- `DELETE /api/products/:id` - Видалити товар (тільки адмін)

### Залишки
- `GET /api/stock` - Поточні залишки (фільтр за товаром та складом)
- `GET /api/stock/low` - Товари із залишком нижче мінімального

### Рух товарів
- `GET /api/movements` - Журнал операцій (з фільтрами)
- `GET /api/movements/:id` - Отримати операцію за ID
- `POST /api/movements` - Зареєструвати операцію (будь-який авторизований користувач)

## 🔐 Аутентифікація

API використовує JWT токени для аутентифікації. Після успішного входу отримайте токен та додавайте його в заголовок запитів:

```
Authorization: Bearer <your-jwt-token>
```

## 👥 Ролі та права

| Дія | ADMIN | MANAGER | WORKER |
|---|:-:|:-:|:-:|
| Перегляд товарів, складів, залишків, журналу | ✅ | ✅ | ✅ |
| Реєстрація операцій руху товару | ✅ | ✅ | ✅ |
| Створення/редагування товарів, категорій, постачальників, складів | ✅ | ✅ | ❌ |
| Видалення записів | ✅ | ❌ | ❌ |
| Керування користувачами | ✅ | ❌ | ❌ |

Публічна реєстрація створює користувача з роллю `WORKER`; вищі ролі видає адміністратор.

## 👥 Тестові користувачі

Після запуску seed файлу будуть створені тестові користувачі:

**Адміністратор:**
- Email: `admin@warehouse.com`
- Пароль: `Admin123`

**Менеджер:**
- Email: `manager@warehouse.com`
- Пароль: `Manager123`

**Комірник:**
- Email: `worker@warehouse.com`
- Пароль: `Worker123`

## 📝 Приклади запитів

### Реєстрація користувача
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "Password123",
  "firstName": "Іван",
  "lastName": "Іваненко"
}
```

### Вхід користувача
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "manager@warehouse.com",
  "password": "Manager123"
}
```

### Створення товару (адмін, менеджер)
```http
POST /api/products
Authorization: Bearer <manager-token>
Content-Type: application/json

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

### Надходження товару на склад
```http
POST /api/movements
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "INBOUND",
  "productId": 1,
  "warehouseId": 1,
  "quantity": 50,
  "note": "Поставка №123"
}
```

### Отримання товарів з фільтрацією
```http
GET /api/products?page=1&limit=10&categoryId=1&search=ESP&sortBy=price&order=asc
```

### Журнал операцій за період
```http
GET /api/movements?type=OUTBOUND&warehouseId=1&from=2026-10-01&to=2026-10-31
```

## 🛠 Доступні npm scripts

```bash
npm start          # Запуск продакшн сервера
npm run dev        # Запуск в режимі розробки (з nodemon)
npm run db:migrate # Застосування міграцій БД
npm run db:generate # Генерація Prisma клієнта
npm run db:seed    # Заповнення БД тестовими даними
npm run db:studio  # Відкриття Prisma Studio
npm run db:reset   # Скидання БД
```

## 🗄 Схема бази даних

### Основні таблиці:
- **users** - користувачі системи
- **categories** - категорії товарів
- **suppliers** - постачальники
- **warehouses** - склади
- **products** - товари
- **stocks** - залишки товарів на складах
- **stock_movements** - журнал руху товарів

### Зв'язки:
- Категорія може мати багато товарів (1:N)
- Постачальник може постачати багато товарів (1:N)
- Користувач може виконати багато операцій руху товарів (1:N)
- Склад може мати багато операцій руху товарів (1:N)
- Товар може зберігатися на багатьох складах, а склад — містити багато товарів (N:M через stocks)

## 🔧 Налаштування розробки

### Prisma Studio
Для зручного перегляду та редагування даних:
```bash
npm run db:studio
```

### Міграції
При зміні схеми:
```bash
npx prisma migrate dev --name <migration_name>
```

### Скидання БД
```bash
npx prisma migrate reset
```

## 🚨 Безпека

- Паролі хешуються за допомогою bcryptjs (12 rounds)
- JWT токени мають термін дії 24 години
- Валідація всіх вхідних даних; зайві поля в тілі запиту ігноруються
- CORS налаштований для безпеки
- Helmet.js для додаткової безпеки заголовків
- Хеш пароля ніколи не повертається в відповідях

## 📊 Валідація

### Пароль повинен містити:
- Від 6 до 72 символів
- Принаймні одну малу літеру
- Принаймні одну велику літеру
- Принаймні одну цифру

### Email
- Повинен бути валідним email адресом

### Товар
- `sku`: 3-30 символів (латинські літери, цифри, дефіс), унікальний
- `price`: число >= 0
- `minStock`: ціле число >= 0
- `categoryId`: існуюча категорія

### Операція руху товару
- `INBOUND` / `OUTBOUND`: `quantity` >= 1
- `ADJUSTMENT`: `quantity` != 0 (зі знаком + або -)

## 🔍 Обробка помилок

API повертає структуровані помилки з відповідними HTTP кодами:

```json
{
  "error": "Bad Request",
  "message": "Помилка валідації вхідних даних",
  "errors": [
    {
      "field": "price",
      "message": "price має бути числом >= 0"
    }
  ]
}
```

| Код | Значення |
|---|---|
| 400 | Помилка валідації |
| 401 | Немає або недійсний токен |
| 403 | Недостатньо прав |
| 404 | Запис не знайдено |
| 409 | Конфлікт (дублікат, недостатньо товару на складі, запис використовується) |
| 500 | Внутрішня помилка сервера |

## 📈 Пагінація

Endpoints що повертають списки підтримують пагінацію:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

## 🎯 Типи операцій руху товарів

- `INBOUND` - Надходження на склад (залишок збільшується)
- `OUTBOUND` - Відвантаження зі складу (залишок зменшується, не може стати від'ємним)
- `ADJUSTMENT` - Коригування за результатами інвентаризації (зі знаком + або -)

Журнал операцій незмінний: помилкову операцію виправляють новою `ADJUSTMENT`.
