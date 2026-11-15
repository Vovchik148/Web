import { Outlet } from 'react-router';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import Footer from './Footer';
import Header from './Header';

// Єдина структура всіх сторінок: шапка, вміст (Outlet), підвал.
export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Header />
      <main className="container mx-auto flex-grow px-4 py-8">
        {/* Помилки відтворення сторінки не "білять екран", а показують запасний UI */}
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
