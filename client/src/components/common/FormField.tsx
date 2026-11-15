import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

// Підпис + поле + повідомлення про помилку: прибирає дублювання розмітки в усіх формах
export default function FormField({ label, error, children }: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-sm text-red-500">
          {error}
        </span>
      )}
    </label>
  );
}
