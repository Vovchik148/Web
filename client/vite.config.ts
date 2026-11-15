/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA (рівень 3): service worker + маніфест, автооновлення SW.
    // API-запити: NetworkFirst - спершу мережа, при її відсутності кеш (5 хв);
    // персональні дані не кешуються надовго (безпека після logout).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon-64.png', 'robots.txt'],
      manifest: {
        name: 'Warehouse Inventory — облік інвентарю на складі',
        short_name: 'Warehouse',
        description: 'Клієнтська частина системи обліку інвентарю на складі',
        lang: 'uk',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            // API-запити: спершу мережа, за відсутності — кеш (до 5 хвилин).
            // Перевірка за pathname "/api/" працює для будь-якого домена API
            // (локальний :3000 і Render), бо backend завжди роздає шляхи /api/*
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
    // Візуалізатор пакета: після збірки відкрити stats.html у браузері.
    // Файл у .gitignore - це інструмент аналізу, не артефакт.
    visualizer({ filename: 'stats.html', gzipSize: true }),
  ],
  // Абсолютні імпорти "@/..." - за мапою paths з tsconfig.app.json
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
