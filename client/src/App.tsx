import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loading from '@/components/common/Loading';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { ROUTES } from '@/constants';

// Код спліттінг (рівень 3): кожна lazy-сторінка потрапляє в окремий chunk
// і завантажується лише при переході. Важкі бібліотеки (Recharts на Dashboard,
// Tiptap у ProductForm) залишаються у chunk'ах своїх сторінок.
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ProductsListPage = lazy(() => import('@/pages/ProductsListPage'));
const ProductCreatePage = lazy(() => import('@/pages/ProductCreatePage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const ProductEditPage = lazy(() => import('@/pages/ProductEditPage'));
const CategoriesPage = lazy(() => import('@/pages/CategoriesPage'));
const WarehousesPage = lazy(() => import('@/pages/WarehousesPage'));
const SuppliersPage = lazy(() => import('@/pages/SuppliersPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));
const MovementsPage = lazy(() => import('@/pages/MovementsPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Публічні сторінки аутентифікації (без Layout) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Основний layout: бічна панель + шапка + підвал */}
          <Route path={ROUTES.HOME} element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path={ROUTES.ABOUT.slice(1)} element={<AboutPage />} />

            {/* Захищені маршрути: без сесії -> redirect на /login (state.from) */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="products"
              element={
                <ProtectedRoute>
                  <ProductsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="products/create"
              element={
                <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                  <ProductCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="products/:id"
              element={
                <ProtectedRoute>
                  <ProductDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="products/:id/edit"
              element={
                <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                  <ProductEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="categories"
              element={
                <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                  <CategoriesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="warehouses"
              element={
                <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                  <WarehousesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="suppliers"
              element={
                <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                  <SuppliersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="movements"
              element={
                <ProtectedRoute>
                  <MovementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />

            <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
