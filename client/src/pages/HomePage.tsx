import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import api from '@/services/api';
import type { PaginatedResponse, Product } from '@/types/api.types';
import type { AxiosError } from 'axios';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Loading from '@/components/common/Loading';
import { formatPrice, truncate } from '@/utils/format';

// Головна сторінка: каталог товарів із серверної частини.
// Демонструє Axios з типами, interceptor'ами, стан завантаження і помилки.
export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Зміна ключа перезапускає завантаження (кнопка "Спробувати знову")
  const [reloadKey, setReloadKey] = useState(0);

  // Канонічний патерн завантаження даних: усі setState - після await,
  // скасування - через AbortController при розмонтуванні/перезапуску
  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await api.get<PaginatedResponse<Product>>('/products', {
          params: { limit: 9 },
          signal: controller.signal,
        });
        setProducts(response.data.data);
        setTotal(response.data.pagination.total);
      } catch (err) {
        if (controller.signal.aborted) return; // запит скасовано - ігноруємо
        const axiosError = err as AxiosError;
        setError(
          axiosError.response?.status === 401
            ? 'Каталог доступний лише авторизованим користувачам. Сторінка входу з\u2019явиться в лабораторній роботі 5.'
            : axiosError.message === 'Network Error'
              ? 'Сервер недоступний. Запусти backend: npm run dev (у теці кореня репозиторію)'
              : (axiosError.message ?? 'Невідома помилка')
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [reloadKey]);

  // Обробник кнопки "Спробувати знову" (event handler, тому setState тут дозволений)
  const retry = () => {
    setIsLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  };

  if (isLoading) return <Loading label="Завантаження товарів..." />;

  if (error) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
        <Button className="mt-4" onClick={retry}>
          Спробувати знову
        </Button>
      </div>
    );
  }

  return (
    <section>
      <h1 className="mb-2 text-3xl font-bold">Каталог товарів</h1>
      <p className="mb-6 text-gray-500 dark:text-gray-400">
        Дані отримано з серверної частини через Axios: {total} товарів у системі (показано{' '}
        {products.length}).
      </p>

      {/* Адаптивна сітка: 1 колонка на мобільному, 2 - на планшеті, 3 - на десктопі */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
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

      {products.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          Товарів нема. Запусти <code>npm run db:seed</code> у теці серверної частини.
        </p>
      )}

      <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        Авторизація та управління будуть додані в наступних лабораторних роботах.{' '}
        <Link to="/about" className="text-primary-600 hover:underline">
          Детальніше про проєкт →
        </Link>
      </p>
    </section>
  );
}
