import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usersService } from '@/services/catalog.services';
import { useAuthStore } from '@/stores/authStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage } from '@/utils/getErrorMessage';
import type { Role, User } from '@/types/api.types';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import ConfirmModal from '@/components/common/ConfirmModal';
import Input from '@/components/common/Input';
import Pagination from '@/components/common/Pagination';
import { TableSkeleton } from '@/components/common/Skeleton';

const ROLES: Role[] = ['ADMIN', 'MANAGER', 'WORKER'];

// Керування користувачами (тільки ADMIN): зміна ролі та деактивація.
// Backend дозволяє лише PUT /api/users/:id - створення й видалення тут не існують.
export default function UsersPage() {
  const me = useAuthStore((state) => state.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [deactivating, setDeactivating] = useState<User | null>(null);
  const queryClient = useQueryClient();

  // Онлайн-статуси в реальному часі: presenceStore синхронізується у Layout
  const isOnline = usePresenceStore((state) => state.isOnline);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['users', { page, search: debouncedSearch }],
    queryFn: () => usersService.getAll({ page, limit: 10, search: debouncedSearch || undefined }),
    placeholderData: keepPreviousData,
  });

  const updateUser = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { role?: Role; isActive?: boolean } }) =>
      usersService.update(id, payload),
    onSuccess: async (user) => {
      toast.success(`Користувача #${user.id} оновлено`);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Не вдалося оновити користувача')),
  });

  // Захист на клієнті: сторінка сенсу не має без ролі ADMIN (backend і так повертає 403)
  if (me?.role !== 'ADMIN') {
    return (
      <p
        role="alert"
        className="mx-auto max-w-lg rounded border border-red-300 bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-200"
      >
        Цей розділ доступний лише адміністраторам.
      </p>
    );
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Панель', to: '/dashboard' }, { label: 'Користувачі' }]} />

      <h1 className="mb-4 text-3xl font-bold">Користувачі</h1>

      <Input
        aria-label="Пошук користувачів"
        placeholder="Пошук за email або ім'ям..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="mb-4"
      />

      {isPending && <TableSkeleton rows={6} />}
      {isError && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-200"
        >
          {getErrorMessage(error)}
        </p>
      )}

      {data && (
        <>
          <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-gray-900">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['ID', 'Ім\u2019я', 'Email', 'Роль', 'Статус', 'Дії'].map((title) => (
                    <th
                      key={title}
                      className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500"
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.data.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">{user.id}</td>
                    <td className="px-4 py-3">
                      {/* Онлайн-статус у реальному часі (Socket.io presence, лаб. 3+6) */}
                      <span
                        aria-label={isOnline(user.id) ? 'онлайн' : 'офлайн'}
                        title={isOnline(user.id) ? 'Онлайн' : 'Офлайн'}
                        className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${
                          isOnline(user.id) ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'
                        }`}
                      />
                      {user.firstName} {user.lastName}
                      {user.id === me.id && (
                        <span className="ml-2 text-xs text-gray-400">(ви)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{user.email}</td>
                    <td className="px-4 py-3">
                      {/* Зміна ролі в самому рядку: власну роль змінити не можна
                          (backend забороняє змінювати власну роль/статус) */}
                      {user.id === me.id ? (
                        <Badge variant="primary">{user.role}</Badge>
                      ) : (
                        <select
                          aria-label={`Роль користувача ${user.email}`}
                          value={user.role}
                          disabled={updateUser.isPending}
                          onChange={(e) =>
                            updateUser.mutate({
                              id: user.id,
                              payload: { role: e.target.value as Role },
                            })
                          }
                          className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.isActive ? 'success' : 'danger'}>
                        {user.isActive ? 'активний' : 'деактивований'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {user.id !== me.id && (
                        <Button
                          size="sm"
                          variant={user.isActive ? 'danger' : 'secondary'}
                          disabled={updateUser.isPending}
                          onClick={() => setDeactivating(user)}
                        >
                          {user.isActive ? 'Деактивувати' : 'Активувати'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      Нічого не знайдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={data.pagination.page}
            pages={data.pagination.pages}
            total={data.pagination.total}
            onChange={setPage}
          />
        </>
      )}

      <ConfirmModal
        isOpen={deactivating !== null}
        title={deactivating?.isActive ? 'Деактивація користувача' : 'Активація користувача'}
        message={
          deactivating?.isActive
            ? `Деактивувати ${deactivating?.email}? Користувач втратить доступ до системи.`
            : `Активувати ${deactivating?.email}?`
        }
        confirmLabel={deactivating?.isActive ? 'Деактивувати' : 'Активувати'}
        isPending={updateUser.isPending}
        onConfirm={() => {
          if (deactivating) {
            updateUser.mutate({
              id: deactivating.id,
              payload: { isActive: !deactivating.isActive },
            });
            setDeactivating(null);
          }
        }}
        onCancel={() => setDeactivating(null)}
      />
    </div>
  );
}
