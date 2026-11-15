import { useState } from 'react';
import { selectUnreadCount, useNotificationsStore } from '@/stores/notificationsStore';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import toast from 'react-hot-toast';

// Payload події "notification" з лабораторної роботи 3 (notificationService):
// type - тип серверного сповіщення, priority - пріоритет, data - деталі
interface NotificationPayload {
  id?: number;
  type?: 'LOW_STOCK' | 'MOVEMENT' | 'SYSTEM' | 'PRODUCT';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  title?: string;
  message: string;
}

// Мапа типів серверних сповіщень на варіанти UI-дзвіночка
const TYPE_TO_VARIANT: Record<NonNullable<NotificationPayload['type']>, 'info' | 'success' | 'warning' | 'error'> = {
  LOW_STOCK: 'warning',
  MOVEMENT: 'info',
  SYSTEM: 'info',
  PRODUCT: 'success',
};

// Критичні сповіщення (порожній залишок) дублюються toast-ом
const CRITICAL_PRIORITIES: Array<NonNullable<NotificationPayload['priority']>> = ['HIGH', 'CRITICAL'];

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const notifications = useNotificationsStore((state) => state.notifications);
  const unreadCount = useNotificationsStore(selectUnreadCount);
  const markAsRead = useNotificationsStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationsStore((state) => state.markAllAsRead);

  // Сервер надсилає подію "notification" в особисту кімнату user:<id> (лабораторна робота 3)
  useSocketEvent<NotificationPayload>('notification', (data) => {
    useNotificationsStore.getState().add({
      type: TYPE_TO_VARIANT[data.type ?? 'SYSTEM'] ?? 'info',
      title: data.title ?? 'Сповіщення',
      message: data.message,
    });
    if (data.priority && CRITICAL_PRIORITIES.includes(data.priority)) {
      toast.error(data.title ? `${data.title}: ${data.message}` : data.message);
    }
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={`Сповіщення: непрочитаних ${unreadCount}`}
        aria-expanded={isOpen}
        className="relative rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
            <h3 className="font-semibold">Сповіщення</h3>
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-sm text-primary-600 hover:underline"
            >
              Прочитати всі
            </button>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <li className="p-4 text-center text-gray-500">Немає сповіщень</li>
            )}
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => markAsRead(n.id)}
                  className={`block w-full border-b p-4 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 ${
                    n.read ? '' : 'bg-primary-50 dark:bg-gray-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={
                        n.type === 'error'
                          ? 'text-red-500'
                          : n.type === 'warning'
                            ? 'text-yellow-500'
                            : n.type === 'success'
                              ? 'text-green-500'
                              : 'text-blue-500'
                      }
                    >
                      ●
                    </span>
                    <span className="font-medium">{n.title}</span>
                  </span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">{n.message}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(n.timestamp).toLocaleString('uk-UA')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
