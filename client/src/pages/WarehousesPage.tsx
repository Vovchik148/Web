import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { warehousesService } from '@/services/catalog.services';
import {
  warehouseSchema,
  type WarehouseFormData,
  type WarehouseFormInput,
} from '@/schemas/catalog.schema';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { Warehouse } from '@/types/api.types';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Button from '@/components/common/Button';
import ConfirmModal from '@/components/common/ConfirmModal';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Pagination from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/Skeleton';

// Склади: той самий шаблон, що й Категорії (список + модальна форма + видалення)
export default function WarehousesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [deleting, setDeleting] = useState<Warehouse | null>(null);
  const queryClient = useQueryClient();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['warehouses', { page, search: debouncedSearch }],
    queryFn: () =>
      warehousesService.getAll({ page, limit: 10, search: debouncedSearch || undefined }),
    placeholderData: keepPreviousData,
  });

  const deleteWarehouse = useMutation({
    mutationFn: (id: number) => warehousesService.remove(id),
    onSuccess: () => {
      toast.success('Склад видалено');
      setDeleting(null);
      return queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Не вдалося видалити склад')),
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Панель', to: '/dashboard' }, { label: 'Склади' }]} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Склади</h1>
        <Button onClick={() => setEditing({ id: 0, name: '', location: '', capacity: null })}>
          Додати склад
        </Button>
      </div>

      <Input
        aria-label="Пошук складів"
        placeholder="Пошук за назвою або локацією..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="mb-4"
      />

      {isPending && <TableSkeleton rows={5} />}
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
                  {['Назва', 'Локація', 'Місткість', 'Позицій', 'Дії'].map((title) => (
                    <th
                      key={title}
                      className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500"
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.data.map((warehouse) => (
                  <tr key={warehouse.id}>
                    <td className="px-4 py-3 font-medium">{warehouse.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {warehouse.location}
                    </td>
                    <td className="px-4 py-3">{warehouse.capacity ?? '—'}</td>
                    <td className="px-4 py-3">{warehouse.stockItemsCount ?? 0}</td>
                    <td className="space-x-2 px-4 py-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(warehouse)}>
                        Редагувати
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleting(warehouse)}>
                        Видалити
                      </Button>
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      Нічого не знайдено
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
            onChange={setPage}
          />
        </>
      )}

      {editing && (
        <WarehouseFormModal
          initial={editing.id ? editing : null}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmModal
        isOpen={deleting !== null}
        title="Видалення складу"
        message={`Видалити склад "${deleting?.name}"? Склад із залишками видалити не вдасться (backend поверне помилку).`}
        isPending={deleteWarehouse.isPending}
        onConfirm={() => deleting && deleteWarehouse.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

interface WarehouseFormModalProps {
  initial: Warehouse | null;
  onClose: () => void;
}

function WarehouseFormModal({ initial, onClose }: WarehouseFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = initial !== null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WarehouseFormInput, unknown, WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: initial ?? { name: '', location: '', capacity: undefined },
  });

  const save = useMutation({
    mutationFn: (data: WarehouseFormData) =>
      isEdit && initial
        ? warehousesService.update(initial.id, data)
        : warehousesService.create(data),
    onSuccess: async () => {
      toast.success(isEdit ? 'Склад оновлено' : 'Склад створено');
      await queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Помилка збереження')),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">
          {isEdit ? 'Редагувати склад' : 'Новий склад'}
        </h3>
        <form onSubmit={handleSubmit((data) => save.mutate(data))} className="space-y-4" noValidate>
          <FormField label="Назва" error={errors.name?.message}>
            <Input placeholder="Основний склад" {...register('name')} />
          </FormField>
          <FormField label="Локація" error={errors.location?.message}>
            <Input placeholder="м. Львів, вул. Промислова 5" {...register('location')} />
          </FormField>
          <FormField label="Місткість (необов'язково)" error={errors.capacity?.message}>
            <Input type="number" min="1" placeholder="10000" {...register('capacity')} />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Скасувати
            </Button>
            <Button type="submit" isLoading={save.isPending || isSubmitting}>
              Зберегти
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
