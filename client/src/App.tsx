import { BrowserRouter, Route, Routes } from 'react-router';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import AboutPage from '@/pages/AboutPage';
import DashboardPage from '@/pages/DashboardPage';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ProductCreatePage from '@/pages/ProductCreatePage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import ProductEditPage from '@/pages/ProductEditPage';
import ProductsListPage from '@/pages/ProductsListPage';
import RegisterPage from '@/pages/RegisterPage';
import UsersPage from '@/pages/UsersPage';
import CategoriesPage from '@/pages/CategoriesPage';
import SuppliersPage from '@/pages/SuppliersPage';
import WarehousesPage from '@/pages/WarehousesPage';
import { ROUTES } from '@/constants';

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
