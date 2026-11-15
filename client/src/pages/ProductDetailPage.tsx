import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productsService } from '@/services/products.service';
import { movementsService } from '@/services/movements.service';
import { warehousesService } from '@/services/catalog.services';
import {
  movementSchema,
  type MovementFormData,
  type MovementFormInput,
} from '@/schemas/movement.schema';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { formatDate, formatPrice } from '@/utils/format';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import ConfirmModal from '@/components/common/ConfirmModal';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import { DetailSkeleton } from '@/components/common/Skeleton';

// Детальна сторінка товару (рівень 3): вся інформація + залишки по складах
// + форма операції руху (єдиний спосіб зміни залишку) + останні рухи.
export default function ProductDetailPage() {
  const id = Number(useParams<{ id: string }>().id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    data: product,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['products', id],
    queryFn: () => productsService.getById(id),
    enabled: Number.isInteger(id) && id > 0,
  });

  const { data: recentMovements } = useQuery({
    queryKey: ['movements', id],
    queryFn: () => movementsService.getByProduct(id, 5),
    enabled: Number.isInteger(id) && id > 0,
  });

  const deleteProduct = useMutation({
    mutationFn: () => productsService.remove(id),
    onSuccess: async () => {
      toast.success('Товар видалено');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Не вдалося видалити товар')),
  });

  if (!Number.isInteger(id) || id < 1) {
    return <NotFoundMessage />;
  }

  if (isPending) return <DetailSkeleton />;

  if (isError) {
    return (
      <p
        role="alert"
        className="mx-auto max-w-lg rounded border border-red-300 bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-200"
      >
        {getErrorMessage(error)}
        <Link to="/products" className="ml-2 underline">
          До списку товарів
        </Link>
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { label: 'Панель', to: '/dashboard' },
          { label: 'Товари', to: '/products' },
          { label: product.name },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="mt-1 flex items-center gap-2">
            <Badge variant="primary">{product.sku}</Badge>
            <Badge variant={product.isActive ? 'success' : 'neutral'}>
              {product.isActive ? 'активний' : 'неактивний'}
            </Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/products/${product.id}/edit`}>
            <Button variant="secondary">Редагувати</Button>
          </Link>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Видалити
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailItem label="Категорія">{product.category?.name ?? '—'}</DetailItem>
          <DetailItem label="Постачальник">{product.supplier?.name ?? '—'}</DetailItem>
          <DetailItem label="Ціна">{formatPrice(product.price)}</DetailItem>
          <DetailItem label="Мінімальний залишок">
            {product.minStock} {product.unit}
          </DetailItem>
          <DetailItem label="Сумарний залишок">
            <Badge
              variant={
                product.totalQuantity > product.minStock
                  ? 'success'
                  : product.totalQuantity > 0
                    ? 'warning'
                    : 'danger'
              }
            >
              {product.totalQuantity} {product.unit}
            </Badge>
          </DetailItem>
          <DetailItem label="Створено">{formatDate(product.createdAt)}</DetailItem>
          <DetailItem label="Оновлено">{formatDate(product.updatedAt)}</DetailItem>
        </dl>

        {product.description && (
          <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">Опис</h2>
            <p className="text-gray-700 dark:text-gray-300">{product.description}</p>
          </div>
        )}

        {/* Залишки по складах (GET /api/products/:id повертає stocks з warehouse) */}
        {Array.isArray(product.stocks) && (
          <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">
              Залишки на складах
            </h2>
            <ul className="space-y-1">
              {product.stocks.map((stock, index) => (
                <li key={stock.warehouse?.id ?? index} className="flex justify-between text-sm">
                  <span>{stock.warehouse?.name ?? `Склад #${index + 1}`}</span>
                  <span className="font-medium">
                    {stock.quantity} {product.unit}
                  </span>
                </li>
              ))}
              {product.stocks.length === 0 && (
                <li className="text-gray-500">Товар ще не розміщено на складах</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Операція руху: єдиний спосіб зміни залишку (журнал незмінний - audit trail) */}
      <StockMovementForm productId={product.id} unit={product.unit} stocks={product.stocks ?? []} />

      {/* Останні рухи цього товару */}
      {recentMovements && recentMovements.data.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">Останні рухи</h2>
          <ul className="space-y-2">
            {recentMovements.data.map((movement) => (
              <li key={movement.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Badge
                    variant={
                      movement.type === 'INBOUND'
                        ? 'success'
                        : movement.type === 'OUTBOUND'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {movement.type}
                  </Badge>
                  <span>
                    {movement.type === 'ADJUSTMENT' && movement.quantity > 0 ? '+' : ''}
                    {movement.quantity} шт · {movement.warehouse?.name ?? '—'}
                  </span>
                </span>
                <span className="text-gray-400">{formatDate(movement.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        title="Видалення товару"
        message={`Видалити товар "${product.name}" (SKU ${product.sku})? Дію не можна скасувати.`}
        isPending={deleteProduct.isPending}
        onConfirm={() => deleteProduct.mutate()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

const MOVEMENT_TYPES = [
  { value: 'INBOUND', label: 'Надходження (+)' },
  { value: 'OUTBOUND', label: 'Відвантаження (−)' },
  { value: 'ADJUSTMENT', label: 'Коригування (±)' },
] as const;

// Форма операції руху: зміна залишку товару на складі.
// Залишки НЕ редагуються напряму - кожна зміна фіксується як незмінний запис
// журналу руху (audit trail), залишок перераховується на сервері в транзакції.
function StockMovementForm({
  productId,
  unit,
  stocks,
}: {
  productId: number;
  unit: string;
  stocks: Array<{ quantity: number; warehouse?: { id: number; name: string } }>;
}) {
  const queryClient = useQueryClient();

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses', 'for-form'],
    queryFn: () => warehousesService.getAll({ limit: 100 }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MovementFormInput, unknown, MovementFormData>({
    resolver: zodResolver(movementSchema),
  });

  const createMovement = useMutation({
    mutationFn: (data: MovementFormData) => movementsService.create({ ...data, productId }),
    onSuccess: async (movement) => {
      toast.success(
        `Операцію ${movement.type} на ${movement.quantity} ${unit} виконано (склад "${movement.warehouse?.name}")`
      );
      // Оновлюємо детальну інформацію (залишки), список товарів та історію рухів
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products', productId] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['movements', productId] }),
      ]);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Операцію не виконано')),
  });

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-1 text-sm font-semibold uppercase text-gray-500">Операція зі складом</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Залишок змінюється лише через операцію руху - кожна зміна фіксується в незмінному журналі
        (audit trail).
      </p>

      <form
        onSubmit={handleSubmit((data) => createMovement.mutate(data))}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        noValidate
      >
        <FormField label="Склад" error={errors.warehouseId?.message}>
          <select
            aria-label="Склад операції"
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            {...register('warehouseId')}
          >
            <option value="">Оберіть склад...</option>
            {warehouses?.data.map((w) => {
              const current = stocks.find((s) => s.warehouse?.id === w.id)?.quantity;
              return (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {current !== undefined ? ` (зараз: ${current} ${unit})` : ''}
                </option>
              );
            })}
          </select>
        </FormField>

        <FormField label="Тип операції" error={errors.type?.message}>
          <select
            aria-label="Тип операції"
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            {...register('type')}
          >
            {MOVEMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Кількість" error={errors.quantity?.message}>
          <Input type="number" placeholder="10" {...register('quantity')} />
        </FormField>

        <FormField label="Примітка (необов'язково)" error={errors.note?.message}>
          <Input placeholder="інвентаризація, партія №..." {...register('note')} />
        </FormField>

        <div className="sm:col-span-2 lg:col-span-4">
          <Button type="submit" isLoading={createMovement.isPending || isSubmitting}>
            Виконати операцію
          </Button>
        </div>
      </form>
    </div>
  );
}

function NotFoundMessage() {
  return (
    <p
      role="alert"
      className="mx-auto max-w-lg rounded border border-red-300 bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-200"
    >
      Некоректний ідентифікатор товару.{' '}
      <Link to="/products" className="underline">
        До списку товарів
      </Link>
    </p>
  );
}
