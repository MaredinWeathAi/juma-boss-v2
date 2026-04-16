'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Users,
  DollarSign,
  ShoppingCart,
  Package,
  UserCheck,
  Eye,
  Edit2,
  Trash2,
  Crown,
  Shield,
  AlertCircle,
  Loader,
  X,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatBRL } from '../../lib/utils';

interface ClientDetailData {
  user: {
    id: string;
    email: string;
    name: string;
    phone: string;
    created_at: string;
  };
  bakery: {
    id: string;
    name: string;
    slug: string;
    description: string;
    tier: 'free' | 'starter' | 'pro' | 'enterprise';
    status: 'active' | 'suspended' | 'churned';
    created_at: string;
  };
  subscription: {
    tier: 'free' | 'starter' | 'pro' | 'enterprise';
    status: 'active' | 'inactive' | 'cancelled';
    monthly_price: number;
    started_at: string;
    current_period_end: string;
  };
  stats: {
    totalOrders: number;
    totalRevenue: number;
    totalProducts: number;
    totalCustomers: number;
    totalEmployees: number;
    pendingOrders: number;
    monthlyRevenue: number;
  };
  revenueByMonth: Array<{ month: string; revenue: number; orders: number }>;
  ordersByStatus: Array<{ status: string; count: number }>;
  recentOrders: Array<{
    id: string;
    order_number: string;
    total: number;
    status: string;
    created_at: string;
    customer_name: string;
  }>;
  products: Array<{
    id: string;
    name: string;
    price: number;
    category: string;
    is_active: number;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    total_spent: number;
    total_orders?: number;
    order_count?: number;
  }>;
}

const TIER_COLORS = {
  free: { bg: 'bg-surface-700', text: 'text-surface-300' },
  starter: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  pro: { bg: 'bg-brand-500/20', text: 'text-brand-400' },
  enterprise: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

const STATUS_COLORS = {
  active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Active' },
  suspended: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Suspended' },
  churned: { bg: 'bg-surface-700', text: 'text-surface-400', label: 'Churned' },
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatCard = ({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  loading?: boolean;
}) => (
  <div className="card animate-fade-in">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-surface-400 text-sm font-medium">{label}</p>
        {loading ? (
          <div className="h-8 w-24 bg-surface-800 rounded animate-pulse mt-2" />
        ) : (
          <p className="text-2xl font-bold text-white mt-2">{value}</p>
        )}
      </div>
      <div className="p-2.5 bg-brand-500/10 rounded-lg text-brand-400">{Icon}</div>
    </div>
  </div>
);

const TierBadge = ({ tier }: { tier: keyof typeof TIER_COLORS }) => (
  <span
    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${TIER_COLORS[tier].bg} ${TIER_COLORS[tier].text} capitalize`}
  >
    {tier}
  </span>
);

const StatusBadge = ({ status }: { status: keyof typeof STATUS_COLORS }) => {
  const config = STATUS_COLORS[status];
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text} capitalize`}
    >
      {config.label}
    </span>
  );
};

