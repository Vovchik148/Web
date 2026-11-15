import { BrowserRouter, Route, Routes } from 'react-router';
import Layout from '@/components/layout/Layout';
import AboutPage from '@/pages/AboutPage';
import HomePage from '@/pages/HomePage';
import NotFoundPage from '@/pages/NotFoundPage';
import { ROUTES } from '@/constants';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Layout - батьківський маршрут: шапка/підвал спільні для всіх сторінок.
            Catch-all "*" - окремий маршрут верхнього рівня: у React Router 8
            splat-нащадок того ж батька перехоплював би індексний маршрут "/" */}
        <Route path={ROUTES.HOME} element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path={ROUTES.ABOUT.slice(1)} element={<AboutPage />} />
        </Route>
        <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
