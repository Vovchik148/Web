# Система обліку інвентарю на складі — Backend API

Серверна частина системи обліку інвентарю на складі, розроблена з використанням Node.js, Express.js та PostgreSQL.

## 🚀 Технології

- **Node.js** - серверне середовище JavaScript
- **Express.js 5** - веб-фреймворк
- **PostgreSQL** - реляційна база даних
- **Prisma** - ORM для роботи з базою даних
- **JWT (jsonwebtoken)** - автентифікація: короткоживучий access + refresh з ротацією та відкликанням
- **argon2** - хешування паролів
- **express-rate-limit** - обмеження кількості запитів
- **multer** - завантаження файлів
- **express-validator** - валідація вхідних даних
- **nodemailer** - надсилання листів (відновлення пароля)
- **otplib + qrcode** - двофакторна автентифікація (TOTP)
- **swagger-jsdoc + swagger-ui-express** - документація API

## 📋 Функціональність

- ✅ Аутентифікація та авторизація користувачів (access + refresh токени з ротацією)
- ✅ Відновлення пароля через email (одноразові токени, у БД лише хеш)
- ✅ Двофакторна автентифікація (TOTP: Google Authenticator, Authy тощо)
- ✅ Вхід через GitHub OAuth (без passport, Authorization Code)
- ✅ Управління категоріями товарів, постачальниками та складами
- ✅ CRUD операції з товарами
- ✅ Облік залишків товарів по складах
- ✅ Журнал руху товарів (надходження, відвантаження, коригування)
- ✅ Звіт про товари з низьким залишком
- ✅ Завантаження файлів (один або до 10 за раз) з валідацією типу та розміру
- ✅ Журнал аудиту дій користувачів
- ✅ Система ролей (адміністратор/менеджер/комірник) + детальні дозволи виду `products:write`
- ✅ Rate limiting: загальний для API та посилений для автентифікації
- ✅ Валідація вхідних даних, централізована обробка помилок
- ✅ Swagger-документація (`/api-docs`)
- ✅ Тести (node:test + supertest)

## 🗂 Структура проєкту

```
warehouse-backend/
├── src/
│   ├── config/              # Конфігурація (permissions, swagger)
│   ├── controllers/         # Контролери
│   ├── generated/           # Згенерований Prisma Client (не редагувати)
│   ├── middleware/          # Проміжні обробники (auth, дозволи, upload, валідація)
│   ├── models/              # Моделі (робота з БД через Prisma)
│   ├── routes/              # Маршрути API
│   ├── utils/               # Допоміжні функції (jwt, mailer, audit, password)
│   ├── app.js               # Головний файл додатку
│   └── server.js            # Точка входу
├── prisma/
│   ├── migrations/          # Міграції бази даних
│   ├── schema.prisma        # Схема бази даних
│   └── seed.js              # Файл для заповнення тестовими даними
├── tests/                   # Тести (node:test + supertest)
├── reports/                 # Звіти лабораторних робіт
├── docker-compose.yml       # PostgreSQL у Docker
├── api_documantion.md       # Докладна документація API
└── .env.example             # Приклад змінних середовища
```

## 🛠 Встановлення та запуск

### Вимоги
- Node.js 24+
- PostgreSQL (версія 12+) або Docker

### 1. Клонування репозиторію
```bash
git clone <your-repo-url>
cd warehouse-backend
```

### 2. Встановлення залежностей
```bash
npm install
```

### 3. Налаштування змінних середовища
Створіть файл `.env` в корені проєкту (можна скопіювати `.env.example`):

```env
DATABASE_URL="postgresql://warehouse_user:warehouse_password@localhost:5432/warehouse_db?schema=public"
JWT_SECRET=згенерований-секрет-1
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=згенерований-секрет-2
REFRESH_TOKEN_EXPIRES_IN=7d
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
FRONTEND_URL=http://localhost:5173
```

Додатково для рівня 3 (усі є в `.env.example` з коментарями):

```env
AUTH_RATE_LIMIT_MAX=20            # ліміт запитів до /api/auth за вікно
AUTH_RATE_LIMIT_WINDOW_MINUTES=15
TWO_FACTOR_TEMP_TOKEN_EXPIRES_IN=5m
APP_URL=http://localhost:3000     # зовнішня адреса API (для OAuth)
# SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS  - реальна пошта;
# якщо не задані - тестова скринька Ethereal (прев'ю в консолі)
# GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET - OAuth App з github.com/settings/developers
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
npx prisma migrate dev

# Заповнення бази тестовими даними
npm run db:seed
```