const TierChangeModal = ({
  isOpen,
  currentTier,
  onClose,
  onSubmit,
  loading,
}: {
  isOpen: boolean;
  currentTier: string;
  onClose: () => void;
  onSubmit: (newTier: string) => Promise<void>;
  loading: boolean;
}) => {
  const [selectedTier, setSelectedTier] = useState(currentTier);
  const [error, setError] = useState<string | null>(null);

  const tiers = ['free', 'starter', 'pro', 'enterprise'];

  const handleSubmit = async () => {
    setError(null);
    try {
      await onSubmit(selectedTier);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change tier');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-900 rounded-xl border border-surface-800 w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <h2 className="text-lg font-bold text-white">Change Subscription Tier</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-surface-400" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="flex gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg mb-4">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-2 mb-6">
            {tiers.map((tier) => (
              <label
                key={tier}
                className="flex items-center p-3 border border-surface-700 rounded-lg hover:border-brand-500/50 cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="tier"
                  value={tier}
                  checked={selectedTier === tier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  disabled={loading}
                  className="w-4 h-4"
                />
                <span className="ml-3 text-white capitalize font-medium flex-1">{tier}</span>
                {currentTier === tier && (
                  <span className="text-xs text-surface-400">(Current)</span>
                )}
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={loading || selectedTier === currentTier}
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <Crown size={16} />}
              {loading ? 'Updating...' : 'Change Tier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({
  isOpen,
  clientName,
  onClose,
  onConfirm,
  loading,
}: {
  isOpen: boolean;
  clientName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-900 rounded-xl border border-surface-800 w-full max-w-sm">
        <div className="p-6">
          <div className="flex gap-3 mb-4">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertCircle className="text-red-400" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white mb-1">Delete Client?</h3>
              <p className="text-sm text-surface-400">
                Are you sure you want to delete <strong>{clientName}</strong>? This action cannot be
                undone.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg mb-4">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="btn-danger flex-1 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ClientDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { impersonate } = useAuth();

  const [data, setData] = useState<ClientDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTierModal, setShowTierModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchClientDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/admin/clients/${id}`);
        setData(response as ClientDetailData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load client details');
      } finally {
        setLoading(false);
      }
    };

    fetchClientDetail();
  }, [id]);

  const handleImpersonate = async () => {
    if (!data || !id) return;
    try {
      setSubmitting(true);
      const response = await api.post(`/admin/clients/${id}/impersonate`, {});
      const impersonateData = response as { token: string; user: any };
      impersonate(impersonateData.token, impersonateData.user);
      navigate('/baker');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to impersonate client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeTier = async (newTier: string) => {
    if (!id) return;
    try {
      setSubmitting(true);
      await api.put(`/admin/clients/${id}`, { tier: newTier });
      if (data) {
        setData({
          ...data,
          bakery: { ...data.bakery, tier: newTier as any },
          subscription: { ...data.subscription, tier: newTier as any },
        });
      }
      setShowTierModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      await api.delete(`/admin/clients/${id}`);
      navigate('/admin/clients');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number | undefined | null) => {
    const num = value ?? 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatNumber = (value: number | undefined | null) => {
    const num = value ?? 0;
    return num.toLocaleString('en-US');
  };

  if (error && !data) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/admin/clients')}
          className="flex items-center gap-2 text-surface-400 hover:text-white mb-2"
        >
          <ArrowLeft size={18} />
          Back to Clients
        </button>

        <div className="card flex flex-col items-center justify-center py-16">
          <AlertCircle size={48} className="text-red-400 mb-4 opacity-50" />
          <p className="text-surface-300 font-medium mb-2">Unable to load client</p>
          <p className="text-surface-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/clients')}
        className="flex items-center gap-2 text-surface-400 hover:text-white transition-colors mb-2"
      >
        <ArrowLeft size={18} />
        Back to Clients
      </button>

      {/* Header */}
      {loading ? (
        <div className="space-y-3">
          <div className="h-10 w-48 bg-surface-800 rounded animate-pulse" />
          <div className="h-4 w-64 bg-surface-800 rounded animate-pulse" />
        </div>
      ) : data ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">{data.user.name}</h1>
            <p className="page-subtitle">{data.bakery.name}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <TierBadge tier={data.bakery.tier} />
              <StatusBadge status={data.bakery.status as any} />
              <span className="text-sm text-surface-400">
                Member since{' '}
                {new Date(data.user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Action Buttons */}
      {data && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleImpersonate}
            className="btn-primary flex items-center gap-2"
            disabled={submitting}
          >
            {submitting ? <Loader size={16} className="animate-spin" /> : <Eye size={16} />}
            Impersonate
          </button>
          <button
            onClick={() => setShowTierModal(true)}
            className="btn-secondary flex items-center gap-2"
            disabled={submitting}
          >
            <Crown size={16} />
            Change Tier
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn-danger flex items-center gap-2"
            disabled={submitting}
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      )}

      {/* Stats Grid */}
      {data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard
            icon={<ShoppingCart size={20} />}
            label="Total Orders"
            value={formatNumber(data.stats.totalOrders)}
          />
          <StatCard
            icon={<DollarSign size={20} />}
            label="Total Revenue"
            value={formatCurrency(data.stats.totalRevenue)}
          />
          <StatCard
            icon={<DollarSign size={20} />}
            label="Monthly Revenue"
            value={formatCurrency(data.stats.monthlyRevenue)}
          />
          <StatCard
            icon={<Package size={20} />}
            label="Products"
            value={formatNumber(data.stats.totalProducts)}
          />
          <StatCard
            icon={<Users size={20} />}
            label="Customers"
            value={formatNumber(data.stats.totalCustomers)}
          />
          <StatCard
            icon={<UserCheck size={20} />}
            label="Employees"
            value={formatNumber(data.stats.totalEmployees)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <StatCard key={i} icon={<div />} label="Loading..." value="--" loading={true} />
          ))}
        </div>
      )}

      {/* Subscription Details */}
      {data && (
        <div className="card animate-fade-in">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Subscription Details</h2>
              <p className="text-sm text-surface-400 mt-1">Current plan and billing information</p>
            </div>
            <button
              onClick={() => setShowTierModal(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Crown size={14} />
              Change Tier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-surface-400 text-sm">Current Tier</p>
              <div className="inline-flex items-center">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                    TIER_COLORS[data.bakery.tier].bg
                  } ${TIER_COLORS[data.bakery.tier].text}`}
                >
                  {data.bakery.tier}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-surface-400 text-sm">Monthly Price</p>
              <p className="text-xl font-bold text-brand-400">
                {formatBRL(data.subscription.monthly_price)}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-surface-400 text-sm">Status</p>
              <div className="inline-flex items-center">
                <StatusBadge status={data.subscription.status as any} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-surface-400 text-sm">Subscription Started</p>
              <p className="text-white font-medium">
                {new Date(data.subscription.started_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-surface-400 text-sm">Current Period Ends</p>
              <p className="text-white font-medium">
                {new Date(data.subscription.current_period_end).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-surface-400 text-sm">Days Remaining</p>
              <p className="text-white font-medium">
                {Math.max(
                  0,
                  Math.ceil(
                    (new Date(data.subscription.current_period_end).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                )}{' '}
                days
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="card lg:col-span-2 animate-fade-in">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">Revenue Trend</h2>
              <p className="text-sm text-surface-400 mt-1">Monthly revenue over time</p>
            </div>

            {data.revenueByMonth && data.revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.revenueByMonth}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255, 255, 255, 0.1)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    stroke="rgba(255, 255, 255, 0.3)"
                    style={{ fontSize: '0.875rem' }}
                  />
                  <YAxis
                    stroke="rgba(255, 255, 255, 0.3)"
                    style={{ fontSize: '0.875rem' }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(23, 23, 23, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.5rem',
                    }}
                    labelStyle={{ color: '#f3f4f6' }}
                    formatter={(value) => [
                      formatCurrency(typeof value === 'number' ? value : 0),
                      'Revenue',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f59e0b"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 bg-surface-800 rounded-lg flex items-center justify-center text-surface-500">
                No revenue data available
              </div>
            )}
          </div>

          {/* Order Status Pie */}
          <div className="card animate-fade-in">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">Order Status</h2>
              <p className="text-sm text-surface-400 mt-1">Distribution by status</p>
            </div>

            {data.ordersByStatus && data.ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.ordersByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.ordersByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(23, 23, 23, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.5rem',
                    }}
                    labelStyle={{ color: '#f3f4f6' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 bg-surface-800 rounded-lg flex items-center justify-center text-surface-500">
                No order data available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Orders Table */}
      {data && (
        <div className="card animate-fade-in">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Recent Orders</h2>
            <p className="text-sm text-surface-400 mt-1">Last 10 orders</p>
          </div>

          {data.recentOrders && data.recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="table-header text-left py-3">Order Number</th>
                    <th className="table-header text-left py-3">Customer</th>
                    <th className="table-header text-right py-3">Amount</th>
                    <th className="table-header text-left py-3">Status</th>
                    <th className="table-header text-left py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order, idx) => (
                    <tr
                      key={order.id}
                      className={`border-b border-surface-800 hover:bg-surface-800/50 transition-colors ${
                        idx === data.recentOrders.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="py-3 text-white font-medium">{order.order_number}</td>
                      <td className="py-3 text-surface-300">{order.customer_name}</td>
                      <td className="py-3 text-white font-medium text-right">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 capitalize">
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 text-surface-400">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-surface-500">No recent orders</div>
          )}
        </div>
      )}

      {/* Products Grid */}
      {data && (
        <div className="card animate-fade-in">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Products</h2>
            <p className="text-sm text-surface-400 mt-1">All products ({data.products.length})</p>
          </div>

          {data.products && data.products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.products.map((product) => (
                <div
                  key={product.id}
                  className="border border-surface-800 rounded-lg p-4 hover:border-surface-700 transition-colors"
                >
                  <p className="font-semibold text-white mb-1">{product.name}</p>
                  <p className="text-xs text-surface-400 mb-3">{product.category}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-brand-400">
                      {formatCurrency(product.price)}
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        product.is_active
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-surface-700 text-surface-400'
                      }`}
                    >
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-surface-500">No products</div>
          )}
        </div>
      )}

      {/* Top Customers */}
      {data && (
        <div className="card animate-fade-in">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Top Customers</h2>
            <p className="text-sm text-surface-400 mt-1">Best customers by spending</p>
          </div>

          {data.topCustomers && data.topCustomers.length > 0 ? (
            <div className="space-y-3">
              {data.topCustomers.map((customer, idx) => (
                <div
                  key={customer.id}
                  className={`flex items-center justify-between p-4 border border-surface-800 rounded-lg ${
                    idx === 0 ? 'border-brand-500/50 bg-brand-500/5' : ''
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-white flex items-center gap-2">
                      {customer.name}
                      {idx === 0 && <Crown size={16} className="text-brand-400" />}
                    </p>
                    <p className="text-xs text-surface-400 mt-1">
                      {customer.total_orders || customer.order_count || 0} orders
                    </p>
                  </div>
                  <p className="font-bold text-brand-400">{formatCurrency(customer.total_spent)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-surface-500">No customer data</div>
          )}
        </div>
      )}

      {/* Modals */}
      <TierChangeModal
        isOpen={showTierModal}
        currentTier={data?.bakery.tier || ''}
        onClose={() => setShowTierModal(false)}
        onSubmit={handleChangeTier}
        loading={submitting}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        clientName={data?.user.name || ''}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        loading={submitting}
      />
    </div>
  );
}
