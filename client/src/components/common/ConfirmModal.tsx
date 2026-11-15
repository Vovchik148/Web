import Modal from './Modal';
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

// Діалог підтвердження на Headless UI Modal (заміна window.confirm()):
// доступний з клавіатури (Esc, focus trap), стилізований під застосунок
// і не блокує потік виконання. Використовується всіма CRUD-сторінками.
export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Видалити',
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <p className="mb-6 text-gray-600 dark:text-gray-300">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={isPending}>
          Скасувати
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isPending}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
