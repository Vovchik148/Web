import { useEffect } from 'react';
import { joinRoom, socket } from '@/services/socket';

// Приєднує сокет до кімнати предметної області (products, warehouse:<id> тощо).
// При перепідключенні socket.io кімнати губляться, тому перезаходимо на подію connect.
export function useSocketRoom(room: string) {
  useEffect(() => {
    if (socket.active) joinRoom(room);

    const onConnect = () => joinRoom(room);
    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
      socket.emit('room:leave', room);
    };
  }, [room]);
}
