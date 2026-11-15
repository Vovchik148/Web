import type { ReactNode } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

// Універсальне модальне вікно на Headless UI 2: портал, focus trap, закриття
// по Esc і кліку на фон, анімація через атрибут transition (data-closed стани).
// Доступність бере на себе Headless UI (role="dialog", aria-modal, aria-labelledby).
export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} transition className="relative z-50">
      {/* Прозорість фону: bg-black/25 (класи bg-opacity-* у Tailwind 4 вилучено) */}
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/25 duration-300 ease-out data-closed:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel
          transition
          className={`w-full ${sizeClasses[size]} rounded-lg bg-white p-6 shadow-xl duration-300 ease-out data-closed:scale-95 data-closed:opacity-0 dark:bg-gray-800`}
        >
          <DialogTitle className="mb-4 text-xl font-bold">{title}</DialogTitle>
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
