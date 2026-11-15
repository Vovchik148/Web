import { Link } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { ROUTES } from '@/constants';

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
    to: '/users',
    title: 'Користувачі',
    text: 'Ролі та статуси користувачів системи',
    icon: '👥',
    adminOnly: true,
  },
];

// Панель керування: розділи описано масивом, а не продубльовано розміткою
export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const visible = sections.filter((s) => !s.adminOnly || user?.role === 'ADMIN');

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
