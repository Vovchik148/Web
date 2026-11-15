import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { suppliersService } from '@/services/catalog.services';
import {
  supplierSchema,
  type SupplierFormData,
  type SupplierFormInput,
} from '@/schemas/catalog.schema';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { Supplier } from '@/types/api.types';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Button from '@/components/common/Button';
import ConfirmModal from '@/components/common/ConfirmModal';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Pagination from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/Skeleton';

// Постачальники: той самий шаблон, що й Категорії/Склади
export default function SuppliersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const queryClient = useQueryClient();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['suppliers', { page, search: debouncedSearch }],
    queryFn: () =>
      suppliersService.getAll({ page, limit: 10, search: debouncedSearch || undefined }),
    placeholderData: keepPreviousData,
  });

  const deleteSupplier = useMutation({
    mutationFn: (id: number) => suppliersService.remove(id),
    onSuccess: () => {
      toast.success('Постачальника видалено');
      setDeleting(null);
      return queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Не вдалося видалити постачальника')),
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Панель', to: '/dashboard' }, { label: 'Постачальники' }]} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Постачальники</h1>
        <Button
          onClick={() => setEditing({ id: 0, name: '', email: null, phone: null, address: null })}
        >
          Додати постачальника
        </Button>
      </div>

      <Input
        aria-label="Пошук постачальників"
        placeholder="Пошук за назвою..."
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
                  {['Назва', 'Email', 'Телефон', 'Товарів', 'Дії'].map((title) => (
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
                {data.data.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="px-4 py-3 font-medium">{supplier.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {supplier.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {supplier.phone ?? '—'}
                    </td>
                    <td className="px-4 py-3">{supplier.productCount ?? 0}</td>
                    <td className="space-x-2 px-4 py-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(supplier)}>
                        Редагувати
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleting(supplier)}>
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
        <SupplierFormModal initial={editing.id ? editing : null} onClose={() => setEditing(null)} />
      )}

      <ConfirmModal
        isOpen={deleting !== null}
        title="Видалення постачальника"
        message={`Видалити постачальника "${deleting?.name}"?`}
        isPending={deleteSupplier.isPending}
        onConfirm={() => deleting && deleteSupplier.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

interface SupplierFormModalProps {
  initial: Supplier | null;
  onClose: () => void;
}

function SupplierFormModal({ initial, onClose }: SupplierFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = initial !== null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormInput, unknown, SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: initial ?? { name: '', email: '', phone: '', address: '' },
  });

  const save = useMutation({
    mutationFn: (data: SupplierFormData) =>
      isEdit && initial ? suppliersService.update(initial.id, data) : suppliersService.create(data),
    onSuccess: async () => {
      toast.success(isEdit ? 'Постачальника оновлено' : 'Постачальника створено');
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
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
          {isEdit ? 'Редагувати постачальника' : 'Новий постачальник'}
        </h3>
        <form onSubmit={handleSubmit((data) => save.mutate(data))} className="space-y-4" noValidate>
          <FormField label="Назва" error={errors.name?.message}>
            <Input placeholder="ТехПостач" {...register('name')} />
          </FormField>
          <FormField label="Email (необов'язково)" error={errors.email?.message}>
            <Input type="email" placeholder="sales@techpostach.ua" {...register('email')} />
          </FormField>
          <FormField label="Телефон (необов'язково)" error={errors.phone?.message}>
            <Input placeholder="+380441234567" {...register('phone')} />
          </FormField>
          <FormField label="Адреса (необов'язково)" error={errors.address?.message}>
            <Input placeholder="м. Київ, вул. Промислова 5" {...register('address')} />
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
