import axios from 'axios';

// Базовий HTTP-клієнт до серверної частини (лабораторна робота 1-3).
// Адреса береться зі змінної середовища VITE_API_URL (.env, .env.development,
// .env.production) і за замовчуванням вказує на локальний сервер.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor запиту: додає токен доступу до кожного запиту.
// У лабораторній роботі 5 сховище токена буде замінено на стан застосунку.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor відповіді: 401 при НАЯВНОМУ токені означає, що токен
// прострочений або некоректний - очищаємо його і повертаємо на сторінку
// входу (з'явиться в лабораторній роботі 5). Якщо токена не було взагалі,
// не редиректимо: сторінка сама покаже коректний стан гостя.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('accessToken')) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
