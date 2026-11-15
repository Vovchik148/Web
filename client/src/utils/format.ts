export function formatDate(iso: string, locale = 'uk-UA'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso));
}

export function formatPrice(value: number | string, currency = 'UAH', locale = 'uk-UA'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(value));
}

export function formatQuantity(value: number, unit = 'шт'): string {
  return `${value} ${unit}`;
}

export function truncate(text: string, maxLength = 120): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}
