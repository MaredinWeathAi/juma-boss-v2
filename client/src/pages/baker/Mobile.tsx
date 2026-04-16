import React, { useState, useEffect } from 'react';
import { formatBRL } from '../../lib/utils';
import {
  Home,
  ShoppingCart,
  DollarSign,
  User,
  Plus,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  Search,
  Phone,
  MapPin,
  Clock,
  TrendingUp,
  LogOut,
  Edit2,
  ArrowLeft,
  RefreshCw,
  Star,
  CreditCard,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

// Types
type Screen =
  | 'home'
  | 'orders'
  | 'orders-new'
  | 'orders-new-customer'
  | 'orders-new-products'
  | 'orders-new-confirm'
  | 'orders-new-success'
  | 'orders-detail'
  | 'money'
  | 'money-receive'
  | 'profile'
  | 'profile-edit'
  | 'profile-subscription';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  dueDate: string;
  paymentStatus: string;
  items?: Array<{ id: string; name: string; quantity: number; price: number }>;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface Payment {
  id: string;
  orderId?: string;
  amount: number;
  method: string;
  date: string;
  customerName?: string;
}

interface DashboardData {
  stats: {
    revenueThisMonth: number;
    pendingOrders: number;
  };
  todaysOrders: Order[];
}

// Toast component
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === 'success'
      ? 'bg-emerald-600'
      : type === 'error'
        ? 'bg-red-600'
        : 'bg-blue-600';

  return (
    <div
      className={`fixed bottom-20 left-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2`}
    >
      {type === 'success' && <Check size={20} />}
      {type === 'error' && <AlertCircle size={20} />}
      <span className="flex-1">{message}</span>
    </div>
  );
}

