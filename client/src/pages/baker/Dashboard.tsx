import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, TrendingUp, TrendingDown, AlertTriangle, Package, ShoppingCart, Users, ChefHat } from 'lucide-react';
import api from '../../lib/api';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  production: 'bg-purple-500/20 text-purple-400',
  ready: 'bg-emerald-500/20 text-emerald-400',
  delivered: 'bg-surface-700 text-surface-300',
  cancelled: 'bg-red-500/20 text-red-400',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  production: 'Produção',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/baker/dashboard');
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-4 bg-surface-800 rounded w-3/4"></div>
              <div className="h-8 bg-surface-800 rounded w-1/2 mt-2"></div>
            </div>
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
          <div className="flex-1">
            <h3 className="font-semibold text-red-400 mb-1">Erro ao carregar dashboard</h3>
            <p className="text-sm text-red-300 mb-4">{error}</p>
            <button onClick={fetchDashboard} className="btn-secondary text-sm">Tentar novamente</button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-surface-400">Nenhum dado disponível</div>;

  const { stats, recentOrders, todaysOrders, productPerformance } = data;
  const revenueChange = stats.revenueChange || 0;

  const chartData = (productPerformance || []).map((p: any) => ({
    name: p.name,
    vendas: p.revenue || p.quantity || 0,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="page-title mb-2">Dashboard</h1>
          <p className="page-subtitle">Bem-vindo de volta! Aqui está o resumo do seu negócio.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/app/orders/new')} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Novo Pedido
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card">
          <p className="text-surface-400 text-sm font-medium">Receita este mês</p>
          <div className="mt-2">
            <p className="text-2xl font-bold text-white">R$ {(stats.monthRevenue || 0).toFixed(2)}</p>
            <div className="flex items-center gap-1 mt-2">
              {revenueChange >= 0 ? (
                <TrendingUp size={16} className="text-emerald-500" />
              ) : (
                <TrendingDown size={16} className="text-red-500" />
              )}
              <span className={`text-sm font-medium ${revenueChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {revenueChange >= 0 ? '+' : ''}{revenueChange}%
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <p className="text-surface-400 text-sm font-medium">Pedidos Pendentes</p>
          <p className="text-2xl font-bold text-white mt-2">{stats.pendingOrders || 0}</p>
          <p className="text-xs text-surface-500 mt-2">Aguardando confirmação</p>
        </div>

        <div className="stat-card">
          <p className="text-surface-400 text-sm font-medium">Clientes</p>
          <p className="text-2xl font-bold text-white mt-2">{stats.totalCustomers || 0}</p>
        </div>

        <div className="stat-card">
          <p className="text-surface-400 text-sm font-medium">Produtos</p>
          <p className="text-2xl font-bold text-white mt-2">{stats.totalProducts || 0}</p>
        </div>

        <div className={`stat-card ${(stats.lowStockCount || 0) > 0 ? 'border-yellow-500/50' : ''}`}>
          <p className="text-surface-400 text-sm font-medium">Estoque Baixo</p>
          <p className={`text-2xl font-bold mt-2 ${(stats.lowStockCount || 0) > 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
            {stats.lowStockCount || 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Products */}
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-white mb-6">Produtos Mais Vendidos</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #404040', borderRadius: '8px' }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
                <Bar dataKey="vendas" fill="#f59e0b" radius={[8, 8, 0, 0]}>
                  {chartData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill="#f59e0b" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-surface-400">Nenhum dado disponível</div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Ações Rápidas</h3>
          <div className="space-y-3">
            <button onClick={() => navigate('/app/orders/new')} className="w-full btn-secondary text-left flex items-center gap-3">
              <ShoppingCart size={18} className="text-brand-400" /> Novo Pedido
            </button>
            <button onClick={() => navigate('/app/products')} className="w-full btn-secondary text-left flex items-center gap-3">
              <ChefHat size={18} className="text-brand-400" /> Novo Produto
            </button>
            <button onClick={() => navigate('/app/customers')} className="w-full btn-secondary text-left flex items-center gap-3">
              <Users size={18} className="text-brand-400" /> Novo Cliente
            </button>
            <button onClick={() => navigate('/app/inventory')} className="w-full btn-secondary text-left flex items-center gap-3">
              <Package size={18} className="text-brand-400" /> Gerenciar Estoque
            </button>
          </div>
        </div>
      </div>

      {/* Today's Orders */}
      {todaysOrders && todaysOrders.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-6">Pedidos de Hoje</h3>
          <div className="space-y-3">
            {todaysOrders.map((order: any) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-surface-800/50 rounded-lg hover:bg-surface-800 transition-colors cursor-pointer"
                onClick={() => navigate(`/app/orders/${order.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">#{order.order_number}</p>
                    <p className="text-xs text-surface-400">{order.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-semibold text-white">R$ {(order.total || 0).toFixed(2)}</p>
                  <span className={`badge text-xs ${statusColors[order.status] || 'bg-surface-700 text-surface-300'}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {recentOrders && recentOrders.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Pedidos Recentes</h3>
            <button onClick={() => navigate('/app/orders')} className="text-sm text-brand-400 hover:text-brand-300">
              Ver todos →
            </button>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order: any) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-surface-800/50 rounded-lg hover:bg-surface-800 transition-colors cursor-pointer"
                onClick={() => navigate(`/app/orders/${order.id}`)}
              >
                <div>
                  <p className="text-sm font-medium text-white">#{order.order_number}</p>
                  <p className="text-xs text-surface-400">{order.customer_name}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-semibold text-white">R$ {(order.total || 0).toFixed(2)}</p>
                  <span className={`badge text-xs ${statusColors[order.status] || 'bg-surface-700 text-surface-300'}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
