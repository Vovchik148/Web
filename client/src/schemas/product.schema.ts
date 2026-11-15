import { z } from 'zod';

// Схема товару - узгоджена з валідаторами backend (routes/products.js).
// Порожнє необов'язкове поле форми дає '', а не undefined: перетворюємо
// його на undefined перед перевіркою (z.preprocess).
const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

export const productSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(3, { error: 'SKU має містити від 3 до 50 символів' })
    .max(50, { error: 'SKU має містити від 3 до 50 символів' }),
  name: z
    .string()
    .trim()
    .min(2, { error: 'Назва має містити від 2 до 200 символів' })
    .max(200, { error: 'Назва має містити від 2 до 200 символів' }),
  description: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(1000, { error: 'Опис не довший за 1000 символів' }).optional()
  ),
  unit: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .min(1, { error: 'Одиниця: 1-20 символів' })
      .max(20, { error: 'Одиниця: 1-20 символів' })
      .optional()
  ),
  // Decimal у формі - рядок; на сервері price має бути числом >= 0
  price: z.coerce
    .number({ error: 'Ціна має бути числом' })
    .min(0, { error: 'Ціна має бути >= 0' })
    .max(99999999, { error: 'Ціна завелика' }),
  minStock: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce
      .number()
      .int({ error: 'minStock має бути цілим числом' })
      .min(0, { error: 'minStock має бути >= 0' })
      .optional()
  ),
  isActive: z.boolean().optional(),
  categoryId: z.coerce
    .number({ error: 'Оберіть категорію' })
    .int()
    .gt(0, { error: 'Оберіть категорію' }),
  supplierId: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().gt(0, { error: 'Некоректний постачальник' }).optional()
  ),
});

// Вхідний тип форми (поля - рядки/чекбокс) і вихідний (після перетворень Zod)
export type ProductFormInput = z.input<typeof productSchema>;
export type ProductFormData = z.output<typeof productSchema>;
