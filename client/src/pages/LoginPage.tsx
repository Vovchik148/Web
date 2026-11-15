import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router';
import { loginSchema, type LoginFormData } from '@/schemas/auth.schema';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { getErrorMessage } from '@/utils/getErrorMessage';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import FormField from '@/components/common/FormField';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  // Куди повернути користувача після входу (запам'ятав ProtectedRoute)
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const res = await authService.login(data.email, data.password);
      // Акаунт з увімкненою 2FA (лаб. 2): login повертає tempToken замість токенів.
      // Другий крок входу буде підтримано в UI пізніше.
      if (res.twoFactorRequired) {
        setError('root', {
          message:
            'Акаунт захищено двофакторною автентифікацією. Введіть код із застосунку-аутентифікатора у формі нижче або тимчасово вимкніть 2FA.',
        });
        return;
      }
      login(res.user, res.tokens.accessToken, res.tokens.refreshToken);
      navigate(from, { replace: true });
    } catch (error) {
      setError('root', { message: getErrorMessage(error, 'Помилка входу') });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-900">
        <h2 className="mb-6 text-center text-3xl font-bold">Вхід</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Email" error={errors.email?.message}>
            <Input
              type="email"
              placeholder="admin@warehouse.com"
              autoComplete="email"
              {...register('email')}
            />
          </FormField>

          <FormField label="Пароль" error={errors.password?.message}>
            <Input
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
            />
          </FormField>

          {errors.root && (
            <p role="alert" className="text-sm text-red-500">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Увійти
          </Button>
        </form>

        <p className="mt-4 text-center text-sm">
          Немає акаунта?{' '}
          <Link to="/register" className="text-primary-600 hover:underline">
            Зареєструватися
          </Link>
        </p>
      </div>
    </div>
  );
}
