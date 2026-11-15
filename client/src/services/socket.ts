import { io, type Socket } from 'socket.io-client';

// Адреса сервера Socket.io — БЕЗ префікса /api: він належить лише REST-маршрутам.
// Інакше Socket.io сприйме "/api" як назву простору імен (namespace).
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';

// Єдиний екземпляр на весь застосунок. З'єднання не встановлюється, доки не буде токена,
// але підписуватися на події (socket.on) компоненти можуть у будь-який момент.
export const socket: Socket = io(SOCKET_URL, { autoConnect: false });

// Токен передається лише в момент підключення: сервер перевіряє його в io.use(...)
// (лабораторна робота 3). Зміна токена (оновлення після refresh) -> перепідключення.
export function connectSocket(token: string) {
  if (socket.active) socket.disconnect();
  socket.auth = { token };
  socket.connect();
}

export function disconnectSocket() {
  socket.disconnect();
}

// Приєднання до кімнати предметної області (room:join з лабораторної роботи 3)
export function joinRoom(room: string) {
  socket.emit('room:join', room);
}
