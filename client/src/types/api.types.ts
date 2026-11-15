// Типи відповідей серверної частини (лабораторні роботи 1-3).

export type Role = 'ADMIN' | 'MANAGER' | 'WORKER';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  productCount?: number;
}

export interface Supplier {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  productCount?: number;
}

export interface Warehouse {
  id: number;
  name: string;
  location: string;
  capacity: number | null;
  stockItemsCount?: number;
}

// Залишок товару на складі у детальній відповіді GET /api/products/:id
export interface ProductStockInfo {
  quantity: number;
  updatedAt: string;
  warehouse?: Pick<Warehouse, 'id' | 'name'>;
}

// Decimal з PostgreSQL сервер серіалізує у JSON як рядок
export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  price: string;
  minStock: number;
  isActive: boolean;
  categoryId: number;
  supplierId: number | null;
  category?: Pick<Category, 'id' | 'name'>;
  supplier?: Pick<Supplier, 'id' | 'name'> | null;
  totalQuantity: number;
  stocks?: ProductStockInfo[]; // лише в детальній відповіді
  createdAt: string;
  updatedAt: string;
}

export interface StockItem {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  product?: Pick<Product, 'id' | 'sku' | 'name' | 'unit' | 'minStock'>;
  warehouse?: Pick<Warehouse, 'id' | 'name'>;
}

export interface StockMovement {
  id: number;
  type: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT';
  quantity: number;
  note: string | null;
  productId: number;
  warehouseId: number;
  userId: number;
  product?: Pick<Product, 'id' | 'sku' | 'name'>;
  warehouse?: Pick<Warehouse, 'id' | 'name'>;
  user?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  createdAt: string;
}

// Формат пагінованої відповіді серверної частини: { data, pagination }
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiError {
  error: string;
  message: string;
}

// Відповідь аутентифікації (лабораторна робота 2): { message, user, tokens }.
// Для акаунтів з 2FA login повертає twoFactorRequired + tempToken замість токенів.
export interface AuthResponse {
  message: string;
  user: User;
  tokens: { accessToken: string; refreshToken: string };
  twoFactorRequired?: boolean;
  tempToken?: string;
}

// Дані для реєстрації (confirmPassword на сервер не надсилається)
export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}
