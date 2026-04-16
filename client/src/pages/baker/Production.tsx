import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChefHat, Clock, Zap } from 'lucide-react';
import api from '../../lib/api';
import { formatBRL } from '../../lib/utils';

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  production: 'Em Produção',
  ready: 'Pronto',
  delivered: 'Entregue',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  production: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ready: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  delivered: 'bg-surface-700 text-surface-300 border-surface-600/30',
};

const columnOrder = ['pending', 'production', 'ready', 'delivered'];
const columnLabels: Record<string, string> = {
  pending: 'Pendente',
  production: 'Em Produção',
  ready: 'Pronto',
  delivered: 'Entregue',
};

interface KanbanData {
  [key: string]: any[];
}

interface ProductionStats {
  totalOrders: number;
  pendingCount: number;
  productionCount: number;
  readyCount: number;
  deliveredCount: number;
}

const Production = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<KanbanData | null>(null);
  const [stats, setStats] = useState<ProductionStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProduction();
  }, []);

  const fetchProduction = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/baker/production');
      setData(response.data);
      setStats(response.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load production data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 bg-surface-800 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse h-20"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse h-96"></div>
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
            <h3 className="font-semibold text-red-400 mb-1">Erro ao carregar produção</h3>
            <p className="text-sm text-red-300 mb-4">{error}</p>
            <button onClick={fetchProduction} className="btn-secondary text-sm">
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const orders = data || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title mb-2 flex items-center gap-3">
          <ChefHat size={32} className="text-amber-400" />
          Fila de Produção
        </h1>
        <p className="page-subtitle">Acompanhe os pedidos por estágio de produção</p>
      </div>

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="stat-card">
            <p className="text-surface-400 text-sm font-medium">Total de Pedidos</p>
            <p className="text-2xl font-bold text-white mt-2">{stats.totalOrders}</p>
          </div>
          <div className="stat-card">
            <p className="text-surface-400 text-sm font-medium">Pendente</p>
            <p className="text-2xl font-bold text-yellow-400 mt-2">{stats.pendingCount}</p>
          </div>
          <div className="stat-card">
            <p className="text-surface-400 text-sm font-medium">Em Produção</p>
            <p className="text-2xl font-bold text-purple-400 mt-2">{stats.productionCount}</p>
          </div>
          <div className="stat-card">
            <p className="text-surface-400 text-sm font-medium">Pronto</p>
            <p className="text-2xl font-bold text-emerald-400 mt-2">{stats.readyCount}</p>
          </div>
          <div className="stat-card">
            <p className="text-surface-400 text-sm font-medium">Entregue</p>
            <p className="text-2xl font-bold text-surface-300 mt-2">{stats.deliveredCount}</p>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {columnOrder.map((status) => (
          <div key={status} className="bg-surface-900/50 rounded-lg border border-surface-800 p-4">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-800">
              <h3 className="font-semibold text-white flex items-center gap-2">
                {columnLabels[status]}
              </h3>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-800 text-xs font-medium text-surface-300">
                {orders[status]?.length || 0}
              </span>
            </div>

            {/* Cards Stack */}
            <div className="space-y-3">
              {orders[status] && orders[status].length > 0 ? (
                orders[status].map((order: any) => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/app/orders/${order.id}`)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                      statusColors[order.status] || 'bg-surface-800 text-surface-300 border-surface-700'
                    }`}
                  >
                    {/* Urgent Badge */}
                    {order.isUrgent && (
                      <div className="flex items-center gap-1 mb-2 text-xs font-semibold text-red-400">
                        <Zap size={12} /> URGENTE
                      </div>
                    )}

                    {/* Order Number */}
                    <p className="text-sm font-bold text-white mb-1">#{order.order_number}</p>

                    {/* Customer Name */}
                    <p className="text-xs text-surface-400 mb-2">{order.customer_name}</p>

                    {/* Items */}
                    <div className="mb-3 space-y-1">
                      {order.items && order.items.slice(0, 3).map((item: any) => (
                        <div key={item.id} className="text-xs text-surface-300">
                          • {item.product_name} x{item.quantity}
                        </div>
                      ))}
                      {order.items && order.items.length > 3 && (
                        <div className="text-xs text-surface-400">
                          +{order.items.length - 3} mais
                        </div>
                      )}
                    </div>

                    {/* Delivery Time */}
                    <div className="pt-2 border-t border-current/20 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs">
                        <Clock size={12} />
                        {order.delivery_date
                          ? new Date(order.delivery_date).toLocaleDateString('pt-BR', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </div>
                      <p className="text-xs font-semibold">{formatBRL(order.total)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-surface-500 text-sm">
                  Nenhum pedido aqui
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Production;
