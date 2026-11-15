import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/api.types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  // refresh-токен потрібен лише для коректного виходу (відкликання сесії на сервері)
  refreshToken: string | null;
  login: (user: User, accessToken: string, refreshToken?: string) => void;
  logout: () => void;
}

// Єдине джерело правди про сесію користувача: middleware persist сам
// зберігає стан у localStorage (ключ "auth-storage") і відновлює його
// після перезавантаження сторінки - вручну токен у localStorage не пишемо.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      login: (user, accessToken, refreshToken = null) => set({ user, accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'auth-storage' }
  )
);
