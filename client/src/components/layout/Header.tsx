import { useState } from 'react';
import { Link } from 'react-router';
import { APP_NAME, NAV_ITEMS } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-md dark:bg-gray-900">
      <nav className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link to="/" className="text-2xl font-bold text-primary-600">
          {APP_NAME}
        </Link>

        {/* Навігація для десктопу (sm і ширше) */}
        <div className="hidden items-center gap-6 sm:flex">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className="hover:text-primary-600">
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Перемкнути тему"
            className="text-lg"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Кнопка бургер-меню для мобільних */}
        <div className="flex items-center gap-3 sm:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Перемкнути тему"
            className="text-lg"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Меню"
            aria-expanded={menuOpen}
            className="rounded p-1 text-2xl"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Мобільне меню */}
      {menuOpen && (
        <nav className="border-t border-gray-200 px-4 py-3 sm:hidden dark:border-gray-700">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className="block py-2 hover:text-primary-600"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
