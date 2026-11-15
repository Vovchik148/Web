import type { ComponentProps } from 'react';

// У React 19 ref передається як звичайний проп, тому forwardRef не потрібен.
// Це важливо для React Hook Form (лабораторна робота 5), який зберігає
// ref поля через register().
export default function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={`w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 ${className}`}
      {...props}
    />
  );
}
