import { Fragment } from 'react';
import { Link } from 'react-router';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

// Хлібні крихти: поточний елемент - звичайний текст, попередні - посилання
export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Хлібні крихти" className="mb-4 text-sm text-gray-500 dark:text-gray-400">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="mx-2">/</span>}
          {item.to ? (
            <Link to={item.to} className="hover:text-primary-600 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
