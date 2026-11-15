import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  productSchema,
  type ProductFormData,
  type ProductFormInput,
} from '@/schemas/product.schema';
import { productsService } from '@/services/products.service';
import { categoriesService, suppliersService } from '@/services/catalog.services';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { Product } from '@/types/api.types';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import { DetailSkeleton } from '@/components/common/Skeleton';

// Форма товару, спільна для створення й редагування.
// editId: undefined -> створення; число -> редагування (дані підвантажуються в defaultValues).
export function ProductForm({ editId }: { editId?: number }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Довідники для select'ів
  const { data: categories } = useQuery({
    queryKey: ['categories', 'for-form'],
    queryFn: () => categoriesService.getAll({ limit: 100 }),
  });
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', 'for-form'],
    queryFn: () => suppliersService.getAll({ limit: 100 }),
  });

  // При редагуванні - завантаження запису у форму
  const { data: existing, isPending: isProductLoading } = useQuery({
    queryKey: ['products', editId],
    queryFn: () => productsService.getById(editId!),
    enabled: editId !== undefined,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormInput, unknown, ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { isActive: true, unit: 'шт' },
  });

  useEffect(() => {
    if (existing) resetProductForm(existing, reset);
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (data: ProductFormData) =>
      editId !== undefined ? productsService.update(editId, data) : productsService.create(data),
    onSuccess: async (product) => {
      toast.success(editId !== undefined ? 'Товар оновлено' : 'Товар створено');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate(`/products/${product.id}`);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Помилка збереження товару')),
  });

  if (editId !== undefined && isProductLoading) return <DetailSkeleton />;

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="space-y-4 rounded-lg bg-white p-6 shadow dark:bg-gray-900"
      noValidate
    >
      <FormField label="SKU" error={errors.sku?.message}>
        <Input placeholder="OF-0001" {...register('sku')} />
      </FormField>

      <FormField label="Назва" error={errors.name?.message}>
        <Input placeholder="Папір A4 (500 арк.)" {...register('name')} />
      </FormField>

      <FormField label="Опис (необов'язково)" error={errors.description?.message}>
        <textarea
          rows={3}
          className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800"
          {...register('description')}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Ціна (грн)" error={errors.price?.message}>
          <Input type="number" step="0.01" min="0" placeholder="100.00" {...register('price')} />
        </FormField>
        <FormField label="Одиниця" error={errors.unit?.message}>
          <Input placeholder="шт" {...register('unit')} />
        </FormField>
        <FormField label="Мінімальний залишок" error={errors.minStock?.message}>
          <Input type="number" min="0" placeholder="10" {...register('minStock')} />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Категорія" error={errors.categoryId?.message}>
          <select
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            {...register('categoryId')}
          >
            <option value="">Оберіть категорію...</option>
            {categories?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Постачальник (необов'язково)" error={errors.supplierId?.message}>
          <select
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            {...register('supplierId')}
          >
            <option value="">Без постачальника</option>
            {suppliers?.data.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4" {...register('isActive')} />
        Активний товар (доступний для оприбуткування)
      </label>

      <div className="flex gap-4">
        <Button type="submit" isLoading={mutation.isPending}>
          {editId !== undefined ? 'Зберегти' : 'Створити'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
          Скасувати
        </Button>
      </div>
    </form>
  );
}

// Заповнення форми даними товару (Decimal-ціна -> рядок для input)
function resetProductForm(product: Product, reset: (values: Partial<ProductFormInput>) => void) {
  reset({
    sku: product.sku,
    name: product.name,
    description: product.description ?? '',
    unit: product.unit,
    price: String(product.price),
    minStock: String(product.minStock),
    isActive: product.isActive,
    categoryId: String(product.categoryId),
    supplierId: product.supplierId ? String(product.supplierId) : '',
  });
}
