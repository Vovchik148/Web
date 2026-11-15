import api from './api';
import type { PaginatedResponse, Product } from '@/types/api.types';
import type { ProductFormData } from '@/schemas/product.schema';

export interface ProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  isActive?: boolean;
  sortBy?: 'name' | 'sku' | 'price' | 'createdAt';
  order?: 'asc' | 'desc';
}

export const productsService = {
  getAll: async (params: ProductsQuery = {}) => {
    const { data } = await api.get<PaginatedResponse<Product>>('/products', {
      params: {
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        categoryId: params.categoryId || undefined,
        isActive: params.isActive,
        sortBy: params.sortBy,
        order: params.order,
      },
    });
    return data;
  },

  getById: async (id: number) => {
    const { data } = await api.get<Product>(`/products/${id}`);
    return data;
  },

  create: async (payload: ProductFormData) => {
    const { data } = await api.post<Product>('/products', payload);
    return data;
  },

  update: async (id: number, payload: Partial<ProductFormData>) => {
    const { data } = await api.put<Product>(`/products/${id}`, payload);
    return data;
  },

  remove: async (id: number) => {
    await api.delete(`/products/${id}`);
  },
};
