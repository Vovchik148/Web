interface LoadingProps {
  // текст під спінером (наприклад, "Завантаження товарів...")
  label?: string;
}

export default function Loading({ label = 'Завантаження...' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" role="status">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600 dark:border-gray-700 dark:border-t-primary-400" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
