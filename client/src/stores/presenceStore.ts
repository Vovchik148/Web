import { create } from 'zustand';

// Онлайн-статуси користувачів: сервер розсилає presence:update (лаб. 3),
// клієнт тримає множину id користувачів, що зараз онлайн.
interface PresenceState {
  onlineIds: number[];
  setList: (ids: number[]) => void;
  setStatus: (userId: number, online: boolean) => void;
  isOnline: (userId: number) => boolean;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineIds: [],
  setList: (ids) => set({ onlineIds: [...ids].sort((a, b) => a - b) }),
  setStatus: (userId, online) =>
    set((state) => {
      const set_ = new Set(state.onlineIds);
      if (online) set_.add(userId);
      else set_.delete(userId);
      return { onlineIds: [...set_].sort((a, b) => a - b) };
    }),
  isOnline: (userId) => get().onlineIds.includes(userId),
}));
