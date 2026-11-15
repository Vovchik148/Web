import { z } from 'zod';

// Операція руху товару (POST /api/movements) - єдиний спосіб зміни залишків.
// Правила узгоджені з валідаторами backend (routes/movements.js):
// INBOUND/OUTBOUND - quantity >= 1; ADJUSTMENT - ненульове ціле зі знаком.
export const movementSchema = z
  .object({
    warehouseId: z.coerce
      .number({ error: 'Оберіть склад' })
      .int()
      .gt(0, { error: 'Оберіть склад' }),
    type: z.enum(['INBOUND', 'OUTBOUND', 'ADJUSTMENT'], { error: 'Оберіть тип операції' }),
    quantity: z.coerce
      .number({ error: 'Кількість має бути цілим числом' })
      .int({ error: 'Кількість має бути цілим числом' })
      .max(1000000, { error: 'Кількість до 1 000 000 за модулем' }),
    note: z.preprocess(
      (v) => (v === '' || v === null ? undefined : v),
      z.string().trim().max(255, { error: 'Примітка не довша за 255 символів' }).optional()
    ),
  })
  .refine((data) => (data.type === 'ADJUSTMENT' ? data.quantity !== 0 : data.quantity >= 1), {
    error: 'INBOUND/OUTBOUND: кількість >= 1; ADJUSTMENT: ненульове значення зі знаком',
    path: ['quantity'],
  });

export type MovementFormInput = z.input<typeof movementSchema>;
export type MovementFormData = z.output<typeof movementSchema>;
