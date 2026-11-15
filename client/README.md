# Warehouse Inventory — клієнтська частина

## Опис проєкту

Клієнтська частина повноцінного full-stack вебзастосунку обліку інвентарю на складі
(серверна частина — у корені цього репозиторію, лабораторні роботи 1-3).

- **Лабораторна робота 4** — база: Vite + TypeScript, інструменти якості коду,
  маршрутизація, UI-компоненти, темна тема, інтеграція з API.
- **Лабораторна робота 5** — аутентифікація, CRUD-інтерфейси, валідація форм,
  Zustand + TanStack Query, toast, скелетони, sidebar.
- **Лабораторна робота 6** — реальний час (Socket.io), розширені інтерактивні
  компоненти (Headless UI, dnd-kit, Recharts), оптимізація продуктивності
  (код-спліттінг, PWA), SEO та розгортання (Vercel) з CI/CD.

## Функціональність

- ✅ Аутентифікація (JWT): Login / Register, сесія у Zustand з persist
- ✅ Захищені маршрути (ProtectedRoute) з поверненням після входу та ролями
- ✅ Панель керування, CRUD товарів / категорій / складів / постачальників
- ✅ Керування користувачами (ADMIN): ролі та статуси
- ✅ Валідація форм: React Hook Form + Zod 4 (схеми = правила backend)
- ✅ **Реальний час (Socket.io)**: дзвіночок сповіщень (подія `notification` в
  особистій кімнаті), онлайн-статуси (presence), автооновлення списків товарів
  (кімната `products` + invalidateQueries на події `product:*` / `stock:updated`)
- ✅ Модальні вікна та діалоги підтвердження (Headless UI Dialog: портал,
  focus trap, Esc, анімації через `transition`)
- ✅ Таби (Headless UI Tabs) на детальній сторінці товару
- ✅ Випадне меню з пошуком (Headless UI Combobox) — категорія/постачальник у формі
- ✅ Перетягування елементів (dnd-kit + KeyboardSensor): список перевірок складу
- ✅ Графіки (Recharts, lazy): товарові категорії на Dashboard
- ✅ Нескінченне прокручування: журнал рухів (`useInfiniteQuery` + IntersectionObserver)
- ✅ Календар (react-day-picker): фільтр журналу за діапазоном дат
- ✅ Завантаження зображень з обрізанням (react-easy-crop + canvas → файловий сервіс)
- ✅ Rich text редактор (Tiptap, lazy) для опису товару
- ✅ Анімації переходів між сторінками (CSS fade-slide за ключем маршруту)
- ✅ Код-спліттінг: усі сторінки lazy + Suspense; Recharts/Tiptap — в chunk'ах своїх сторінок
- ✅ PWA: manifest, service worker (Workbox), офлайн-режим (NetworkFirst для API)
- ✅ SEO: title/description, Open Graph, twitter:card, robots.txt, sitemap.xml
- ✅ Клієнтське кешування запитів: TanStack Query (staleTime 30 с)
- ✅ Тести компонентів: Vitest + Testing Library (життєвий цикл підписок Socket.io, діалоги)
- ✅ CI/CD: GitHub Actions (лінт → тести → збірка → деплой на Vercel)

## Технології

React 19 + TypeScript, Vite 8, Tailwind CSS 4, React Router 8, Axios, Socket.io-client,
React Hook Form + Zod 4, Zustand, TanStack Query, React Hot Toast, Headless UI 2,
dnd-kit, Recharts 3, react-day-picker 10, react-easy-crop, Tiptap 3,
Vitest + Testing Library, vite-plugin-pwa, ESLint 10 + Prettier.

## Встановлення та запуск

### Вимоги

- Node.js 24 LTS
- Запущена серверна частина (корінь репозиторію, `localhost:3000`)

### Інструкції

```bash
git clone https://github.com/Vovchik148/Web.git
cd Web/client

npm install
cp .env.example .env

npm run dev        # http://localhost:5173

npm run build      # продакшн-збірка (PWA service worker генерується тут)
npm run preview    # перегляд продакшн-збірки (тут працює PWA/офлайн)
npm run test       # тести компонентів (Vitest)
npm run lint && npm run format
npm run icons      # перегенерація PWA-іконок з SVG-логотипа
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
│   ├── common/        # Button, Input, Card, Badge, Modal, ConfirmModal,
│   │                  # ComboboxField, Tabs, Skeleton, Pagination, FormField,
│   │                  # ImageUploader, RichTextEditor, ErrorBoundary
│   ├── layout/        # Header (+NotificationBell), Footer, Layout, Sidebar, Breadcrumbs
│   ├── product/       # ProductForm (create/edit, Combobox + Tiptap + ImageUploader)
│   ├── NotificationBell.tsx  # сповіщення реального часу (Socket.io)
│   ├── StatsChart.tsx        # графік категорій (Recharts, lazy)
│   ├── TaskBoard.tsx         # drag and drop (dnd-kit)
│   └── ProtectedRoute.tsx
├── pages/             # Home, About, Login, Register, Dashboard, Products*,
│                      # Categories, Warehouses, Suppliers, Movements (infinite scroll), Users, NotFound
├── services/          # api.ts, socket.ts, auth/products/catalog/movements services
├── stores/            # authStore, notificationsStore, presenceStore (Zustand)
├── schemas/           # Zod: auth, product, catalog, movement
├── hooks/             # useSocketConnection, useSocketEvent, useSocketRoom,
│                      # usePresenceSync, useTheme, useDebounce
├── test/              # setup.ts + тести компонентів (Vitest + Testing Library)
├── types/             # Типи відповідей API
├── utils/             # format.ts, getErrorMessage.ts
└── constants/         # APP_NAME, ROUTES, NAV_ITEMS
```

## Розгортання (Vercel + CI/CD)

1. **Vercel**: vercel.com → Add New Project → репозиторій → Root Directory: `client`.
   Environment Variables: `VITE_API_URL=https://<твій-сервіс>.onrender.com/api`,
   `VITE_SOCKET_URL=https://<твій-сервіс>.onrender.com` (підставляються під час збірки —
   після зміни потрібен повторний деплой). Правило SPA-rewrite — у `vercel.json`.
2. **На сервері (Render)**: змінна `FRONTEND_URL` = адреса Vercel (CORS + Socket.io).
3. **CI/CD**: `.github/workflows/ci-cd.yml` — на кожен push/PR у `main`:
   серверні тести (Postgres+Redis services) → клієнтські lint/test/build →
   деплой на Vercel через CLI. Потрібні секрети GitHub: `VERCEL_TOKEN`,
   `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (з `npx vercel link` у `client/`).
   В Vercel вимкніть Git-інтеграцію (Settings → Git), щоб не було подвійних деплоїв.

Повернення на сторінки (SPA rewrite): прямі адреси типу `/products/51` віддають
`index.html`, маршрутизацію обробляє React Router.

## Скріншоти

_Додати скріншоти: дзвіночок сповіщень, Dashboard з графіком і TaskBoard, журнал рухів з нескінченним прокручуванням, форма товару з Combobox/Tiptap, офлайн-режим PWA_

## Автор

Шипкін Денис
