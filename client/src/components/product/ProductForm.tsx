import { Suspense, lazy, useEffect } from 'react';
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
import ComboboxField from '@/components/common/ComboboxField';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import ImageUploader from '@/components/common/ImageUploader';
import { DetailSkeleton } from '@/components/common/Skeleton';

// Розширений редактор опису (Tiptap) важкий - lazy в окремий chunk (рівень 3)
const RichTextEditor = lazy(() => import('@/components/common/RichTextEditor'));

// Форма товару, спільна для створення й редагування.
// editId: undefined -> створення; число -> редагування (дані підвантажуються в defaultValues).
export function ProductForm({ editId }: { editId?: number }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Довідники для Combobox'ів (випадне меню з пошуком - лабораторна робота 6)
  const { data: categories } = useQuery({
    queryKey: ['categories', 'for-form'],
    queryFn: () => categoriesService.getAll({ limit: 100 }),
  });
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', 'for-form'],
    queryFn: () => suppliersService.getAll({ limit: 100 }),
  });

  const categoryOptions = (categories?.data ?? []).map((c) => ({
    value: String(c.id),
    label: c.name,
  }));
  const supplierOptions = (suppliers?.data ?? []).map((s) => ({
    value: String(s.id),
    label: s.name,
  }));

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
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormInput, unknown, ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { isActive: true, unit: 'шт', description: '' },
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

      <div>
        <span className="mb-1 block text-sm font-medium">
          Опис (необов'язково — можна форматувати текст)
        </span>
        {/* Важкий редактор - lazy + Suspense (код спліттінг) */}
        <Suspense fallback={<div className="h-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />}>
          <RichTextEditor
            value={(watch('description') as string) ?? ''}
            onChange={(html) => setValue('description', html)}
            placeholder="Форматований опис товару: список характеристик, жирний шрифт тощо"
          />
        </Suspense>
        {errors.description && (
          <span role="alert" className="mt-1 block text-sm text-red-500">
            {errors.description.message}
          </span>
        )}
      </div>

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
        {/* Випадне меню з пошуком (Headless UI Combobox, рівень 1) */}
        <ComboboxField
          label="Категорія"
          value={String((watch('categoryId') as string) ?? '')}
          onChange={(value) => setValue('categoryId', value)}
          options={categoryOptions}
          placeholder="Пошук категорії..."
          error={errors.categoryId?.message}
        />
        <ComboboxField
          label="Постачальник (необов'язково)"
          value={String((watch('supplierId') as string) ?? '')}
          onChange={(value) => setValue('supplierId', value)}
          options={supplierOptions}
          placeholder="Пошук постачальника..."
          error={errors.supplierId?.message}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4" {...register('isActive')} />
        Активний товар (доступний для оприбуткування)
      </label>

      {/* Завантаження зображення з обрізанням (рівень 2) -> файловий сервіс лаб. 2 */}
      <div className="rounded border border-dashed border-gray-300 p-4 dark:border-gray-600">
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          Зображення товару (зберігається у файловому сховищі сервера):
        </p>
        <ImageUploader />
      </div>

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
