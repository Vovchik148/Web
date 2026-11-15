import api from './api';
import type { Category, PaginatedResponse, Supplier, User, Warehouse } from '@/types/api.types';
import type {
  CategoryFormData,
  SupplierFormData,
  UserEditFormData,
  WarehouseFormData,
} from '@/schemas/catalog.schema';

// Сервіси довідників (категорії, склади, постачальники) та користувачів.
// Списки серверної частини пагіновані: { data, pagination }.

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
}

const unwrap = async <T>(path: string, params: ListQuery) => {
  const { data } = await api.get<PaginatedResponse<T>>(path, {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      search: params.search || undefined,
    },
  });
  return data;
};

export const categoriesService = {
  getAll: async (params: ListQuery = {}) => unwrap<Category>('/categories', params),
  create: async (payload: CategoryFormData) =>
    (await api.post<Category>('/categories', payload)).data,
  update: async (id: number, payload: Partial<CategoryFormData>) =>
    (await api.put<Category>(`/categories/${id}`, payload)).data,
  remove: async (id: number) => {
    await api.delete(`/categories/${id}`);
  },
};

export const warehousesService = {
  getAll: async (params: ListQuery = {}) => unwrap<Warehouse>('/warehouses', params),
  create: async (payload: WarehouseFormData) =>
    (await api.post<Warehouse>('/warehouses', payload)).data,
  update: async (id: number, payload: Partial<WarehouseFormData>) =>
    (await api.put<Warehouse>(`/warehouses/${id}`, payload)).data,
  remove: async (id: number) => {
    await api.delete(`/warehouses/${id}`);
  },
};

export const suppliersService = {
  getAll: async (params: ListQuery = {}) => unwrap<Supplier>('/suppliers', params),
  create: async (payload: SupplierFormData) =>
    (await api.post<Supplier>('/suppliers', payload)).data,
  update: async (id: number, payload: Partial<SupplierFormData>) =>
    (await api.put<Supplier>(`/suppliers/${id}`, payload)).data,
  remove: async (id: number) => {
    await api.delete(`/suppliers/${id}`);
  },
};

export const usersService = {
  getAll: async (params: ListQuery = {}) => unwrap<User>('/users', params),
  update: async (id: number, payload: Partial<UserEditFormData>) =>
    (await api.put<User>(`/users/${id}`, payload)).data,
};
