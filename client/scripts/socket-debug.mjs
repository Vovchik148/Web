// Діагностика: підключення socket.io-client до сервера і прослуховування notification
import { io } from 'socket.io-client';

const login = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@warehouse.com', password: 'Admin123' }),
}).then((r) => r.json());

const socket = io('http://localhost:3000', {
  auth: { token: login.tokens.accessToken },
});
socket.onAny((event, ...args) => console.log('socket <<', event, JSON.stringify(args).slice(0, 120)));
socket.on('connect', () => console.log('socket connected:', socket.id));
socket.on('connect_error', (e) => console.log('socket ERROR:', e.message));

await new Promise((r) => setTimeout(r, 1500));

// Тригеримо рух, що створює LOW_STOCK (total 4 < minStock 50)
const mv = await fetch('http://localhost:3000/api/movements', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + login.tokens.accessToken, 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'OUTBOUND', productId: 44, warehouseId: 14, quantity: 1 }),
});
console.log('movement status:', mv.status);

await new Promise((r) => setTimeout(r, 4000));
socket.disconnect();
process.exit(0);
