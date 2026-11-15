import api from './api';
import type { AuthResponse, RegisterPayload } from '@/types/api.types';

export const authService = {
  login: async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    return data;
  },

  register: async (payload: RegisterPayload) => {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    return data;
  },

  logout: async (refreshToken: string | null) => {
    // Відкликаємо refresh-токен на сервері (найкраще зусилля: помилку ігноруємо,
    // бо локальна сесія все одно завершується)
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // ігноруємо: серверна сесія можливо вже недійсна
    }
  },
};
