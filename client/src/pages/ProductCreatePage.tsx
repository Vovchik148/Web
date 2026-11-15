import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { ProductForm } from '@/components/product/ProductForm';

export default function ProductCreatePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Breadcrumbs
        items={[
          { label: 'Панель', to: '/dashboard' },
          { label: 'Товари', to: '/products' },
          { label: 'Новий товар' },
        ]}
      />
      <h1 className="mb-6 text-3xl font-bold">Новий товар</h1>
      <ProductForm />
    </div>
  );
}
