import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import api from '../../lib/api';

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
  customer_email?: string;
  customer_phone?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  due_date: string;
  delivery_date?: string;
  delivery_address?: string;
  delivery_type?: 'pickup' | 'delivery';
  payment_status: 'unpaid' | 'partial' | 'paid';
  payment_method?: string;
  created_at: string;
  updated_at: string;
}

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'card'>('pix');
  const [updateStatusLoading, setUpdateStatusLoading] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/baker/orders/${id}`);
      setOrder(response.data || response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!order) return;
    try {
      setUpdateStatusLoading(true);
      setError(null);
      await api.put(`/baker/orders/${order.id}`, { status: newStatus });
      setOrder({ ...order, status: newStatus as any });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdateStatusLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!order || !paymentAmount) {
      setError('Informe um valor');
      return;
    }

    try {
      setUpdateStatusLoading(true);
      setError(null);
      await api.post('/baker/payments', {
        orderId: order.id,
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
      });
      setPaymentAmount('');
      setRecordingPayment(false);
      fetchOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setUpdateStatusLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'confirmed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'preparing':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'ready':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
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

  const statusFlow = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-surface-800 rounded w-1/4 animate-pulse"></div>
        <div className="card animate-pulse space-y-4">
          <div className="h-4 bg-surface-800 rounded w-3/4"></div>
          <div className="h-4 bg-surface-800 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card bg-red-500/10 border-red-500/50">
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-red-400">Pedido não encontrado</h3>
            <button
              onClick={() => navigate('/baker/orders')}
              className="btn-secondary text-sm mt-4"
            >
              Voltar para pedidos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/app/orders')}
          className="btn-ghost p-2"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="page-title">Pedido #{order.order_number}</h1>
          <p className="page-subtitle">
            Criado em {new Date(order.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {error && (
        <div className="card bg-red-500/10 border-red-500/50 mb-6 flex items-start gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-1" size={18} />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Status Workflow */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-6">Fluxo de Status</h3>
            <div className="flex items-center justify-between mb-6">
              {statusFlow.map((status, index) => (
                <div key={status} className="flex-1 flex flex-col items-center relative">
                  <button
                    onClick={() => handleUpdateStatus(status)}
                    disabled={updateStatusLoading}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2 transition-all ${
                      status === order.status
                        ? 'bg-brand-500 text-surface-950 scale-110'
                        : statusFlow.indexOf(status) < statusFlow.indexOf(order.status)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
                    }`}
                    title={`Mudar para ${getStatusLabel(status)}`}
                  >
                    {statusFlow.indexOf(status) < statusFlow.indexOf(order.status) ? (
                      <CheckCircle size={20} />
                    ) : (
                      index + 1
                    )}
                  </button>
                  <p className="text-xs text-surface-400 text-center">
                    {getStatusLabel(status)}
                  </p>

                  {index < statusFlow.length - 1 && (
                    <div className="absolute top-4 left-1/2 w-full h-1 bg-surface-800"></div>
                  )}
                </div>
              ))}
            </div>

            <div className={`p-3 rounded-lg text-sm ${getStatusColor(order.status)}`}>
              Status atual: <strong>{getStatusLabel(order.status)}</strong>
            </div>
          </div>

          {/* Order Items */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-6">Itens do Pedido</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-700">
                    <th className="table-header text-left py-3">Produto</th>
                    <th className="table-header text-center py-3">Qtd</th>
                    <th className="table-header text-right py-3">Preço Unit.</th>
                    <th className="table-header text-right py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-surface-800">
                      <td className="py-3 text-sm text-white">Produto</td>
                      <td className="py-3 text-center text-sm text-surface-300">{item.quantity}</td>
                      <td className="py-3 text-right text-sm text-surface-300">
                        R$ {(item.unitPrice as any).toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-sm font-medium text-white">
                        R$ {(item.total as any).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 space-y-3 pt-6 border-t border-surface-700">
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Subtotal</span>
                <span className="text-white">R$ {order.subtotal.toFixed(2)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-surface-400">Impostos</span>
                  <span className="text-white">R$ {order.tax.toFixed(2)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-surface-400">Desconto</span>
                  <span className="text-emerald-400">-R$ {order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-surface-700 pt-3">
                <span className="text-white">Total</span>
                <span className="text-brand-400">R$ {order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Informações de Entrega</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-400">Data de Entrega</span>
                <span className="text-white">
                  {new Date(order.due_date).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Tipo</span>
                <span className="text-white">
                  {order.delivery_type === 'pickup' ? 'Retirada' : 'Entrega'}
                </span>
              </div>
              {order.delivery_address && (
                <div className="flex justify-between">
                  <span className="text-surface-400">Endereço</span>
                  <span className="text-white text-right">{order.delivery_address}</span>
                </div>
              )}
              {order.notes && (
                <div className="pt-3 border-t border-surface-700">
                  <p className="text-surface-400 mb-2">Notas</p>
                  <p className="text-surface-200 bg-surface-800 p-3 rounded">
                    {order.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Cliente</h3>
            <div className="space-y-2">
              <p className="font-semibold text-white">{order.customer_name || 'Cliente'}</p>
              {order.customer_email && (
                <p className="text-sm text-surface-400">{order.customer_email}</p>
              )}
              {order.customer_phone && (
                <p className="text-sm text-surface-400">{order.customer_phone}</p>
              )}
            </div>
          </div>

          {/* Payment Section */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Pagamento</h3>

            <div className={`p-3 rounded-lg mb-4 text-sm font-semibold ${
              order.payment_status === 'paid'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : order.payment_status === 'partial'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {order.payment_status === 'paid'
                ? 'Pago'
                : order.payment_status === 'partial'
                ? 'Parcialmente pago'
                : 'Não pago'}
            </div>

            <div className="bg-surface-800 p-3 rounded-lg mb-4">
              <p className="text-xs text-surface-500 mb-1">Valor a receber</p>
              <p className="text-2xl font-bold text-white">
                R$ {Math.max(0, order.total - (order.payment_status === 'paid' ? order.total : 0)).toFixed(2)}
              </p>
            </div>

            {!recordingPayment ? (
              <button
                onClick={() => setRecordingPayment(true)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <DollarSign size={18} />
                Registrar Pagamento
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-surface-500 mb-2">Valor</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs text-surface-500 mb-2">Método</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="input w-full"
                  >
                    <option value="pix">PIX</option>
                    <option value="cash">Dinheiro</option>
                    <option value="card">Cartão</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setRecordingPayment(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRecordPayment}
                    disabled={updateStatusLoading}
                    className="btn-primary flex-1"
                  >
                    Registrar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Info */}
          <div className="card">
            <h3 className="text-sm font-semibold text-surface-400 uppercase mb-3">
              Informações do Pedido
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-500">ID do Pedido</span>
                <span className="text-surface-300 font-mono text-xs">{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Criado em</span>
                <span className="text-surface-300">
                  {new Date(order.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Atualizado em</span>
                <span className="text-surface-300">
                  {new Date(order.updated_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
