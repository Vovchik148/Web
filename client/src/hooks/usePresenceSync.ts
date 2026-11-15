import { usePresenceStore } from '@/stores/presenceStore';
import { useSocketEvent } from './useSocketEvent';

// Синхронізація онлайн-статусів: сервер розсилає presence:list при підключенні
// та presence:update при вході/виході користувачів (лабораторна робота 3).
// Викликається один раз у Layout.
export function usePresenceSync() {
  const setList = usePresenceStore((state) => state.setList);
  const setStatus = usePresenceStore((state) => state.setStatus);

  useSocketEvent<{ onlineUserIds: number[] }>('presence:list', (data) => setList(data.onlineUserIds));
  useSocketEvent<{ userId: number; online: boolean }>('presence:update', (data) =>
    setStatus(data.userId, data.online),
  );
}
