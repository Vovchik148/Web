import { Link, useLocation } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { ROUTES } from '@/constants';

interface SidebarProps {
  isOpen: boolean; // мобільний: панель відкрита (drawer)
  isCollapsed: boolean; // десктопний: згорнутий до іконок
  onClose: () => void;
}

interface SidebarLink {
  to: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const LINKS: SidebarLink[] = [
  { to: ROUTES.HOME, label: 'Каталог', icon: '📦' },
  { to: '/dashboard', label: 'Панель', icon: '📊' },
  { to: '/products', label: 'Товари', icon: '🏷️' },
  { to: '/movements', label: 'Журнал рухів', icon: '📋' },
  { to: '/categories', label: 'Категорії', icon: '📁' },
  { to: '/warehouses', label: 'Склади', icon: '🏭' },
  { to: '/suppliers', label: 'Постачальники', icon: '🚚' },
  { to: '/users', label: 'Користувачі', icon: '👥', adminOnly: true },
];

// Бічна панель (рівень 3): на десктопі згортається до іконок,
// на мобільних - висувається поверх вмісту (drawer) і закривається кліком
export default function Sidebar({ isOpen, isCollapsed, onClose }: SidebarProps) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  const links = LINKS.filter((link) => !link.adminOnly || user?.role === 'ADMIN');

  return (
    <>
      {/* Фон-затемнення на мобільних */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-gray-700 dark:bg-gray-900',
          'md:sticky md:top-0 md:h-screen md:translate-x-0',
          isCollapsed ? 'md:w-14' : 'md:w-56',
          isOpen ? 'w-64 translate-x-0' : '-translate-x-full w-64',
        ].join(' ')}
      >
        <nav
          className={[
            'flex-1 space-y-1 overflow-y-auto p-3',
            // Згорнуто (десктоп): вужчі відступи, щоб іконки стали по центру лінії
            isCollapsed ? 'md:px-1.5' : '',
          ].join(' ')}
          aria-label="Розділи застосунку"
        >
          {links.map((link) => {
            const isActive =
              location.pathname === link.to ||
              (link.to !== '/' && location.pathname.startsWith(link.to));
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                title={isCollapsed ? link.label : undefined}
                className={[
                  'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors',
                  isCollapsed ? 'md:justify-center md:px-0' : '',
                  isActive
                    ? 'bg-primary-50 font-medium text-primary-700 dark:bg-gray-800 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800',
                ].join(' ')}
              >
                <span aria-hidden="true">{link.icon}</span>
                {/* Згорнуто (десктоп): підпис ховаємо; на мобільному drawer підписи завжди є */}
                <span className={isCollapsed ? 'md:hidden' : ''}>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
