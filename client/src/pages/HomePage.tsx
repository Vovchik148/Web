import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { productsService } from '@/services/products.service';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { AxiosError } from 'axios';
import Button from '@/components/common/Button';
import { CardGridSkeleton } from '@/components/common/Skeleton';
import Badge from '@/components/common/Badge';
import Card from '@/components/common/Card';
import { formatPrice, truncate } from '@/utils/format';

// Головна сторінка - публічний каталог товарів.
// Гість бачить повідомлення про необхідність входу (товари вимагають авторизації),
// авторизований - картки товарів з живими даними через TanStack Query.
export default function HomePage() {
  const [reloadKey, setReloadKey] = useState(0);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['products', 'public-catalog', reloadKey],
    queryFn: () => productsService.getAll({ limit: 9 }),
    placeholderData: keepPreviousData,
    retry: false, // 401 гостя - не повторюємо запит
  });

  if (isPending) return <CardGridSkeleton count={6} />;

  if (isError) {
    const axiosError = error as AxiosError;
    return (
      <div className="mx-auto max-w-lg text-center">
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-200"
        >
          {axiosError.response?.status === 401
            ? 'Каталог доступний лише авторизованим користувачам. Увійдіть або зареєструйтеся.'
            : getErrorMessage(error)}
        </p>
        <div className="mt-4 flex justify-center gap-3">
          {axiosError.response?.status === 401 ? (
            <>
              <Link to="/login">
                <Button>Увійти</Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary">Реєстрація</Button>
              </Link>
            </>
          ) : (
            <Button onClick={() => setReloadKey((k) => k + 1)}>Спробувати знову</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <section>
      <h1 className="mb-2 text-3xl font-bold">Каталог товарів</h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">
        Дані отримано з серверної частини через TanStack Query: {data?.pagination.total} товарів у
        системі (показано {data?.data.length}).
      </p>

      {/* Адаптивна сітка: 1 колонка на мобільному, 2 - на планшеті, 3 - на десктопі */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.data.map((product) => (
          <Card key={product.id} hover className="flex flex-col justify-between">
            <div>
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="font-semibold">{product.name}</h2>
                <Badge variant={product.totalQuantity > 0 ? 'success' : 'danger'}>
                  {product.totalQuantity > 0 ? 'в наявності' : 'немає'}
                </Badge>
              </div>
              <Badge variant="primary">{product.sku}</Badge>
              {product.category && (
                <Badge variant="neutral" className="ml-2">
                  {product.category.name}
                </Badge>
              )}
              {product.description && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {truncate(product.description)}
                </p>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-lg font-bold text-primary-600">
                {formatPrice(product.price)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                залишок: {product.totalQuantity} {product.unit}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {data?.data.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          Товарів нема. Запусти <code>npm run db:seed</code> у теці серверної частини.
        </p>
      )}

      <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        Управління складом - в{' '}
        <Link to="/dashboard" className="text-primary-600 hover:underline">
          панелі керування →
        </Link>
      </p>
    </section>
  );
}
