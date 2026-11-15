import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

// TanStack Query: staleTime 30 с - дані вважаються свіжими і не перезапитуються,
// retry 1 - одна повторна спроба при збої запиту
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

// Тема застосовується до <html> ще до рендеру: сторінки входу/реєстрації
// не мають Layout з useTheme, тому без цього вони залишалися світлими
// навіть при обраній темній темі
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.classList.toggle(
  'dark',
  savedTheme === 'dark' || (!savedTheme && prefersDark)
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* Сповіщення success/error (toast) для всіх мутацій */}
      <Toaster position="top-right" />
      <App />
    </QueryClientProvider>
  </StrictMode>
);
