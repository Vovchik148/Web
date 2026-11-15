import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { registerSchema, type RegisterFormData } from '@/schemas/auth.schema';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { getErrorMessage } from '@/utils/getErrorMessage';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import FormField from '@/components/common/FormField';

export default function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async ({ firstName, lastName, email, password }: RegisterFormData) => {
    try {
      // confirmPassword на сервер не надсилаємо (перевірка лише на клієнті)
      const res = await authService.register({ firstName, lastName, email, password });
      // Сервер повертає токени одразу: авторизуємо користувача автоматично
      login(res.user, res.tokens.accessToken, res.tokens.refreshToken);
      toast.success('Обліковий запис створено');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setError('root', { message: getErrorMessage(error, 'Помилка реєстрації') });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-900">
        <h2 className="mb-6 text-center text-3xl font-bold">Реєстрація</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Ім'я" error={errors.firstName?.message}>
            <Input placeholder="Іван" autoComplete="given-name" {...register('firstName')} />
          </FormField>
          <FormField label="Прізвище" error={errors.lastName?.message}>
            <Input placeholder="Петренко" autoComplete="family-name" {...register('lastName')} />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <Input
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              {...register('email')}
            />
          </FormField>
          <FormField label="Пароль" error={errors.password?.message}>
            <Input
              type="password"
              placeholder="мала + велика літера, цифра"
              autoComplete="new-password"
              {...register('password')}
            />
          </FormField>
          <FormField label="Підтвердження пароля" error={errors.confirmPassword?.message}>
            <Input type="password" autoComplete="new-password" {...register('confirmPassword')} />
          </FormField>

          {errors.root && (
            <p role="alert" className="text-sm text-red-500">
              {errors.root.message}
            </p>
          )}

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Зареєструватися
          </Button>
        </form>

        <p className="mt-4 text-center text-sm">
          Вже є акаунт?{' '}
          <Link to="/login" className="text-primary-600 hover:underline">
            Увійти
          </Link>
        </p>
      </div>
    </div>
  );
}
