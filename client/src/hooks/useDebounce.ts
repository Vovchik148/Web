import { useEffect, useState } from 'react';

// Повертає значення із затримкою: запит пошуку йде, коли користувач
// зробив паузу в наборі (без debounce запит ішов би після кожної клавіші)
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
