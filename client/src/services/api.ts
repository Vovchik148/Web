import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

// Базовий HTTP-клієнт до серверної частини (лабораторні роботи 1-3).
// Адреса береться зі змінної середовища VITE_API_URL (.env, .env.development,
// .env.production) і за замовчуванням вказує на локальний сервер.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor запиту: додає токен доступу зі сховища Zustand
// (сховище - єдине джерело правди про сесію, localStorage вручну не чіпаємо)
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor відповіді: при 401 завершує сесію (токен прострочений або
// невалідний). ProtectedRoute побачить порожній токен і сам перенаправить
// на /login, тому window.location тут не потрібен - застосунок не
// перезавантажується.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
