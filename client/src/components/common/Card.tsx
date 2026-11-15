import type { ComponentProps } from 'react';

interface CardProps extends ComponentProps<'div'> {
  // hover=true додає тінь і підйом при наведенні (для карток товарів у сітках)
  hover?: boolean;
}

export default function Card({ hover = false, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${
        hover ? 'transition-shadow duration-200 hover:shadow-md' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
