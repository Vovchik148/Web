import { useState } from 'react';
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react';

export interface ComboboxOptionItem {
  value: string;
  label: string;
}

interface ComboboxFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOptionItem[];
  placeholder?: string;
  error?: string;
}

// Випадне меню з пошуком (Headless UI Combobox): доступне з клавіатури,
// фільтрує опції під час набору. Керується як звичайне controlled-поле
// (value/onChange), тому в формах React Hook Form підключається через setValue.
export default function ComboboxField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
}: ComboboxFieldProps) {
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value) ?? null;
  const filtered =
    query === ''
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <Combobox
        immediate
        value={selected}
        onChange={(opt) => onChange(opt ? opt.value : '')}
        onClose={() => setQuery('')}
      >
        <div className="relative">
          <ComboboxInput
            aria-label={label}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            displayValue={(opt: ComboboxOptionItem | null) => opt?.label ?? ''}
            placeholder={placeholder}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ComboboxOptions className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {filtered.length === 0 && query !== '' && (
              <div className="px-3 py-2 text-sm text-gray-500">Нічого не знайдено</div>
            )}
            {filtered.map((o) => (
              <ComboboxOption
                key={o.value}
                value={o}
                className="cursor-pointer px-3 py-2 text-sm data-focus:bg-primary-50 dark:data-focus:bg-gray-700"
              >
                {o.label}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        </div>
      </Combobox>
      {error && (
        <span role="alert" className="mt-1 block text-sm text-red-500">
          {error}
        </span>
      )}
    </div>
  );
}
