import { Link, useParams } from 'react-router';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { ProductForm } from '@/components/product/ProductForm';

// Редагування товару: форма та сама, що і для створення, з editId
export default function ProductEditPage() {
  const id = Number(useParams<{ id: string }>().id);

  if (!Number.isInteger(id) || id < 1) {
    return (
      <p
        role="alert"
        className="mx-auto max-w-lg rounded border border-red-300 bg-red-50 p-4 text-red-700 dark:bg-red-950 dark:text-red-200"
      >
        Некоректний ідентифікатор товару.{' '}
        <Link to="/products" className="underline">
          До списку товарів
        </Link>
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Breadcrumbs
        items={[
          { label: 'Панель', to: '/dashboard' },
          { label: 'Товари', to: '/products' },
          { label: `Редагування #${id}`, to: `/products/${id}` },
          { label: 'Форма' },
        ]}
      />
      <h1 className="mb-6 text-3xl font-bold">Редагування товару</h1>
      <ProductForm editId={id} />
    </div>
  );
}
