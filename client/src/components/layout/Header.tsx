import { Link, useNavigate } from 'react-router';
import { APP_NAME } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import Button from '@/components/common/Button';

interface HeaderProps {
  onOpenSidebar: () => void; // мобільний: відкрити бічну панель
}

export default function Header({ onOpenSidebar }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { refreshToken, logout } = useAuthStore.getState();
    await authService.logout(refreshToken); // відкликання refresh-токена на сервері
    logout(); // очищення локальної сесії; ProtectedRoute сам redirect-ить на /login
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-md dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          {/* Бургер: на мобільних відкриває бічну панель (на десктопі панель постійна) */}
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Відкрити меню"
            className="rounded p-1 text-2xl md:hidden"
          >
            ☰
          </button>
          <Link to="/" className="text-2xl font-bold text-primary-600">
            {APP_NAME}
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Перемкнути тему"
            className="text-lg"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {user ? (
            <>
              <span className="hidden text-sm text-gray-500 sm:inline dark:text-gray-400">
                {user.firstName} {user.lastName} ({user.role})
              </span>
              <Button size="sm" variant="secondary" onClick={() => void handleLogout()}>
                Вийти
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm hover:text-primary-600">
                Увійти
              </Link>
              <Link to="/register">
                <Button size="sm">Реєстрація</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
