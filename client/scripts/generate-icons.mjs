// Генерація PWA-іконок з SVG-логотипа (npm run icons, у теці client/)
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

// Простий SVG-логотип: синя заокруглена квадрат-основа + біла коробка
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#2563eb"/>
  <g fill="#ffffff">
    <rect x="128" y="176" width="256" height="208" rx="16"/>
    <rect x="112" y="136" width="288" height="48" rx="12"/>
    <rect x="232" y="216" width="48" height="64" rx="8" fill="#2563eb"/>
  </g>
  <rect x="312" y="96" width="96" height="72" rx="10" fill="#93c5fd"/>
</svg>`;

await mkdir('public', { recursive: true });

await sharp(Buffer.from(SVG)).resize(512, 512).toFile('public/pwa-512x512.png');
await sharp(Buffer.from(SVG)).resize(192, 192).toFile('public/pwa-192x192.png');
await sharp(Buffer.from(SVG)).resize(180, 180).toFile('public/apple-touch-icon.png');
await sharp(Buffer.from(SVG)).resize(64, 64).toFile('public/favicon-64.png');

console.log('PWA-іконки згенеровано: public/pwa-512x512.png, pwa-192x192.png, apple-touch-icon.png');
