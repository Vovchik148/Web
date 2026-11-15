import { APP_NAME } from '@/constants';

export default function Footer() {
  return (
    <footer className="bg-gray-100 py-6 text-center text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-400">
      <p>
        © {new Date().getFullYear()} {APP_NAME}. Контакти: info@warehouse.local
      </p>
      <p className="mt-1">
        Backend API: <code>{import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'}</code>
      </p>
    </footer>
  );
}
