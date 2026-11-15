import api from './api';
import type { PaginatedResponse, StockMovement } from '@/types/api.types';
import type { MovementFormData } from '@/schemas/movement.schema';

// Журнал руху товарів (незмінний): створення операцій та читання історії.
// Залишки товару змінюються ТІЛЬКИ через операції - це забезпечує
// повний audit trail усіх змін кількості на складах.
export const movementsService = {
  create: async (payload: MovementFormData & { productId: number }) => {
    const { data } = await api.post<StockMovement>('/movements', payload);
    return data;
  },

  getByProduct: async (productId: number, limit = 5) => {
    const { data } = await api.get<PaginatedResponse<StockMovement>>('/movements', {
      params: { productId, limit, page: 1 },
    });
    return data;
  },
};
