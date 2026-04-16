import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, AlertTriangle, ShoppingCart } from 'lucide-react';
import api from '../../lib/api';
import { formatBRL } from '../../lib/utils';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableRowSkeleton } from '../../components/ui/LoadingSkeleton';

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  items: OrderItem[];
  total: number;
  delivery_date: string;
  payment_status: 'unpaid' | 'partial' | 'paid';
  created_at: string;
}

const Orders = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const statuses = [
    { value: null, label: 'Todos' },
    { value: 'pending', label: 'Pendente' },
    { value: 'confirmed', label: 'Confirmado' },
    { value: 'preparing', label: 'Em Produção' },
    { value: 'ready', label: 'Pronto' },
    { value: 'completed', label: 'Entregue' },
    { value: 'cancelled', label: 'Cancelado' },
  ];

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedStatus) {
        params.append('status', selectedStatus);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      const response = await api.get(`/baker/orders?${params.toString()}`);
      setOrders(response.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'confirmed':
        return 'bg-blue-500/20 text-blue-400';
      case 'preparing':
        return 'bg-purple-500/20 text-purple-400';
      case 'ready':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-surface-700 text-surface-300';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'partial':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'unpaid':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-surface-700 text-surface-300';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      preparing: 'Em Produção',
      ready: 'Pronto',
      completed: 'Entregue',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      paid: 'Pago',
      partial: 'Parcial',
      unpaid: 'Não pago',
    };
    return labels[status] || status;
  };

  if (error) {
    return (
      <div className="card bg-red-500/10 border-red-500/50">
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-1" size={20} />
          <div className="flex-1">
            <h3 className="font-semibold text-red-400 mb-1">Erro ao carregar pedidos</h3>
            <p className="text-sm text-red-300 mb-4">{error}</p>
            <button onClick={fetchOrders} className="btn-secondary text-sm">
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title mb-2">Pedidos</h1>
          <p className="page-subtitle">Gerenciar todos os pedidos</p>
        </div>
        <button
          onClick={() => navigate('/app/orders/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Novo Pedido
        </button>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-3 text-surface-500" />
            <input
              type="text"
              placeholder="Buscar por número do pedido ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <button type="submit" className="btn-secondary">
            Buscar
          </button>
        </form>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          {statuses.map((status) => (
            <button
              key={status.value}
              onClick={() => setSelectedStatus(status.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedStatus === status.value
                  ? 'bg-brand-500 text-surface-950'
                  : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <TableRowSkeleton rows={5} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={28} />}
          title="Nenhum pedido ainda"
          description="Comece criando seu primeiro pedido para gerenciar seus clientes e entregas."
          action={{
            label: 'Criar primeiro pedido',
            onClick: () => navigate('/app/orders/new'),
          }}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/app/orders/${order.id}`)}
              className="card-hover cursor-pointer p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">
                      Pedido #{order.order_number}
                    </h3>
                    <p className="text-xs text-surface-400 mt-1">
                      {order.customer_name || 'Cliente'} • {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{formatBRL(order.total)}</p>
                    <p className="text-xs text-surface-400 mt-1">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-xs text-surface-500 mb-3 line-clamp-1">
                  Entrega: {new Date(order.delivery_date).toLocaleDateString('pt-BR')}
                </p>

                {/* Status Badges */}
                <div className="flex gap-2 flex-wrap">
                  <StatusBadge status={order.status as any} label={getStatusLabel(order.status)} />
                  <StatusBadge status={order.payment_status as any} label={getPaymentStatusLabel(order.payment_status)} />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="ml-4 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/orders/${order.id}`);
                  }}
                  className="btn-ghost text-sm px-3 py-1"
                >
                  Detalhes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
