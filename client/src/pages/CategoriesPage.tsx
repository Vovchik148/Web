import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { categoriesService } from '@/services/catalog.services';
import {
  categorySchema,
  type CategoryFormData,
  type CategoryFormInput,
} from '@/schemas/catalog.schema';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { Category } from '@/types/api.types';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Button from '@/components/common/Button';
import ConfirmModal from '@/components/common/ConfirmModal';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Pagination from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/Skeleton';

// Довідник категорій: список + модальна форма створення/редагування + видалення.
// Сторінки складів і постачальників побудовані за цим самим шаблоном.
export default function CategoriesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [editing, setEditing] = useState<Category | null>(null); // форма create/edit
  const [deleting, setDeleting] = useState<Category | null>(null);
  const queryClient = useQueryClient();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['categories', { page, search: debouncedSearch }],
    queryFn: () =>
      categoriesService.getAll({ page, limit: 10, search: debouncedSearch || undefined }),
    placeholderData: keepPreviousData,
  });

  const deleteCategory = useMutation({
    mutationFn: (id: number) => categoriesService.remove(id),
    onSuccess: () => {
      toast.success('Категорію видалено');
      setDeleting(null);
      return queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Не вдалося видалити категорію')),
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Панель', to: '/dashboard' }, { label: 'Категорії' }]} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Категорії</h1>
        <Button onClick={() => setEditing({ id: 0, name: '', description: null })}>
          Додати категорію
        </Button>
      </div>

      <Input
        aria-label="Пошук категорій"
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
                  {['Назва', 'Опис', 'Товарів', 'Дії'].map((title) => (
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
                {data.data.map((category) => (
                  <tr key={category.id}>
                    <td className="px-4 py-3 font-medium">{category.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {category.description ?? '—'}
                    </td>
                    <td className="px-4 py-3">{category.productCount ?? 0}</td>
                    <td className="space-x-2 px-4 py-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(category)}>
                        Редагувати
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={deleteCategory.isPending}
                        onClick={() => setDeleting(category)}
                      >
                        Видалити
                      </Button>
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
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

      {/* Модальна форма створення/редагування */}
      {editing && (
        <CategoryFormModal initial={editing.id ? editing : null} onClose={() => setEditing(null)} />
      )}

      <ConfirmModal
        isOpen={deleting !== null}
        title="Видалення категорії"
        message={`Видалити категорію "${deleting?.name}"? Категорію з товарами видалити не вдасться (backend поверне помилку).`}
        isPending={deleteCategory.isPending}
        onConfirm={() => deleting && deleteCategory.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

interface CategoryFormModalProps {
  initial: Category | null; // null -> створення
  onClose: () => void;
}

function CategoryFormModal({ initial, onClose }: CategoryFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = initial !== null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormInput, unknown, CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: initial ?? { name: '', description: '' },
  });

  const save = useMutation({
    mutationFn: (data: CategoryFormData) =>
      isEdit && initial
        ? categoriesService.update(initial.id, data)
        : categoriesService.create(data),
    onSuccess: async () => {
      toast.success(isEdit ? 'Категорію оновлено' : 'Категорію створено');
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
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
          {isEdit ? 'Редагувати категорію' : 'Нова категорія'}
        </h3>
        <form onSubmit={handleSubmit((data) => save.mutate(data))} className="space-y-4" noValidate>
          <FormField label="Назва" error={errors.name?.message}>
            <Input placeholder="Електроніка" {...register('name')} />
          </FormField>
          <FormField label="Опис (необов'язково)" error={errors.description?.message}>
            <textarea
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
              {...register('description')}
            />
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
