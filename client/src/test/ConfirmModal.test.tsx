import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmModal from '@/components/common/ConfirmModal';

// Тести діалогу підтвердження (Headless UI Dialog): відкриття, підтвердження,
// закриття клавішею Escape (доступність - рівень 1 лаб. 6)
test('відкривається, показує повідомлення і підтверджує дію', async () => {
  const u = userEvent.setup();
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  render(
    <ConfirmModal
      isOpen={true}
      title="Видалення товару"
      message='Видалити товар "Папір A5"?'
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByText(/Папір A5/)).toBeInTheDocument();

  await u.click(screen.getByRole('button', { name: 'Видалити' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onCancel).not.toHaveBeenCalled();
});

test('закриття: кнопка Скасувати і клавіша Escape', async () => {
  const u = userEvent.setup();
  const onCancel = vi.fn();

  render(
    <ConfirmModal
      isOpen={true}
      title="Підтвердження"
      message="Тестове повідомлення"
      confirmLabel="ОК"
      onConfirm={vi.fn()}
      onCancel={onCancel}
    />,
  );

  await u.click(screen.getByRole('button', { name: 'Скасувати' }));
  expect(onCancel).toHaveBeenCalledTimes(1);

  await u.keyboard('{Escape}');
  expect(onCancel).toHaveBeenCalledTimes(2);
});
