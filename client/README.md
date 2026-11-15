# Warehouse Inventory — клієнтська частина

## Опис проєкту

Клієнтська частина системи обліку інвентарю на складі (серверна частина — у корені цього
репозиторію, лабораторні роботи 1-3). Лабораторна робота 4 закладає базу клієнта
(Vite + TypeScript, UI-компоненти, маршрутизація, темна тема), лабораторна робота 5 —
повноцінний інтерфейс з аутентифікацією, CRUD-операціями та керуванням станом.

## Функціональність

- ✅ Аутентифікація (JWT): Login / Register, сесія у Zustand з persist
- ✅ Захищені маршрути (ProtectedRoute) з поверненням на сторінку після входу
- ✅ Панель керування (Dashboard) з розділами за ролями
- ✅ CRUD товарів: список (пошук, фільтри, сортування, пагінація), створення, редагування, видалення з модальним підтвердженням
- ✅ Зміна залишків через операції руху (INBOUND/OUTBOUND/ADJUSTMENT) на детальній сторінці товару + історія останніх рухів
- ✅ CRUD довідників: категорії, склади, постачальники (модальні форми)
- ✅ Керування користувачами (ADMIN): зміна ролі, активація/деактивація
- ✅ Валідація форм: React Hook Form + Zod 4 (схеми узгоджені з валідаторами backend)
- ✅ Клієнтський стан: Zustand (сесія); дані сервера: TanStack Query (кеш, invalidateQueries)
- ✅ Сповіщення toast (react-hot-toast)
- ✅ Пошук з debounce, пагінація, сортування, фільтри
- ✅ Скелетні індикатори завантаження (таблиця, сітка, детальна сторінка)
- ✅ Бічна панель (sidebar): згортання на десктопі, drawer на мобільних
- ✅ Хлібні крихти (breadcrumbs), детальні сторінки товарів із залишками по складах
- ✅ Темна тема з запам'ятовуванням вибору (лаб. 4)

## Технології

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4 (`@theme`, `@custom-variant dark`)
- React Router 8
- Axios + interceptors
- React Hook Form + Zod 4 (@hookform/resolvers)
- Zustand (сесія користувача, middleware persist)
- TanStack Query (дані сервера)
- React Hot Toast
- ESLint 10 (flat config) + Prettier

## Встановлення та запуск

### Вимоги

- Node.js 24 LTS
- Запущена серверна частина на `localhost:3000` (див. кореневий README)

### Інструкції

```bash
# Клонування репозиторію (клієнт - у теці client/)
git clone https://github.com/Vovchik148/Web.git
cd Web/client

# Встановлення залежностей
npm install

# Копіювання .env файлу
cp .env.example .env

# Запуск у режимі розробки
npm run dev                 # http://localhost:5173

# Збірка для продакшену
npm run build

# Якість коду
npm run lint
npm run format
```

### Тестові облікові записи (npm run db:seed на серверній частині)

```
ADMIN:   admin@warehouse.com   / Admin123
MANAGER: manager@warehouse.com / Manager123
WORKER:  worker@warehouse.com  / Worker123
```

## Структура проєкту

```
client/src/
├── components/
│   ├── common/        # Button, Input, Card, Badge, Loading, FormField,
│   │                  # Skeleton (Table/CardGrid/Detail), ConfirmModal, Pagination,
│   │                  # ErrorBoundary
│   ├── layout/        # Header, Footer, Layout, Sidebar, Breadcrumbs
│   ├── product/       # ProductForm (спільна форма create/edit)
│   └── ProtectedRoute.tsx
├── pages/             # Login, Register, Dashboard, Home, About, NotFound,
│                      # ProductsList / Create / Detail / Edit,
│                      # Categories, Warehouses, Suppliers, Users
├── services/          # api.ts (Axios + interceptors), auth/products/catalog.services
├── stores/            # authStore.ts - сесія користувача (Zustand + persist)
├── schemas/           # Zod-схеми: auth, product, catalog (категорії/склади/постачальники)
├── types/             # Типи відповідей API (api.types.ts)
├── hooks/             # useTheme (лаб. 4), useDebounce (пошук)
├── utils/             # format.ts, getErrorMessage.ts
└── constants/         # APP_NAME, ROUTES, NAV_ITEMS
```

## Ключові рішення

- **Розділення стану**: Zustand — лише сесія користувача (middleware persist у
  localStorage); усі дані сервера — через TanStack Query (`useQuery`/`useMutation` +
  `invalidateQueries`: сервер — джерело істини)
- **Interceptors Axios**: токен зі сховища Zustand у кожен запит; 401 → `logout()` —
  ProtectedRoute сам перенаправляє на `/login` без перезавантаження сторінки
- **Zod 4**: `z.email()`, `error:` замість `message`; `z.preprocess` для порожніх
  необов'язкових полів (`''` → `undefined`); пари типів `z.input`/`z.output` для
  `useForm<Input, unknown, Output>`
- **Валідація узгоджена з backend**: правила дублюють express-validator з лаб. 2
  (пароль 8-72 з регістрами і цифрою, межі довжин полів тощо)
- **Власне модальне вікно підтвердження** замість системного `confirm()`
- **Рольова модель**: приховані розділи для не-адмінів (клієнт) + перевірка прав
  на сервері (справжня безпека)

## Змінні середовища

| Змінна | Призначення | За замовчуванням |
|---|---|---|
| `VITE_API_URL` | адреса серверної частини | `http://localhost:3000/api` |
| `VITE_APP_NAME` | назва застосунку в UI | `Warehouse Inventory` |

Файли: `.env` (локальний, у .gitignore), `.env.development`, `.env.production`,
`.env.example`. У змінні з префіксом `VITE_` **не можна** зберігати секрети — вони
потрапляють у клієнтський бандл.

## Скріншоти

_Додати скріншоти: вхід, реєстрація, панель керування, список товарів, форма створення, детальна сторінка, темна тема, мобільний вигляд_

## Автор

Шипкін Денис
