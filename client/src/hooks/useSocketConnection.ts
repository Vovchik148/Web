import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { connectSocket, disconnectSocket } from '@/services/socket';

// Викликається ОДИН раз (у Layout): з'єднання належить застосунку, а не окремому
// компоненту. Вхід у систему відкриває з'єднання, вихід — закриває.
export function useSocketConnection() {
  const token = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!token) return;
    connectSocket(token);
    return disconnectSocket;
  }, [token]);
}
