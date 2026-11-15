import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ChartDataItem {
  name: string;
  products: number;
  stock?: number;
}

interface StatsChartProps {
  data: ChartDataItem[];
  title: string;
}

// Графік категорій (Recharts, рівень 2): декларативні компоненти поверх SVG.
// Завантажується lazy — потрапляє в chunk Dashboard, а не в початковий бандл.
export default function StatsChart({ data, title }: StatsChartProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h3 className="mb-4 text-xl font-bold">{title}</h3>
      {data.length === 0 ? (
        <p className="py-8 text-center text-gray-500 dark:text-gray-400">
          Немає даних для графіка. Додайте категорії та товари.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="products" name="Товарів у категорії" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
