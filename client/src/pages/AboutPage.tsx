import { Link } from 'react-router';
import Badge from '@/components/common/Badge';
import Card from '@/components/common/Card';
import { ROUTES } from '@/constants';

const techStack = [
  { name: 'React 19', purpose: 'бібліотека UI' },
  { name: 'TypeScript', purpose: 'статична типізація' },
  { name: 'Vite 8', purpose: 'збірка та dev-сервер' },
  { name: 'Tailwind CSS 4', purpose: 'утилітарна стилізація' },
  { name: 'React Router 8', purpose: 'маршрутизація SPA' },
  { name: 'Axios', purpose: 'HTTP-клієнт до API' },
];

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-3xl font-bold">Про проєкт</h1>
      <p className="mb-4">
        Клієнтська частина системи обліку інвентарю на складі (предметна область лабораторних робіт
        1-3). Ця лабораторна робота закладає базу: конфігурація проєкту, інструменти якості коду,
        маршрутизація та повторно використовувані UI-компоненти.
      </p>
      <p className="mb-6">
        Наразі доступний перегляд каталогу товарів з живими даними серверної частини. У наступних
        лабораторних роботах додаються автентифікація, реальний час через WebSocket та управління
        складом.
      </p>

      <h2 className="mb-3 text-xl font-semibold">Стек технологій</h2>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {techStack.map((tech) => (
          <Card key={tech.name} className="flex items-center justify-between">
            <Badge variant="primary">{tech.name}</Badge>
            <span className="text-sm text-gray-500 dark:text-gray-400">{tech.purpose}</span>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 text-xl font-semibold">Використані підходи</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          абсолютні імпорти через псевдонім <code>@/</code> (tsconfig paths + Vite);
        </li>
        <li>interceptors Axios: токен у кожен запит, redirect при 401;</li>
        <li>Error Boundary навколо сторінок (класовий компонент);</li>
        <li>
          темна тема через варіант <code>dark</code> Tailwind 4 і хук useTheme;
        </li>
        <li>
          адаптивність: сітки, бургер-меню, класи <code>sm:</code>/<code>lg:</code>.
        </li>
      </ul>

      <p className="mt-8">
        <Link to={ROUTES.HOME} className="text-primary-600 hover:underline">
          ← На головну
        </Link>
      </p>
    </section>
  );
}
