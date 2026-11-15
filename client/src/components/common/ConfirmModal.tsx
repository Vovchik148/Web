import Button from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Власне модальне вікно підтвердження (замість системного confirm()):
// overlay + діалог, закриття по Esc і кліку на фон
export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Видалити',
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="mb-6 text-gray-600 dark:text-gray-400">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Скасувати
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isPending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
