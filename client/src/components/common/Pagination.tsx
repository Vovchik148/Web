import Button from './Button';

interface PaginationProps {
  page: number;
  pages: number;
  total?: number;
  onChange: (page: number) => void;
  isLoading?: boolean;
}

// Пагінація списків: Назад/Далі + лічильник сторінок і загальна кількість записів
export default function Pagination({
  page,
  pages,
  total,
  onChange,
  isLoading = false,
}: PaginationProps) {
  return (
    <div className="mt-4 flex items-center justify-center gap-4">
      <Button
        variant="secondary"
        disabled={page <= 1 || isLoading}
        onClick={() => onChange(page - 1)}
      >
        Назад
      </Button>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Сторінка {page} з {Math.max(pages, 1)}
        {total !== undefined ? ` · усього ${total}` : ''}
      </span>
      <Button
        variant="secondary"
        disabled={page >= pages || isLoading}
        onClick={() => onChange(page + 1)}
      >
        Далі
      </Button>
    </div>
  );
}
