import { z } from 'zod';

// Схеми аутентифікації - правила узгоджені з валідаторами backend
// (routes/auth.js): пароль 8-72 символи, мала + велика літера та цифра

export const loginSchema = z.object({
  email: z.email({ error: 'Невірний формат email' }),
  password: z.string().min(1, { error: 'Пароль обов\u2019язковий' }),
});

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, { error: 'Ім\u2019я має містити від 2 до 50 символів' })
      .max(50, { error: 'Ім\u2019я має містити від 2 до 50 символів' }),
    lastName: z
      .string()
      .trim()
      .min(2, { error: 'Прізвище має містити від 2 до 50 символів' })
      .max(50, { error: 'Прізвище має містити від 2 до 50 символів' }),
    email: z.email({ error: 'Невірний формат email' }),
    password: z
      .string()
      .min(8, { error: 'Пароль має містити від 8 до 72 символів' })
      .max(72, { error: 'Пароль має містити від 8 до 72 символів' })
      .regex(/[a-z]/, { error: 'Пароль має містити малу літеру' })
      .regex(/[A-Z]/, { error: 'Пароль має містити велику літеру' })
      .regex(/\d/, { error: 'Пароль має містити цифру' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'Паролі не збігаються',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
