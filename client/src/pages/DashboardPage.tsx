import { Suspense, lazy } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { categoriesService } from '@/services/catalog.services';
import { ROUTES } from '@/constants';
import { CardGridSkeleton } from '@/components/common/Skeleton';
import TaskBoard from '@/components/TaskBoard';

// Графік (Recharts) важкий - lazy: потрапляє в окремий chunk, не збільшує
// початкове завантаження (код спліттінг, рівень 3)
const StatsChart = lazy(() => import('@/components/StatsChart'));

interface Section {
  to: string;
  title: string;
  text: string;
  icon: string;
  adminOnly?: boolean;
}

const sections: Section[] = [
  {
    to: '/products',
    title: 'Товари',
    text: 'Каталог товарів: створення, редагування, залишки',
    icon: '🏷️',
  },
  { to: '/categories', title: 'Категорії', text: 'Довідник категорій товарів', icon: '📁' },
  { to: '/warehouses', title: 'Склади', text: 'Склади та їхні залишки', icon: '🏭' },
  { to: '/suppliers', title: 'Постачальники', text: 'Довідник постачальників', icon: '🚚' },
  {
    to: '/movements',
    title: 'Журнал рухів',
    text: 'Історія всіх операцій (нескінченне прокручування)',
    icon: '📋',
  },
  {
    to: '/users',
    title: 'Користувачі',
    text: 'Ролі та статуси користувачів системи',
    icon: '👥',
    adminOnly: true,
  },
];

// Панель керування: розділи описано масивом, а не продубльовано розміткою.
// Рівень 2-3: графік категорій (Recharts, lazy) і список перевірок з drag and drop.
export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const visible = sections.filter((s) => !s.adminOnly || user?.role === 'ADMIN');

  // Дані для графіка - з реального API: кількість товарів у кожній категорії
  const { data: categories, isPending } = useQuery({
    queryKey: ['categories', 'for-chart'],
    queryFn: () => categoriesService.getAll({ limit: 20 }),
  });

  const chartData = (categories?.data ?? []).map((c) => ({
    name: c.name,
    products: c.productCount ?? 0,
  }));

  return (
    <div>
      <h1 className="mb-1 text-3xl font-bold">Вітаємо, {user?.firstName}!</h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">
        Роль: {user?.role}. Оберіть розділ для роботи зі складом.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {visible.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
          >
            <span className="text-3xl" aria-hidden="true">
              {s.icon}
            </span>
            <h3 className="mb-1 mt-2 text-xl font-semibold">{s.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{s.text}</p>
          </Link>
        ))}
      </div>

      {/* Графік: lazy-завантаження + Suspense fallback */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          {isPending ? (
            <CardGridSkeleton count={1} />
          ) : (
            <Suspense
              fallback={
                <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-900">
                  <div className="h-[300px] animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              }
            >
              <StatsChart data={chartData} title="Товари за категоріями" />
            </Suspense>
          )}
        </div>

        {/* Перетягування: dnd-kit (рівень 2) */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-xl font-bold">Перевірки складу (перетягніть, щоб змінити порядок)</h3>
          <TaskBoard />
        </div>
      </div>

      <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        Публічний каталог без авторизації:{' '}
        <Link to={ROUTES.HOME} className="text-primary-600 hover:underline">
          головна сторінка
        </Link>
        .
      </p>
    </div>
  );
}