### 5. Запуск сервера
```bash
# Розробка (з автоперезапуском)
npm run dev

# Продакшн
npm start
```

Сервер буде доступний за адресою: `http://localhost:3000`, Swagger UI: `http://localhost:3000/api-docs`

### 6. Тести
```bash
npm test
```
Потрібна запущена база даних (тести працюють з реальною БД).

## 📚 API Endpoints

Повний опис із прикладами відповідей: [api_documantion.md](./api_documantion.md)

### Аутентифікація
- `POST /api/auth/register` - Реєстрація користувача (роль WORKER)
- `POST /api/auth/login` - Вхід (або запит коду 2FA)
- `POST /api/auth/refresh` - Оновлення пари токенів (ротація refresh)
- `POST /api/auth/logout` - Вихід (відкликання refresh-токена)
- `POST /api/auth/forgot-password` - Запит листа для відновлення пароля
- `POST /api/auth/reset-password` - Скидання пароля за одноразовим токеном
- `POST /api/auth/2fa/setup` - Крок 1 увімкнення 2FA (секрет + QR-код)
- `POST /api/auth/2fa/enable` - Крок 2 увімкнення 2FA (підтвердження кодом)
- `POST /api/auth/2fa/disable` - Вимкнути 2FA
- `POST /api/auth/2fa/verify` - Другий крок входу (код 2FA)
- `GET /api/auth/github` - Вхід через GitHub OAuth (редирект)
- `GET /api/auth/github/callback` - Callback GitHub OAuth
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

### Файли
- `POST /api/files/upload` - Завантажити файл (поле `file`, до 5 МБ)
- `POST /api/files/upload-multiple` - Завантажити до 10 файлів (поле `files`)
- `GET /api/files/:id` - Отримати файл за ID
- `PUT /api/files/:id` - Замінити файл (власник або адмін)
- `DELETE /api/files/:id` - Видалити файл (власник або адмін)

### Аудит
- `GET /api/audit-logs` - Журнал дій користувачів (тільки адмін; пагінація + фільтри)

## 🔐 Аутентифікація

API використовує пару JWT токенів:

- **Access токен** (15 хвилин) - передається в заголовку кожного запиту:
  ```
  Authorization: Bearer <accessToken>
  ```
- **Refresh токен** (7 днів) - для оновлення пари через `POST /api/auth/refresh`. Зберігається в БД у вигляді хеша, тому може бути відкликаний; при кожному оновленні - ротація (старий відкликається). Повторне використання відкликаного токена відкликає **всі** токени користувача.

### Вхід з двофакторною автентифікацією
Якщо у користувача увімкнено 2FA, `POST /api/auth/login` повертає `twoFactorRequired: true` та короткоживучий `tempToken` (~5 хвилин). Повна пара токенів видається лише після `POST /api/auth/2fa/verify` з кодом з застосунку-аутентифікатора.

## 👥 Ролі та права

Права описані як дозволи виду `<сутність>:<операція>` у `src/config/permissions.js`; маршрути перевіряють їх через middleware `requirePermission()`.

| Дозвіл | WORKER | MANAGER | ADMIN |
|---|:-:|:-:|:-:|
| Перегляд товарів, залишків (`products:read`, `stock:read`) | ✅ | ✅ | ✅ |
| Реєстрація операцій руху товару (`stock:write`) | ✅ | ✅ | ✅ |
| Завантаження файлів (`files:write`) | ✅ | ✅ | ✅ |
| Створення/редагування товарів (`products:write`) | ❌ | ✅ | ✅ |
| Категорії, постачальники, склади (`catalog:write`) | ❌ | ✅ | ✅ |
| Видалення товарів (`products:delete`) | ❌ | ❌ | ✅ |
| Видалення файлів (`files:delete`) | ❌ | ✅ | ✅ |
| Видалення категорій/постачальників/складів (`catalog:delete`) | ❌ | ❌ | ✅ |
| Керування користувачами (`users:manage`) | ❌ | ❌ | ✅ |
| Журнал аудиту (`audit:read`) | ❌ | ❌ | ✅ |

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

### Вхід користувача
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "manager@warehouse.com",
  "password": "Manager123"
}
```

### Вхід з 2FA (другий крок)
```http
POST /api/auth/2fa/verify
Content-Type: application/json

