import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBell from '@/components/NotificationBell';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { socket } from '@/services/socket';

// Підміняємо справжній сокет мінімальним емітером подій: мережа в модульних
// тестах не потрібна. Перевіряємо життєвий цикл підписок (лаб. 6).
vi.mock('@/services/socket', () => {
  type Handler = (payload: unknown) => void;
  const handlers = new Map<string, Set<Handler>>();
  return {
    socket: {
      on: (event: string, h: Handler) => handlers.set(event, (handlers.get(event) ?? new Set()).add(h)),
      off: (event: string, h: Handler) => handlers.get(event)?.delete(h),
      emit: (event: string, payload: unknown) => handlers.get(event)?.forEach((h) => h(payload)),
      count: (event: string) => handlers.get(event)?.size ?? 0,
    },
  };
});

const fake = socket as unknown as {
  emit: (e: string, p: unknown) => void;
  count: (e: string) => number;
};

beforeEach(() => useNotificationsStore.getState().clearAll());

test('подія notification збільшує лічильник, клік позначає сповіщення прочитаним', async () => {
  const u = userEvent.setup();
  render(<NotificationBell />);
  expect(screen.getByRole('button', { name: /непрочитаних 0/ })).toBeInTheDocument();

  act(() => fake.emit('notification', { title: 'Низький залишок', message: 'Папір A5: 0 шт' }));
  expect(screen.getByRole('button', { name: /непрочитаних 1/ })).toBeInTheDocument();

  await u.click(screen.getByRole('button', { name: /Сповіщення/ }));
  await u.click(screen.getByText('Низький залишок'));
  expect(screen.getByRole('button', { name: /непрочитаних 0/ })).toBeInTheDocument();
});

test('кілька подій рахуються окремо, "Прочитати всі" обнуляє лічильник', async () => {
  const u = userEvent.setup();
  render(<NotificationBell />);

  act(() => {
    fake.emit('notification', { title: 'Перше', message: '1' });
    fake.emit('notification', { title: 'Друге', message: '2' });
    fake.emit('notification', { title: 'Третє', message: '3' });
  });
  expect(screen.getByRole('button', { name: /непрочитаних 3/ })).toBeInTheDocument();

  await u.click(screen.getByRole('button', { name: /Сповіщення/ }));
  await u.click(screen.getByText('Прочитати всі'));
  expect(screen.getByRole('button', { name: /непрочитаних 0/ })).toBeInTheDocument();
});

test('при розмонтуванні компонент знімає власний обробник', () => {
  const { unmount } = render(<NotificationBell />);
  expect(fake.count('notification')).toBe(1);
  unmount();
  expect(fake.count('notification')).toBe(0);
});
