import type { ComponentProps } from 'react';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps extends ComponentProps<'span'> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-100',
  success: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200',
};

export default function Badge({
  variant = 'neutral',
  className = '',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
