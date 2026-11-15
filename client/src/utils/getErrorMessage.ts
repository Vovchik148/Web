import { isAxiosError } from 'axios';

// Людське повідомлення про помилку з відповіді серверної частини
// (формат помилок бекенду: { error: "TypeName", message: "текст" })
export function getErrorMessage(error: unknown, fallback = 'Сталася помилка'): string {
  if (isAxiosError(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
