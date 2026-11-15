import { Link } from 'react-router';
import Button from '@/components/common/Button';
import { ROUTES } from '@/constants';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md text-center">
      <p className="text-8xl font-bold text-primary-600">404</p>
      <h1 className="mb-2 mt-4 text-2xl font-semibold">Сторінку не знайдено</h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">
        Такого маршруту не існує. Перевір адресу або повернись на головну.
      </p>
      <Link to={ROUTES.HOME}>
        <Button>На головну</Button>
      </Link>
    </div>
  );
}
