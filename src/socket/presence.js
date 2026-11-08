// Онлайн-статус користувачів (рівень 2).
// Відстежуємо активні з'єднання: один користувач може мати кілька
// сокетів (вкладки браузера), тому рахуємо з'єднання, а не булевий прапорець.

const connections = new Map(); // userId -> Set<socketId>

export const presence = {
  /** Реєструє з'єднання. Повертає true, якщо користувач щойно став онлайн. */
  connect(userId, socketId) {
    if (!connections.has(userId)) {
      connections.set(userId, new Set());
      connections.get(userId).add(socketId);
      return true;
    }
    connections.get(userId).add(socketId);
    return false;
  },

  /**
   * Прибирає з'єднання після відключення.
   * Повертає true, якщо користувач повністю пішов з мережі.
   */
  disconnect(userId, socketId) {
    const sockets = connections.get(userId);
    if (!sockets) return false;
    sockets.delete(socketId);
    if (sockets.size === 0) {
      connections.delete(userId);
      return true;
    }
    return false;
  },

  isOnline(userId) {
    return connections.has(Number(userId));
  },

  /** Список id користувачів, що зараз онлайн */
  onlineUserIds() {
    return [...connections.keys()].sort((a, b) => a - b);
  },

  /** Загальна кількість активних сокет-з'єднань (для метрик) */
  totalSockets() {
    let count = 0;
    for (const sockets of connections.values()) count += sockets.size;
    return count;
  },
};