{
  "tempToken": "<tempToken з відповіді login>",
  "code": "123456"
}
```

### Відновлення пароля
```http
POST /api/auth/forgot-password
Content-Type: application/json

{ "email": "admin@warehouse.com" }
```
Відповідь завжди `200` (не розкриває існування email). Лист з одноразовим посиланням діє 15 хвилин; у режимі розробки (без SMTP) переглядається за посиланням у консолі сервера (Ethereal).

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

### Завантаження кількох файлів
```bash
curl -X POST http://localhost:3000/api/files/upload-multiple \
  -H "Authorization: Bearer <token>" \
  -F "files=@a.png" -F "files=@b.pdf"
```

### Журнал аудиту (тільки адмін)
```http
GET /api/audit-logs?action=auth.&page=1&limit=10
Authorization: Bearer <admin-token>
```

### Отримання товарів з фільтрацією
```http
GET /api/products?page=1&limit=10&categoryId=1&search=ESP&sortBy=price&order=asc
```

## 🛠 Доступні npm scripts

```bash
npm start          # Запуск продакшн сервера
npm run dev        # Запуск в режимі розробки (node --watch)
npm test           # Запуск тестів (потрібна запущена БД)
npm run db:migrate # Застосування міграцій БД
npm run db:generate # Генерація Prisma клієнта
npm run db:seed    # Заповнення БД тестовими даними
npm run db:studio  # Відкриття Prisma Studio
npm run db:reset   # Скидання БД
```

## 🗄 Схема бази даних

### Основні таблиці:
- **users** - користувачі системи (включно з `twoFactorSecret`/`twoFactorEnabled` для 2FA)
- **categories** - категорії товарів
- **suppliers** - постачальники
- **warehouses** - склади
- **products** - товари
- **stocks** - залишки товарів на складах
- **stock_movements** - журнал руху товарів (незмінний)
- **files** - завантажені файли
- **refresh_tokens** - хеші refresh-токенів (для відкликання)
- **audit_logs** - журнал дій користувачів
- **password_reset_tokens** - одноразові хеші токенів скидання пароля
- **oauth_accounts** - прив'язки акаунтів зовнішніх провайдерів (GitHub)

### Зв'язки:
- Категорія може мати багато товарів (1:N)
- Постачальник може постачати багато товарів (1:N)
- Користувач може виконати багато операцій руху товарів (1:N)
- Склад може мати багато операцій руху товарів (1:N)
- Товар може зберігатися на багатьох складах, а склад — містити багато товарів (N:M через stocks)
- Користувач має багато refresh-токенів, файлів, записів аудиту (1:N)
- Користувач може мати кілька OAuth-акаунтів (1:N)
- Кожен токен скидання пароля належить користувачу (N:1)

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

- Паролі хешуються за допомогою **argon2id**
- Access токен живе 15 хвилин, refresh - 7 днів; refresh зберігається в БД (хеш) і може бути відкликаний
- Ротація refresh-токенів + виявлення повторного використання (відкликання всіх сесій)
- Rate limiting: 100 зап./15 хв на все API та посилений ліміт (за замовчуванням 20 зап./15 хв) на `/api/auth/*`
- Відновлення пароля: у БД лише хеш одноразового токена (15 хв), відповідь завжди 200, після скидання відкликаються всі сесії
- 2FA (TOTP): секрет зберігається в БД, ніколи не повертається після налаштування
- Невдалі спроби входу логуються в журнал аудиту (з IP)
- Валідація всіх вхідних даних; зайві поля в тілі запиту ігноруються
- Helmet.js для безпечних HTTP-заголовків, CORS з обмеженням методів/заголовків
- Хеш пароля та секрет 2FA ніколи не повертаються у відповідях
- Файли: білий список MIME-типів + розширення, обмеження розміру; при помилці БД завантажені файли видаляються

## 📊 Валідація

### Пароль повинен містити:
- Від 8 до 72 символів
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

### Файли
- Дозволені типи: JPEG, PNG, GIF, PDF (перевіряється і MIME, і розширення)
- Розмір: до 5 МБ (за замовчуванням, `MAX_FILE_SIZE`)
- Кількість: до 10 файлів за раз у `upload-multiple`

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
| 401 | Немає або недійсний токен / невірний код 2FA |
| 403 | Недостатньо прав |
| 404 | Запис не знайдено |
| 409 | Конфлікт (дублікат, недостатньо товару на складі, запис використовується) |
| 429 | Перевищено ліміт запитів (rate limiting) |
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