// Home Screen
function HomeScreen({
  data,
  onNewOrder,
  onOrders,
}: {
  data: DashboardData | null;
  onNewOrder: () => void;
  onOrders: () => void;
}) {
  const { user } = useAuth();

  if (!data) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-surface-800 rounded-lg"></div>
          <div className="h-24 bg-surface-800 rounded-lg"></div>
          <div className="h-12 bg-surface-800 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'Padeiro';

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Greeting */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white">Olá, {firstName}! 👋</h1>
        <p className="text-surface-400 text-sm mt-1">Bem-vindo de volta</p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl p-4 text-surface-950 shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm opacity-90 font-medium">Hoje</p>
            <p className="text-3xl font-bold mt-1">
              {data.todaysOrders.length} pedidos
            </p>
          </div>
          <TrendingUp size={32} className="opacity-70" />
        </div>
        <div className="border-t border-surface-950/20 pt-3">
          <p className="text-sm opacity-90">Faturamento este mês</p>
          <p className="text-2xl font-bold mt-1">
            {formatBRL(data.stats.revenueThisMonth || 0)}
          </p>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onNewOrder}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors min-h-24"
        >
          <Plus size={24} />
          <span className="text-sm">Novo Pedido</span>
        </button>
        <button
          onClick={onOrders}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors min-h-24"
        >
          <ShoppingCart size={24} />
          <span className="text-sm">Ver Pedidos</span>
        </button>
      </div>

      {/* Today's Orders List */}
      {data.todaysOrders.length > 0 && (
        <div>
          <h2 className="text-white font-semibold mb-3">Pedidos de hoje</h2>
          <div className="space-y-2">
            {data.todaysOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="card p-3 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{order.customerName}</p>
                  <p className="text-surface-400 text-xs mt-1">{order.orderNumber}</p>
                  <p className="text-brand-400 font-semibold text-sm mt-2">
                    {formatBRL(order.total)}
                  </p>
                </div>
                <div className="ml-2 text-right">
                  <span className="inline-block bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full">
                    {order.status === 'pending' ? 'Pendente' : 'Ativo'}
                  </span>
                  <p className="text-surface-500 text-xs mt-2">{order.dueDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.todaysOrders.length === 0 && (
        <div className="text-center py-8">
          <ShoppingCart size={32} className="mx-auto text-surface-600 mb-2" />
          <p className="text-surface-400">Nenhum pedido para hoje</p>
          <button
            onClick={onNewOrder}
            className="mt-4 text-emerald-400 font-semibold text-sm hover:text-emerald-300"
          >
            Criar primeiro pedido
          </button>
        </div>
      )}
    </div>
  );
}

// Orders Screen
function OrdersScreen({
  orders,
  loading,
  onSelectOrder,
  onNewOrder,
  onRefresh,
}: {
  orders: Order[];
  loading: boolean;
  onSelectOrder: (order: Order) => void;
  onNewOrder: () => void;
  onRefresh: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const statuses = [
    { key: null, label: 'Todos' },
    { key: 'pending', label: 'Pendente' },
    { key: 'in_production', label: 'Produção' },
    { key: 'ready', label: 'Pronto' },
    { key: 'delivered', label: 'Entregue' },
  ];

  const filteredOrders = statusFilter
    ? orders.filter((o) => o.status === statusFilter)
    : orders;

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      in_production: 'bg-blue-500/20 text-blue-400',
      ready: 'bg-emerald-500/20 text-emerald-400',
      delivered: 'bg-surface-600 text-surface-300',
    };
    return colors[status] || 'bg-surface-600 text-surface-300';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: 'Pendente',
      in_production: 'Produção',
      ready: 'Pronto',
      delivered: 'Entregue',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="p-4 pb-24 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-4 bg-surface-800 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-surface-800 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* Status Filter */}
      <div className="sticky top-0 bg-surface-950 z-10 p-4 border-b border-surface-800">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {statuses.map((s) => (
            <button
              key={s.key || 'all'}
              onClick={() => setStatusFilter(s.key as any)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                statusFilter === s.key
                  ? 'bg-brand-500 text-surface-950'
                  : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="p-4 flex justify-end">
        <button
          onClick={onRefresh}
          className="p-2 hover:bg-surface-800 rounded-lg transition-colors text-surface-400"
          title="Atualizar"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Orders List */}
      <div className="px-4 space-y-3 pb-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <button
              key={order.id}
              onClick={() => onSelectOrder(order)}
              className="card p-4 w-full text-left hover:bg-surface-800 transition-colors group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{order.customerName}</p>
                  <p className="text-surface-400 text-xs">{order.orderNumber}</p>
                </div>
                <ChevronRight
                  size={20}
                  className="text-surface-600 group-hover:text-brand-400 flex-shrink-0"
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-brand-400 font-semibold">
                  {formatBRL(order.total)}
                </p>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <p className="text-surface-500 text-xs mt-2">
                <Clock size={12} className="inline mr-1" />
                {order.dueDate}
              </p>
            </button>
          ))
        ) : (
          <div className="text-center py-12">
            <ShoppingCart size={48} className="mx-auto text-surface-600 mb-3" />
            <p className="text-surface-400 mb-4">Nenhum pedido encontrado</p>
            <button
              onClick={onNewOrder}
              className="text-emerald-400 font-semibold hover:text-emerald-300"
            >
              Criar novo pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Order Detail Screen
function OrderDetailScreen({
  order,
  onBack,
  onStatusChange,
}: {
  order: Order;
  onBack: () => void;
  onStatusChange: (newStatus: string) => void;
}) {
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      in_production: 'bg-blue-500/20 text-blue-400',
      ready: 'bg-emerald-500/20 text-emerald-400',
      delivered: 'bg-surface-600 text-surface-300',
    };
    return colors[status] || 'bg-surface-600 text-surface-300';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: 'Pendente',
      in_production: 'Produção',
      ready: 'Pronto',
      delivered: 'Entregue',
    };
    return labels[status] || status;
  };

  const statusFlow = ['pending', 'in_production', 'ready', 'delivered'];
  const currentIndex = statusFlow.indexOf(order.status);

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-surface-900 border-b border-surface-800 p-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-surface-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold">{order.customerName}</h1>
          <p className="text-surface-400 text-xs">{order.orderNumber}</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Status */}
        <div className="card p-4">
          <p className="text-surface-400 text-sm mb-2">Status</p>
          <span
            className={`inline-block text-sm px-4 py-2 rounded-full font-semibold ${getStatusColor(
              order.status
            )}`}
          >
            {getStatusLabel(order.status)}
          </span>
        </div>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <div className="card p-4 space-y-3">
            <p className="text-surface-400 text-sm font-semibold">Itens</p>
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-surface-800/50 rounded"
              >
                <div>
                  <p className="text-white font-medium text-sm">{item.name}</p>
                  <p className="text-surface-400 text-xs">
                    {item.quantity}x {formatBRL(item.price)}
                  </p>
                </div>
                <p className="text-brand-400 font-semibold text-sm">
                  {formatBRL(item.quantity * item.price)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="card p-4 bg-gradient-to-r from-brand-500/10 to-emerald-500/10 border border-brand-500/20">
          <p className="text-surface-400 text-sm mb-1">Total</p>
          <p className="text-3xl font-bold text-brand-400">
            {formatBRL(order.total)}
          </p>
        </div>

        {/* Payment Status */}
        <div className="card p-4">
          <p className="text-surface-400 text-sm mb-2">Pagamento</p>
          <span
            className={`inline-block text-sm px-3 py-1 rounded-full font-medium ${
              order.paymentStatus === 'paid'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {order.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
          </span>
        </div>

        {/* Status Action Buttons */}
        {currentIndex < statusFlow.length - 1 && (
          <div className="space-y-2">
            {currentIndex === 0 && (
              <button
                onClick={() => onStatusChange('in_production')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Iniciar Produção
              </button>
            )}
            {currentIndex === 1 && (
              <button
                onClick={() => onStatusChange('ready')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Marcar Pronto
              </button>
            )}
            {currentIndex === 2 && (
              <button
                onClick={() => onStatusChange('delivered')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Confirmar Entrega
              </button>
            )}
          </div>
        )}

        {currentIndex === statusFlow.length - 1 && (
          <div className="card p-4 bg-emerald-500/10 border border-emerald-500/20 text-center">
            <Check size={32} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-emerald-400 font-semibold">Pedido entregue</p>
          </div>
        )}

        {/* Delivery Date */}
        <div className="card p-4">
          <p className="text-surface-400 text-sm mb-2">Data de Entrega</p>
          <p className="text-white font-semibold flex items-center gap-2">
            <Clock size={16} />
            {order.dueDate}
          </p>
        </div>
      </div>
    </div>
  );
}

// New Order - Customer Selection
function NewOrderCustomerScreen({
  customers,
  loading,
  onSelectCustomer,
  onAddCustomer,
  onBack,
}: {
  customers: Customer[];
  loading: boolean;
  onSelectCustomer: (customer: Customer) => void;
  onAddCustomer: () => void;
  onBack: () => void;
}) {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const handleAddCustomer = async () => {
    if (newCustomer.name && newCustomer.phone) {
      onAddCustomer();
      setNewCustomer({ name: '', phone: '' });
      setShowAddForm(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card h-16 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-surface-900 border-b border-surface-800 p-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-surface-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold">Novo Pedido</h1>
          <p className="text-surface-400 text-xs">Selecione um cliente</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-surface-500" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>

        {/* Add New Customer */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Novo Cliente
          </button>
        ) : (
          <div className="card p-4 space-y-3 bg-emerald-500/10 border border-emerald-500/30">
            <input
              type="text"
              placeholder="Nome do cliente"
              value={newCustomer.name}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, name: e.target.value })
              }
              className="input text-sm"
            />
            <input
              type="tel"
              placeholder="Telefone"
              value={newCustomer.phone}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, phone: e.target.value })
              }
              className="input text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 btn-secondary py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddCustomer}
                disabled={!newCustomer.name || !newCustomer.phone}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-surface-700 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
              >
                Adicionar
              </button>
            </div>
          </div>
        )}

        {/* Customers List */}
        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((customer) => (
              <button
                key={customer.id}
                onClick={() => onSelectCustomer(customer)}
                className="card p-4 w-full text-left hover:bg-surface-800 transition-colors"
              >
                <p className="font-semibold text-white">{customer.name}</p>
                <div className="flex items-center gap-1 text-surface-400 text-sm mt-1">
                  <Phone size={14} />
                  {customer.phone}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-surface-400">
            <p>Nenhum cliente encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}

// New Order - Products Selection
function NewOrderProductsScreen({
  products,
  loading,
  selectedCustomer,
  onNext,
  onBack,
}: {
  products: Product[];
  loading: boolean;
  selectedCustomer: Customer;
  onNext: (items: Array<{ productId: string; quantity: number }>, total: number) => void;
  onBack: () => void;
}) {
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});

  const total = products.reduce((sum, p) => {
    const qty = quantities[p.id] || 0;
    return sum + p.price * qty;
  }, 0);

  const selectedItems = products.filter((p) => (quantities[p.id] || 0) > 0);

  const handleNext = () => {
    if (selectedItems.length > 0) {
      onNext(
        selectedItems.map((p) => ({
          productId: p.id,
          quantity: quantities[p.id],
        })),
        total
      );
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card h-20 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="bg-surface-900 border-b border-surface-800 p-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-surface-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold">Produtos</h1>
          <p className="text-surface-400 text-xs">{selectedCustomer.name}</p>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {products.map((product) => (
          <div key={product.id} className="card p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-white">{product.name}</p>
                {product.description && (
                  <p className="text-surface-400 text-xs mt-1">{product.description}</p>
                )}
              </div>
              <p className="text-brand-400 font-semibold ml-2">
                {formatBRL(product.price)}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-surface-800/50 rounded w-fit ml-auto">
              <button
                onClick={() =>
                  setQuantities({
                    ...quantities,
                    [product.id]: Math.max(0, (quantities[product.id] || 0) - 1),
                  })
                }
                className="px-3 py-1 hover:bg-surface-700 transition-colors text-white"
              >
                −
              </button>
              <span className="px-3 text-white font-semibold w-8 text-center">
                {quantities[product.id] || 0}
              </span>
              <button
                onClick={() =>
                  setQuantities({
                    ...quantities,
                    [product.id]: (quantities[product.id] || 0) + 1,
                  })
                }
                className="px-3 py-1 hover:bg-surface-700 transition-colors text-white"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Summary */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface-900 border-t border-surface-800 p-4 max-w-md mx-auto">
          <div className="mb-3 flex justify-between">
            <span className="text-surface-400">{selectedItems.length} item(ns)</span>
            <span className="text-2xl font-bold text-brand-400">
              {formatBRL(total)}
            </span>
          </div>
          <button
            onClick={handleNext}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Próximo
          </button>
        </div>
      )}
    </div>
  );
}

// New Order - Confirm
function NewOrderConfirmScreen({
  customer,
  items,
  total,
  products,
  onCreate,
  onBack,
  creating,
}: {
  customer: Customer;
  items: Array<{ productId: string; quantity: number }>;
  total: number;
  products: Product[];
  onCreate: (dueDate: string) => void;
  onBack: () => void;
  creating: boolean;
}) {
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );

  const getProductName = (id: string) => {
    return products.find((p) => p.id === id)?.name || 'Produto desconhecido';
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-surface-900 border-b border-surface-800 p-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-surface-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold">Confirmar Pedido</h1>
          <p className="text-surface-400 text-xs">Revise antes de criar</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Customer */}
        <div className="card p-4">
          <p className="text-surface-400 text-sm mb-2">Cliente</p>
          <p className="text-white font-semibold">{customer.name}</p>
          <p className="text-surface-400 text-sm flex items-center gap-1 mt-1">
            <Phone size={14} />
            {customer.phone}
          </p>
        </div>

        {/* Items */}
        <div className="card p-4 space-y-2">
          <p className="text-surface-400 text-sm font-semibold mb-2">Itens</p>
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 bg-surface-800/50 rounded"
            >
              <div>
                <p className="text-white font-medium text-sm">
                  {getProductName(item.productId)}
                </p>
                <p className="text-surface-400 text-xs">{item.quantity}x</p>
              </div>
              <p className="text-brand-400 font-semibold text-sm">
                {formatBRL(
                  (products.find((p) => p.id === item.productId)?.price || 0) *
                  item.quantity
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="card p-4 bg-gradient-to-r from-brand-500/10 to-emerald-500/10 border border-brand-500/20">
          <p className="text-surface-400 text-sm mb-1">Total do Pedido</p>
          <p className="text-3xl font-bold text-brand-400">{formatBRL(total)}</p>
        </div>

        {/* Due Date */}
        <div className="card p-4">
          <label className="text-surface-400 text-sm font-semibold block mb-2">
            Data de Entrega
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input w-full"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => onCreate(dueDate)}
            disabled={creating}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-surface-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Criando...
              </>
            ) : (
              <>
                <Check size={20} />
                Criar Pedido
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// New Order - Success
function NewOrderSuccessScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-900 rounded-2xl p-8 max-w-sm w-full mx-4 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto">
          <Check size={32} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Pedido Criado!</h2>
        <p className="text-surface-400">Seu novo pedido foi criado com sucesso</p>
        <button
          onClick={onClose}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Voltar para Pedidos
        </button>
      </div>
    </div>
  );
}

// Money Screen (Payments)
function MoneyScreen({
  data,
  onReceivePayment,
  onRefresh,
}: {
  data: any;
  onReceivePayment: () => void;
  onRefresh: () => void;
}) {
  const payments = data?.payments || [];
  const summary = data?.summary || { total: 0, pix: 0, cash: 0, card: 0 };

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Summary Card */}
      <div className="space-y-2">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
          <p className="text-sm opacity-90 font-medium">Recebido este mês</p>
          <p className="text-3xl font-bold mt-2">{formatBRL(summary.total || 0)}</p>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'PIX', value: summary.pix, color: 'from-blue-500 to-blue-600' },
            { label: 'Dinheiro', value: summary.cash, color: 'from-green-500 to-green-600' },
            { label: 'Cartão', value: summary.card, color: 'from-purple-500 to-purple-600' },
          ].map((method) => (
            <div
              key={method.label}
              className={`bg-gradient-to-br ${method.color} rounded-lg p-3 text-white text-center`}
            >
              <p className="text-xs opacity-90 font-medium">{method.label}</p>
              <p className="text-lg font-bold mt-1">{formatBRL(method.value || 0)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Receive Payment Button */}
      <button
        onClick={onReceivePayment}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={24} />
        Receber Pagamento
      </button>

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        className="w-full flex justify-center p-2 hover:bg-surface-800 rounded-lg transition-colors text-surface-400"
        title="Atualizar"
      >
        <RefreshCw size={20} />
      </button>

      {/* Recent Payments */}
      <div>
        <h2 className="text-white font-semibold mb-3">Pagamentos Recentes</h2>
        {payments.length > 0 ? (
          <div className="space-y-2">
            {payments.slice(0, 10).map((payment: Payment) => (
              <div key={payment.id} className="card p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">
                      {payment.customerName || 'Pagamento'}
                    </p>
                    <p className="text-surface-400 text-xs mt-1 capitalize">
                      {payment.method === 'pix'
                        ? 'PIX'
                        : payment.method === 'cash'
                          ? 'Dinheiro'
                          : 'Cartão'}
                    </p>
                  </div>
                  <p className="text-emerald-400 font-semibold text-sm">
                    {formatBRL(payment.amount || 0)}
                  </p>
                </div>
                <p className="text-surface-500 text-xs mt-2">{payment.date}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <DollarSign size={32} className="mx-auto text-surface-600 mb-2" />
            <p className="text-surface-400">Nenhum pagamento registrado</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Receive Payment Screen
function ReceivePaymentScreen({
  orders,
  onSubmit,
  onBack,
  submitting,
}: {
  orders: Order[];
  onSubmit: (amount: string, method: string, orderId?: string) => void;
  onBack: () => void;
  submitting: boolean;
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('pix');
  const [selectedOrder, setSelectedOrder] = useState<string>('');

  const handleSubmit = () => {
    if (amount) {
      onSubmit(amount, method, selectedOrder || undefined);
    }
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-surface-900 border-b border-surface-800 p-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-surface-400" />
        </button>
        <h1 className="text-white font-semibold">Receber Pagamento</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Amount */}
        <div className="card p-4">
          <label className="text-surface-400 text-sm font-semibold block mb-2">
            Valor
          </label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-brand-400 font-semibold">
              R$
            </span>
            <input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input pl-12 w-full text-lg font-semibold"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="card p-4 space-y-2">
          <label className="text-surface-400 text-sm font-semibold block mb-3">
            Forma de Pagamento
          </label>
          {[
            { key: 'pix', label: 'PIX' },
            { key: 'cash', label: 'Dinheiro' },
            { key: 'card', label: 'Cartão' },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMethod(m.key)}
              className={`w-full p-3 rounded-lg font-semibold transition-colors text-left ${
                method === m.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Order (Optional) */}
        {orders.length > 0 && (
          <div className="card p-4">
            <label className="text-surface-400 text-sm font-semibold block mb-2">
              Pedido (Opcional)
            </label>
            <select
              value={selectedOrder}
              onChange={(e) => setSelectedOrder(e.target.value)}
              className="input w-full"
            >
              <option value="">Nenhum pedido específico</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber} - {order.customerName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!amount || submitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-surface-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Registrando...
            </>
          ) : (
            <>
              <Check size={20} />
              Confirmar Pagamento
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Subscription Screen
function SubscriptionScreen({
  user,
  onBack,
}: {
  user: any;
  onBack: () => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [subscription, setSubscription] = React.useState<any>(null);
  const [plans, setPlans] = React.useState<any[]>([]);
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'annual'>('monthly');
  const [upgrading, setUpgrading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [currentRes, plansRes] = await Promise.all([
        api.get('/subscriptions/current'),
        api.get('/subscriptions/plans'),
      ]);
      setSubscription(currentRes.subscription);
      setPlans(plansRes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planSlug: string) => {
    if (subscription?.tier === planSlug && subscription?.billing_cycle === billingCycle) {
      return;
    }

    try {
      setUpgrading(true);
      setError(null);
      await api.post('/subscriptions/upgrade', {
        planSlug,
        billingCycle,
      });
      await fetchSubscriptionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar plano');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 pb-24 space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-brand-400 mb-4"
        >
          <ArrowLeft size={20} />
          Voltar
        </button>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-surface-800 rounded-lg"></div>
          <div className="h-32 bg-surface-800 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const currentPlan = plans.find(p => p.slug === subscription?.tier);

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-brand-400 font-semibold"
      >
        <ArrowLeft size={20} />
        Voltar
      </button>

      {/* Error */}
      {error && (
        <div className="card bg-red-500/20 border-red-500/30 border p-3 flex gap-2">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Current Plan */}
      {subscription && (
        <div className="card p-4 bg-gradient-to-br from-brand-500/20 to-amber-500/20 border-brand-500/30">
          <p className="text-surface-400 text-xs mb-1">Plano Atual</p>
          <h2 className="text-2xl font-bold text-white mb-3">{currentPlan?.name}</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-400">Status:</span>
              <span className={`font-semibold ${
                subscription.status === 'active' ? 'text-emerald-400' :
                subscription.status === 'trialing' ? 'text-blue-400' :
                'text-surface-400'
              }`}>
                {subscription.status === 'active' ? 'Ativo' :
                 subscription.status === 'trialing' ? 'Avaliação' :
                 subscription.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Próxima cobrança:</span>
              <span className="text-white font-semibold">
                {new Date(subscription.next_billing_date).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Valor mensal:</span>
              <span className="text-brand-400 font-bold">
                {formatBRL(subscription.monthly_price)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex gap-2 bg-surface-800 p-1 rounded-lg">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`flex-1 py-2 px-3 rounded text-sm font-semibold transition-colors ${
            billingCycle === 'monthly'
              ? 'bg-brand-500 text-surface-950'
              : 'text-surface-400 hover:text-white'
          }`}
        >
          Mensal
        </button>
        <button
          onClick={() => setBillingCycle('annual')}
          className={`flex-1 py-2 px-3 rounded text-sm font-semibold transition-colors ${
            billingCycle === 'annual'
              ? 'bg-brand-500 text-surface-950'
              : 'text-surface-400 hover:text-white'
          }`}
        >
          Anual
        </button>
      </div>

      {/* Plan Cards */}
      <div>
        <p className="text-surface-400 text-xs font-semibold mb-3 uppercase">Selecionar Plano</p>
        <div className="space-y-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`card p-4 border ${
                subscription?.tier === plan.slug
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-surface-700 bg-surface-800'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-bold">{plan.name}</h3>
                  <p className="text-surface-400 text-xs mt-1">{plan.description}</p>
                </div>
                {subscription?.tier === plan.slug && (
                  <Star size={18} className="text-brand-400 fill-brand-400 flex-shrink-0" />
                )}
              </div>

              <p className="text-2xl font-bold text-white mb-3">
                {formatBRL(billingCycle === 'annual' ? plan.annual_price : plan.monthly_price)}
              </p>

              <button
                onClick={() => handleUpgrade(plan.slug)}
                disabled={
                  upgrading ||
                  (subscription?.tier === plan.slug && subscription?.billing_cycle === billingCycle)
                }
                className={`w-full py-2 rounded-lg font-semibold text-sm transition-colors ${
                  subscription?.tier === plan.slug && subscription?.billing_cycle === billingCycle
                    ? 'bg-surface-700 text-surface-400 cursor-default'
                    : plan.slug === 'free'
                      ? 'bg-surface-700 text-white hover:bg-surface-600'
                      : 'bg-brand-500 text-surface-950 hover:bg-brand-600'
                }`}
              >
                {upgrading ? 'Processando...' : 'Selecionar'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Profile Screen
function ProfileScreen({
  user,
  onEditProfile,
  onSubscription,
  onLogout,
}: {
  user: any;
  onEditProfile: () => void;
  onSubscription: () => void;
  onLogout: () => void;
}) {
  const initials = user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Profile Header */}
      <div className="text-center pt-4">
        <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl font-bold text-surface-950">{initials}</span>
        </div>
        <h1 className="text-2xl font-bold text-white">{user?.name || 'Usuário'}</h1>
        <p className="text-surface-400 text-sm mt-1">{user?.email}</p>
      </div>

      {/* Bakery Info */}
      {user?.bakery && (
        <div className="card p-4 space-y-3">
          <div>
            <p className="text-surface-400 text-sm">Nome da Padaria</p>
            <p className="text-white font-semibold mt-1">{user.bakery.name}</p>
          </div>
          <div className="border-t border-surface-800 pt-3">
            <p className="text-surface-400 text-sm">Plano</p>
            <p className="text-brand-400 font-semibold mt-1 uppercase">
              {user.bakery.tier}
            </p>
          </div>
          <div className="border-t border-surface-800 pt-3">
            <p className="text-surface-400 text-sm">Status</p>
            <p className="text-emerald-400 font-semibold mt-1 capitalize">
              {user.bakery.status}
            </p>
          </div>
        </div>
      )}

      {/* Edit Profile Button */}
      <button
        onClick={onEditProfile}
        className="w-full bg-brand-500 hover:bg-brand-600 text-surface-950 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Edit2 size={20} />
        Editar Perfil
      </button>

      {/* Subscription Button */}
      <button
        onClick={onSubscription}
        className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 border border-amber-500/30"
      >
        <CreditCard size={20} />
        Gerenciar Assinatura
      </button>

      {/* Logout Button */}
      <button
        onClick={onLogout}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <LogOut size={20} />
        Sair
      </button>

      {/* Info */}
      <div className="card p-4 bg-surface-800/50 text-center">
        <p className="text-surface-400 text-xs">
          Juma Boss • Gerenciador de Padaria
        </p>
        <p className="text-surface-500 text-xs mt-2">Versão 1.0.0</p>
      </div>
    </div>
  );
}

// Profile Edit Screen
function ProfileEditScreen({
  user,
  onSave,
  onBack,
  saving,
}: {
  user: any;
  onSave: (name: string, phone: string) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const handleSave = () => {
    if (name) {
      onSave(name, phone);
    }
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-surface-900 border-b border-surface-800 p-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-surface-400" />
        </button>
        <h1 className="text-white font-semibold">Editar Perfil</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Name */}
        <div className="card p-4">
          <label className="text-surface-400 text-sm font-semibold block mb-2">
            Nome
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input w-full"
          />
        </div>

        {/* Phone */}
        <div className="card p-4">
          <label className="text-surface-400 text-sm font-semibold block mb-2">
            Telefone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input w-full"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!name || saving}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-surface-700 text-surface-950 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-surface-950 border-t-transparent rounded-full animate-spin"></div>
              Salvando...
            </>
          ) : (
            <>
              <Check size={20} />
              Salvar Alterações
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Main Mobile App Component
export default function BakerMobile() {
  const { user, logout } = useAuth();
  const [screen, setScreen] = useState<Screen>('home');
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Data States
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [payments, setPayments] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // New Order State
  const [newOrderCustomer, setNewOrderCustomer] = useState<Customer | null>(null);
  const [newOrderItems, setNewOrderItems] = useState<
    Array<{ productId: string; quantity: number }>
  >([]);
  const [newOrderTotal, setNewOrderTotal] = useState(0);

  // Loading states
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Dashboard
  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoadingDashboard(true);
      const data = await api.get('/baker/dashboard');
      setDashboardData(data);
    } catch (err) {
      setToast({
        message: 'Erro ao carregar dashboard',
        type: 'error',
      });
    } finally {
      setLoadingDashboard(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const data = await api.get('/baker/orders');
      setOrders(data.orders || []);
    } catch (err) {
      setToast({
        message: 'Erro ao carregar pedidos',
        type: 'error',
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const data = await api.get('/baker/customers');
      setCustomers(data.customers || []);
    } catch (err) {
      setToast({
        message: 'Erro ao carregar clientes',
        type: 'error',
      });
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const data = await api.get('/baker/products');
      setProducts(data.products || []);
    } catch (err) {
      setToast({
        message: 'Erro ao carregar produtos',
        type: 'error',
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      const data = await api.get('/baker/payments');
      setPayments(data);
    } catch (err) {
      setToast({
        message: 'Erro ao carregar pagamentos',
        type: 'error',
      });
    } finally {
      setLoadingPayments(false);
    }
  };

  // Navigation Handlers
  const handleNewOrder = async () => {
    await fetchCustomers();
    await fetchProducts();
    setScreen('orders-new-customer');
  };

  const handleSelectCustomer = (customer: Customer) => {
    setNewOrderCustomer(customer);
    setScreen('orders-new-products');
  };

  const handleAddCustomer = async () => {
    await fetchCustomers();
  };

  const handleSelectProducts = (
    items: Array<{ productId: string; quantity: number }>,
    total: number
  ) => {
    setNewOrderItems(items);
    setNewOrderTotal(total);
    setScreen('orders-new-confirm');
  };

  const handleCreateOrder = async (dueDate: string) => {
    try {
      setSubmitting(true);
      const items = newOrderItems.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: product?.price || 0,
        };
      });

      await api.post('/baker/orders', {
        customerId: newOrderCustomer?.id,
        items,
        dueDate,
      });

      setScreen('orders-new-success');
      setToast({
        message: 'Pedido criado com sucesso!',
        type: 'success',
      });
    } catch (err) {
      setToast({
        message: 'Erro ao criar pedido',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessClose = async () => {
    setNewOrderCustomer(null);
    setNewOrderItems([]);
    setNewOrderTotal(0);
    await fetchOrders();
    await fetchDashboard();
    setScreen('orders');
  };

  const handleOrderStatusChange = async (newStatus: string) => {
    if (!selectedOrder) return;
    try {
      setSubmitting(true);
      await api.put(`/baker/orders/${selectedOrder.id}`, {
        status: newStatus,
      });
      setToast({
        message: 'Pedido atualizado com sucesso!',
        type: 'success',
      });
      await fetchOrders();
      await fetchDashboard();
      if (orders.length > 0) {
        const updated = orders.find((o) => o.id === selectedOrder.id);
        if (updated) {
          setSelectedOrder(updated);
        }
      }
    } catch (err) {
      setToast({
        message: 'Erro ao atualizar pedido',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceivePayment = async (
    amount: string,
    method: string,
    orderId?: string
  ) => {
    try {
      setSubmitting(true);
      await api.post('/baker/payments', {
        amount: parseFloat(amount),
        method,
        orderId,
      });
      setToast({
        message: 'Pagamento registrado com sucesso!',
        type: 'success',
      });
      await fetchPayments();
      setScreen('money');
    } catch (err) {
      setToast({
        message: 'Erro ao registrar pagamento',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProfile = async (name: string, phone: string) => {
    try {
      setSubmitting(true);
      await api.put('/baker/profile', { name, phone });
      setToast({
        message: 'Perfil atualizado com sucesso!',
        type: 'success',
      });
      setScreen('profile');
    } catch (err) {
      setToast({
        message: 'Erro ao atualizar perfil',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Lazy load data when switching tabs
  useEffect(() => {
    if (screen === 'orders' && orders.length === 0 && !loadingOrders) {
      fetchOrders();
    }
  }, [screen]);

  useEffect(() => {
    if (screen === 'money' && !payments && !loadingPayments) {
      fetchPayments();
    }
  }, [screen]);

  // Screen Rendering
  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return (
          <HomeScreen
            data={dashboardData}
            onNewOrder={handleNewOrder}
            onOrders={async () => {
              await fetchOrders();
              setScreen('orders');
            }}
          />
        );
      case 'orders':
        return (
          <OrdersScreen
            orders={orders}
            loading={loadingOrders}
            onSelectOrder={(order) => {
              setSelectedOrder(order);
              setScreen('orders-detail');
            }}
            onNewOrder={handleNewOrder}
            onRefresh={fetchOrders}
          />
        );
      case 'orders-detail':
        return selectedOrder ? (
          <OrderDetailScreen
            order={selectedOrder}
            onBack={() => setScreen('orders')}
            onStatusChange={handleOrderStatusChange}
          />
        ) : null;
      case 'orders-new-customer':
        return (
          <NewOrderCustomerScreen
            customers={customers}
            loading={loadingCustomers}
            onSelectCustomer={handleSelectCustomer}
            onAddCustomer={handleAddCustomer}
            onBack={() => setScreen('home')}
          />
        );
      case 'orders-new-products':
        return newOrderCustomer ? (
          <NewOrderProductsScreen
            products={products}
            loading={loadingProducts}
            selectedCustomer={newOrderCustomer}
            onNext={handleSelectProducts}
            onBack={() => setScreen('orders-new-customer')}
          />
        ) : null;
      case 'orders-new-confirm':
        return newOrderCustomer ? (
          <NewOrderConfirmScreen
            customer={newOrderCustomer}
            items={newOrderItems}
            total={newOrderTotal}
            products={products}
            onCreate={handleCreateOrder}
            onBack={() => setScreen('orders-new-products')}
            creating={submitting}
          />
        ) : null;
      case 'orders-new-success':
        return <NewOrderSuccessScreen onClose={handleSuccessClose} />;
      case 'money':
        return (
          <MoneyScreen
            data={payments}
            onReceivePayment={() => {
              if (orders.length === 0) {
                fetchOrders();
              }
              setScreen('money-receive');
            }}
            onRefresh={fetchPayments}
          />
        );
      case 'money-receive':
        return (
          <ReceivePaymentScreen
            orders={orders}
            onSubmit={handleReceivePayment}
            onBack={() => setScreen('money')}
            submitting={submitting}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            user={user}
            onEditProfile={() => setScreen('profile-edit')}
            onSubscription={() => setScreen('profile-subscription')}
            onLogout={handleLogout}
          />
        );
      case 'profile-edit':
        return (
          <ProfileEditScreen
            user={user}
            onSave={handleSaveProfile}
            onBack={() => setScreen('profile')}
            saving={submitting}
          />
        );
      case 'profile-subscription':
        return (
          <SubscriptionScreen
            user={user}
            onBack={() => setScreen('profile')}
          />
        );
      default:
        return <HomeScreen data={dashboardData} onNewOrder={handleNewOrder} onOrders={() => setScreen('orders')} />;
    }
  };

  // Check if showing fullscreen screens
  const isFullScreen =
    screen.startsWith('orders-new') || screen === 'money-receive' || screen === 'profile-edit' || screen === 'profile-subscription' || screen === 'orders-detail';

  return (
    <div className="max-w-md mx-auto h-screen bg-surface-950 flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {renderScreen()}
      </div>

      {/* Bottom Tab Navigation - Hidden on fullscreen */}
      {!isFullScreen && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface-900 border-t border-surface-800 max-w-md mx-auto">
          <div className="flex items-center justify-around">
            {[
              { id: 'home', label: 'Início', icon: Home },
              { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
              { id: 'money', label: 'Pagamentos', icon: DollarSign },
              { id: 'profile', label: 'Perfil', icon: User },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setScreen(id as Screen)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                  screen === id
                    ? 'text-brand-400'
                    : 'text-surface-500 hover:text-surface-400'
                }`}
              >
                <Icon size={24} />
                <span className="text-xs font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Action Button - New Order (Home & Orders screens) */}
      {(screen === 'home' || screen === 'orders') && (
        <button
          onClick={handleNewOrder}
          className="fixed bottom-24 right-4 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-40"
          title="Novo Pedido"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
