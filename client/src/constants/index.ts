// Глобальні константи застосунку.

export const APP_NAME: string = import.meta.env.VITE_APP_NAME ?? 'Warehouse Inventory';

export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  NOT_FOUND: '*',
} as const;

export interface NavItem {
  label: string;
  to: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Головна', to: ROUTES.HOME },
  { label: 'Про проєкт', to: ROUTES.ABOUT },
];
