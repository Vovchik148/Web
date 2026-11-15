import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  // обмеження за роллю: необов'язкове; backend усе одно перевіряє права на кожен запит
  roles?: Array<'ADMIN' | 'MANAGER' | 'WORKER'>;
}

// Захищений маршрут: без сесії - перенаправлення на /login з запам'ятовуванням
// поточного розташування (state.from), щоб після входу повернути користувача назад.
// Захист на клієнті - лише зручність UI; справжня перевірка - на сервері (401/403).
export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return (
      <p
        role="alert"
        className="mx-auto max-w-lg rounded border border-red-300 bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-200"
      >
        Недостатньо прав: цей розділ доступний лише для ролей: {roles.join(', ')}.
      </p>
    );
  }

  return <>{children}</>;
}
