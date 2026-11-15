import { z } from 'zod';

// Схеми довідників - узгоджені з валідаторами backend
// (routes/categories.js, warehouses.js, suppliers.js)
const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: 'Назва має містити від 2 до 100 символів' })
    .max(100, { error: 'Назва має містити від 2 до 100 символів' }),
  description: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(500, { error: 'Опис не довший за 500 символів' }).optional()
  ),
});

export const warehouseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: 'Назва має містити від 2 до 100 символів' })
    .max(100, { error: 'Назва має містити від 2 до 100 символів' }),
  location: z
    .string()
    .trim()
    .min(2, { error: 'Локація обов\u2019язкова (до 255 символів)' })
    .max(255, { error: 'Локація обов\u2019язкова (до 255 символів)' }),
  capacity: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int({ error: 'Місткість має бути цілим числом' })
      .min(1, { error: 'Місткість має бути додатною' })
      .optional()
  ),
});

export const supplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: 'Назва має містити від 2 до 150 символів' })
    .max(150, { error: 'Назва має містити від 2 до 150 символів' }),
  email: z.preprocess(emptyToUndefined, z.email({ error: 'Невірний формат email' }).optional()),
  phone: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .min(5, { error: 'Телефон: 5-30 символів' })
      .max(30, { error: 'Телефон: 5-30 символів' })
      .optional()
  ),
  address: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(255, { error: 'Адреса не довша за 255 символів' }).optional()
  ),
});

// Зміна користувача адміном (PUT /api/users/:id): роль і статус
export const userEditSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'WORKER'], { error: 'Невірна роль' }),
  isActive: z.boolean(),
});

// Вхідні типи форм (поля - рядки; preprocessed поля дають unknown на вході)
// та вихідні (після перетворень Zod) - використовуються в useForm<Input, _, Output>
export type CategoryFormInput = z.input<typeof categorySchema>;
export type CategoryFormData = z.output<typeof categorySchema>;
export type WarehouseFormInput = z.input<typeof warehouseSchema>;
export type WarehouseFormData = z.output<typeof warehouseSchema>;
export type SupplierFormInput = z.input<typeof supplierSchema>;
export type SupplierFormData = z.output<typeof supplierSchema>;
export type UserEditFormData = z.output<typeof userEditSchema>;
