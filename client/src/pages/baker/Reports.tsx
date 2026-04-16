import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../../lib/api';
import { formatBRL } from '../../lib/utils';

interface ReportsData {
  revenue_by_month: any[];
  orders_by_status: any[];
  top_products: any[];
  top_customers: any[];
  payment_methods: any[];
  revenue_by_day_of_week: any[];
}

interface MarginData {
  name: string;
  margin: number;
}

interface VelocityData {
  name: string;
  trend: 'up' | 'down' | 'flat';
  weekly: number[];
}

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportsData | null>(null);
  const [marginData, setMarginData] = useState<MarginData[]>([]);
  const [velocityData, setVelocityData] = useState<VelocityData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reportsResponse, marginsResponse, velocityResponse] = await Promise.all([
        api.get('/baker/reports'),
        api.get('/baker/reports/margins'),
        api.get('/baker/reports/velocity'),
      ]);
      setData(reportsResponse);
      setMarginData(marginsResponse);
      setVelocityData(velocityResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 bg-surface-800 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse h-80"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-500/10 border-red-500/50">
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-red-400 mb-1">Erro ao carregar relatórios</h3>
            <p className="text-sm text-red-300 mb-4">{error}</p>
            <button onClick={fetchReports} className="btn-secondary text-sm">
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-surface-400">Nenhum dado disponível</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title mb-2">Relatórios</h1>
        <p className="page-subtitle">Análise detalhada do seu negócio</p>
      </div>

      {/* Revenue Trend */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-6">Receita ao Longo do Tempo</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.revenue_by_month || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
            <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #404040',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#e5e7eb' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Orders by Status */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-6">Pedidos por Status</h3>
          {data.orders_by_status && data.orders_by_status.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.orders_by_status}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.orders_by_status.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #404040',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-surface-400">
              Sem dados disponíveis
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-6">Métodos de Pagamento</h3>
          {data.payment_methods && data.payment_methods.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.payment_methods}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ method, total }) => `${method}: ${formatBRL(total as any)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {data.payment_methods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #404040',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-surface-400">
              Sem dados disponíveis
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-6">Produtos Mais Vendidos</h3>
          {data.top_products && data.top_products.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.top_products}>
                <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #404040',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-surface-400">
              Sem dados disponíveis
            </div>
          )}
        </div>

        {/* Revenue by Day of Week */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-6">Receita por Dia da Semana</h3>
          {data.revenue_by_day_of_week && data.revenue_by_day_of_week.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.revenue_by_day_of_week}>
                <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                <XAxis dataKey="day_of_week" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #404040',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-surface-400">
              Sem dados disponíveis
            </div>
          )}
        </div>
      </div>

      {/* Top Customers */}
      {data.top_customers && data.top_customers.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-6">Melhores Clientes</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="table-header text-left py-3">Cliente</th>
                  <th className="table-header text-center py-3">Pedidos</th>
                  <th className="table-header text-right py-3">Total Gasto</th>
                </tr>
              </thead>
              <tbody>
                {data.top_customers.map((customer, index) => (
                  <tr key={index} className="border-b border-surface-800 hover:bg-surface-800/30">
                    <td className="py-3 text-sm font-medium text-white">{customer.name}</td>
                    <td className="py-3 text-center text-sm text-surface-300">
                      {customer.total_orders || 0}
                    </td>
                    <td className="py-3 text-right text-sm font-medium text-emerald-400">
                      {formatBRL(customer.total_spent || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Profit Margin Analysis */}
      {marginData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-6">Análise de Margem de Lucro</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={marginData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
              <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} angle={-45} textAnchor="end" height={100} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #404040',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#e5e7eb' }}
                formatter={(value) => `${(value as number).toFixed(1)}%`}
              />
              <Bar dataKey="margin" radius={[8, 8, 0, 0]}>
                {marginData.map((entry, index) => {
                  let color = '#ef4444';
                  if (entry.margin >= 50) color = '#10b981';
                  else if (entry.margin >= 30) color = '#eab308';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sales Velocity */}
      {velocityData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-6">Velocidade de Vendas (Últimas 4 Semanas)</h3>
          <div className="space-y-4">
            {velocityData.slice(0, 10).map((product) => (
              <div key={product.name} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-white truncate">{product.name}</div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {product.weekly.map((week, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-surface-800 rounded h-8 flex items-center justify-center text-xs text-surface-400"
                        title={`Semana: ${week} unidades`}
                      >
                        {week > 0 && week}
                      </div>
                    ))}
                  </div>
                  <div className="w-20 text-right">
                    {product.trend === 'up' && (
                      <TrendingUp className="text-emerald-400 inline" size={16} />
                    )}
                    {product.trend === 'down' && (
                      <TrendingDown className="text-red-400 inline" size={16} />
                    )}
                    {product.trend === 'flat' && (
                      <div className="text-surface-400 text-xs inline">—</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
