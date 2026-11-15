import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productsService, type ProductsQuery } from '@/services/products.service';
import { categoriesService } from '@/services/catalog.services';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { Product } from '@/types/api.types';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import ConfirmModal from '@/components/common/ConfirmModal';
import Input from '@/components/common/Input';
import Pagination from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/Skeleton';
import { formatPrice } from '@/utils/format';

type SortField = NonNullable<ProductsQuery['sortBy']>;

const SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: 'createdAt', label: 'За датою' },
  { value: 'name', label: 'За назвою' },
  { value: 'sku', label: 'За SKU' },
  { value: 'price', label: 'За ціною' },
];

// Список товарів: пошук (debounce), фільтри, сортування, пагінація, видалення.
// Усі дані - через TanStack Query; ключ запиту містить усі параметри.
export default function ProductsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [deleting, setDeleting] = useState<Product | null>(null);

  const debouncedSearch = useDebounce(search);
  const queryClient = useQueryClient();

  const filters = {
    search: debouncedSearch || undefined,
    categoryId: categoryId ? Number(categoryId) : undefined,
    isActive: isActive === '' ? undefined : isActive === 'true',
    sortBy,
    order,
  };

  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: ['products', { page, ...filters }],
    queryFn: () => productsService.getAll({ page, limit: 10, ...filters }),
    placeholderData: keepPreviousData,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', 'for-filter'],
    queryFn: () => categoriesService.getAll({ limit: 100 }),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: number) => productsService.remove(id),
    onSuccess: () => {
      toast.success('Товар видалено');
      setDeleting(null);
      return queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Не вдалося видалити товар')),
  });

  const changePage = (next: number) => {
    setPage(next);
    // нова сторінка - прокрутка вгору, щоб не залишитися внизу списку
    window.scrollTo({ top: 0 });
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Панель', to: '/dashboard' }, { label: 'Товари' }]} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Товари</h1>
        <Link to="/products/create">
          <Button>Додати товар</Button>
        </Link>
      </div>

      {/* Пошук, фільтри, сортування */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          aria-label="Пошук товарів"
          placeholder="Пошук за назвою або SKU..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1); // новий пошук - з першої сторінки
          }}
        />
        <select
          aria-label="Фільтр за категорією"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="">Усі категорії</option>
          {categories?.data.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Фільтр за статусом"
          value={isActive}
          onChange={(e) => {
            setIsActive(e.target.value);
            setPage(1);
          }}
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="">Активні й неактивні</option>
          <option value="true">Лише активні</option>
          <option value="false">Лише неактивні</option>
        </select>
        <div className="flex gap-2">
          <select
            aria-label="Сортування"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            aria-label={`Порядок: ${order === 'asc' ? 'зростання' : 'спадання'} (перемкнути)`}
            className="rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          >
            {order === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {isPending && <TableSkeleton rows={6} />}
      {isError && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-200"
        >
          {getErrorMessage(error)}
        </p>
      )}

      {data && (
        <>
          <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-gray-900">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['SKU', 'Назва', 'Категорія', 'Ціна', 'Залишок', 'Статус', 'Дії'].map(
                    (title) => (
                      <th
                        key={title}
                        className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500"
                      >
                        {title}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.data.map((product) => (
                  <tr key={product.id} className={isFetching ? 'opacity-60' : undefined}>
                    <td className="px-4 py-3">
                      <Link
                        to={`/products/${product.id}`}
                        className="font-mono text-sm text-primary-600 hover:underline"
                      >
                        {product.sku}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/products/${product.id}`}
                        className="hover:text-primary-600 hover:underline"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{product.category?.name ?? '—'}</td>
                    <td className="px-4 py-3">{formatPrice(product.price)}</td>
                    <td className="px-4 py-3">
                      {product.totalQuantity} {product.unit}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={product.isActive ? 'success' : 'neutral'}>
                        {product.isActive ? 'активний' : 'неактивний'}
                      </Badge>
                    </td>
                    <td className="space-x-2 px-4 py-3 text-right whitespace-nowrap">
                      <Link to={`/products/${product.id}/edit`}>
                        <Button size="sm" variant="secondary">
                          Редагувати
                        </Button>
                      </Link>
                      <Button size="sm" variant="danger" onClick={() => setDeleting(product)}>
                        Видалити
                      </Button>
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      Нічого не знайдено за поточними фільтрами
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={data.pagination.page}
            pages={data.pagination.pages}
            total={data.pagination.total}
            onChange={changePage}
            isLoading={isFetching}
          />
        </>
      )}

      {/* Власне модальне підтвердження замість системного confirm() */}
      <ConfirmModal
        isOpen={deleting !== null}
        title="Видалення товару"
        message={`Видалити товар "${deleting?.name}" (SKU ${deleting?.sku})? Дію не можна скасувати.`}
        isPending={deleteProduct.isPending}
        onConfirm={() => deleting && deleteProduct.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
