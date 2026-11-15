import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { DayPicker } from 'react-day-picker';
import { uk } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import type { DateRange } from 'react-day-picker';
import { movementsService } from '@/services/movements.service';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { formatDate } from '@/utils/format';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { TableSkeleton } from '@/components/common/Skeleton';

const TYPE_LABELS: Record<string, { label: string; variant: 'success' | 'danger' | 'warning' }> = {
  INBOUND: { label: 'надходження', variant: 'success' },
  OUTBOUND: { label: 'відвантаження', variant: 'danger' },
  ADJUSTMENT: { label: 'коригування', variant: 'warning' },
};

// Журнал рухів (рівень 2): нескінченне прокручування (useInfiniteQuery +
// IntersectionObserver) та фільтр за датами (react-day-picker, календар).
export default function MovementsPage() {
  const [range, setRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const from = range?.from?.toISOString();
  const to = range?.to?.toISOString();

  const { data, isPending, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['movements', 'infinite', { from, to }],
      queryFn: ({ pageParam }) =>
        movementsService.getAll({ page: pageParam, limit: 10, from, to }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.pagination.page < lastPage.pagination.pages
          ? lastPage.pagination.page + 1
          : undefined,
    });

  // Елемент-"сторож" в кінці списку: коли він з'являється у viewport -
  // довантажуємо наступну сторінку
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const movements = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Панель', to: '/dashboard' }, { label: 'Журнал рухів' }]} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Журнал рухів</h1>
        <div className="relative">
          <Button variant="secondary" onClick={() => setCalendarOpen((o) => !o)}>
            {range?.from
              ? `${formatDate(range.from.toISOString())}${range.to ? ` — ${formatDate(range.to.toISOString())}` : ' — …'}`
              : 'Фільтр за датами'}
          </Button>
          {calendarOpen && (
            <div className="absolute right-0 z-30 mt-2 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <DayPicker
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={1}
                locale={uk}
              />
              {range && (
                <Button size="sm" variant="secondary" onClick={() => setRange(undefined)}>
                  Скинути фільтр
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {isPending && <TableSkeleton rows={8} />}
      {isError && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-200"
        >
          {getErrorMessage(error)}
        </p>
      )}

      {data && (
        <>
          <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-gray-900">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['Дата', 'Тип', 'Товар', 'Склад', 'Кількість', 'Хто', 'Примітка'].map((title) => (
                    <th
                      key={title}
                      className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500"
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(m.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={TYPE_LABELS[m.type]?.variant ?? 'neutral'}>
                        {TYPE_LABELS[m.type]?.label ?? m.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{m.product?.name ?? `#${m.productId}`}</td>
                    <td className="px-4 py-3">{m.warehouse?.name ?? `#${m.warehouseId}`}</td>
                    <td className="px-4 py-3 font-medium">
                      {m.type === 'INBOUND' && '+'}
                      {m.type === 'OUTBOUND' && '−'}
                      {m.quantity}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {m.user ? `${m.user.firstName} ${m.user.lastName}` : '—'}
                    </td>
                    <td className="max-w-48 truncate px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {m.note ?? '—'}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      Рухів не знайдено за обраний період
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Сторож нескінченного прокручування */}
          <div ref={sentinelRef} className="flex justify-center py-6">
            {isFetchingNextPage && (
              <span className="text-sm text-gray-500 dark:text-gray-400">Завантаження...</span>
            )}
            {!hasNextPage && movements.length > 0 && (
              <span className="text-sm text-gray-400">Кінець журналу</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
