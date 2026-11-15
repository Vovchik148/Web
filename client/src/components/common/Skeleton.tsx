interface SkeletonProps {
  className?: string;
}

// Базовий скелет: сірий блок з анімацією "пульсу"
export default function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />;
}

// Скелет таблиці: рядки з "клітинками"
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="space-y-4 rounded-lg bg-white p-4 shadow dark:bg-gray-900"
      aria-busy="true"
      aria-label="Завантаження"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
      ))}
    </div>
  );
}

// Скелет сітки карток (каталог, dashboard)
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Завантаження"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <Skeleton className="mb-3 h-6 w-2/3" />
          <Skeleton className="mb-2 h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

// Скелет детальної сторінки
export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl" aria-busy="true" aria-label="Завантаження">
      <Skeleton className="mb-4 h-9 w-1/2" />
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <Skeleton className="mb-4 h-5 w-1/3" />
        <Skeleton className="mb-3 h-4 w-full" />
        <Skeleton className="mb-3 h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
