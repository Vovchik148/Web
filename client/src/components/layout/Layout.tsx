import { useState } from 'react';
import { Outlet } from 'react-router';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useAuthStore } from '@/stores/authStore';
import Footer from './Footer';
import Header from './Header';
import Sidebar from './Sidebar';

// Єдина структура сторінок: бічна панель + шапка + вміст (Outlet).
// Панель: на десктопі постійна, згортається до іконок; на мобільних - drawer.
// Для гостя панель не показується: у нього немає розділів керування.
export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false); // десктоп: розгорнута/іконки
  const [isDrawerOpen, setDrawerOpen] = useState(false); // мобільний: панель відкрита
  const isAuthenticated = useAuthStore((state) => state.accessToken !== null);

  return (
    <div className="flex min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {isAuthenticated && (
        <Sidebar
          isOpen={isDrawerOpen}
          isCollapsed={isCollapsed}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenSidebar={() => setDrawerOpen(true)} />

        {/* Перемикач панелі - лише для авторизованих на десктопі */}
        {isAuthenticated && (
          <div className="hidden justify-start px-4 pt-2 md:flex">
            <button
              type="button"
              onClick={() => setIsCollapsed((c) => !c)}
              aria-label={isCollapsed ? 'Розгорнути бічну панель' : 'Згорнути бічну панель'}
              className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {isCollapsed ? '» Панель' : '« Панель'}
            </button>
          </div>
        )}

        <main className="container mx-auto w-full flex-grow px-4 py-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>

        <Footer />
      </div>
    </div>
  );
}
