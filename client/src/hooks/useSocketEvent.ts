import { useEffect, useEffectEvent } from 'react';
import { socket } from '@/services/socket';

// Підписка на подію на час життя компонента. Знімається саме цей обробник
// (за посиланням), тому підписки інших компонентів на ту саму подію не зачіпаються.
// useEffectEvent дає обробнику завжди актуальні значення стану без повторної підписки.
export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
  const onEvent = useEffectEvent(handler);

  useEffect(() => {
    const listener = (payload: T) => onEvent(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event]);
}
