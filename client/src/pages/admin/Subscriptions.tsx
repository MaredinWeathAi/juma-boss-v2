'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  RotateCcw,
  ChevronDown,
  AlertTriangle,
  Search,
  Zap,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import api from '../../lib/api';
import { formatBRL } from '../../lib/utils';

interface Subscription {
  id: string;
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'cancelled' | 'trialing';
  monthly_price: number;
  started_at: string;
  current_period_end: string;
  bakery_name: string;
  owner_name: string;
  owner_email: string;
}

interface SubscriptionsData {
  subscriptions: Subscription[];
  summary: {
    total_active: number;
    total_trialing: number;
    total_past_due: number;
    total_cancelled: number;
    total_mrr: number;
  };
}

interface DiscountModalState {
  isOpen: boolean;
  subscriptionId: string | null;
  discountAmount: number;
  discountReason: string;
}

const tierConfig = {
  free: { label: 'Gratuito', price: 0 },
  starter: { label: 'Iniciante', price: 298 },
  pro: { label: 'Profissional', price: 798 },
  enterprise: { label: 'Empresarial', price: 1998 },
};

const statusConfig = {
  active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Active' },
  past_due: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Past Due' },
  cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancelled' },
  trialing: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Trialing' },
};

const TierPricingCard = ({
  tier,
  count,
  loading,
}: {
  tier: keyof typeof tierConfig;
  count: number;
  loading?: boolean;
}) => {
  const config = tierConfig[tier];

  if (loading) {
    return (
      <div className="card">
        <div className="h-6 w-24 bg-surface-800 rounded mb-4 animate-pulse" />
        <div className="h-10 w-20 bg-surface-800 rounded mb-4 animate-pulse" />
        <div className="h-4 w-16 bg-surface-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="card hover:shadow-lg transition-shadow duration-300">
      <h3 className="font-bold text-lg text-white mb-2">{config.label}</h3>
      <div className="text-3xl font-bold text-brand-400 mb-2">
        R$ {config.price.toLocaleString('pt-BR')}
        <span className="text-sm text-surface-400 font-normal">/mês</span>
      </div>
      <p className="text-sm text-surface-400">
        <span className="text-lg font-bold text-white">{count}</span> subscriber{count !== 1 ? 's' : ''}
      </p>
    </div>
  );
};

const StatusBadge = ({
  status,
}: {
  status: 'active' | 'past_due' | 'cancelled' | 'trialing';
}) => {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
};

const TierBadge = ({ tier }: { tier: keyof typeof tierConfig }) => {
  const config = tierConfig[tier];
  const tierColors = {
    free: 'bg-surface-700 text-surface-300',
    starter: 'bg-blue-500/20 text-blue-400',
    pro: 'bg-brand-500/20 text-brand-400',
    enterprise: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${tierColors[tier]}`}
    >
      {config.label}
    </span>
  );
};

const DiscountModal = ({
  isOpen,
  subscriptionId,
  onClose,
  onSubmit,
  loading,
}: {
  isOpen: boolean;
  subscriptionId: string | null;
  onClose: () => void;
  onSubmit: (subscriptionId: string, amount: number, reason: string) => Promise<void>;
  loading: boolean;
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!subscriptionId) return;
    if (amount <= 0) {
      setError('Discount amount must be greater than 0');
      return;
    }
    try {
      await onSubmit(subscriptionId, amount, reason);
      setAmount(0);
      setReason('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply discount');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-900 rounded-xl border border-surface-800 w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <h2 className="text-lg font-bold text-white">Apply Discount</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-surface-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Discount Amount (R$)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="input w-full"
              placeholder="100.00"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input w-full resize-none"
              rows={3}
              placeholder="e.g., Service issue, customer loyalty..."
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary flex-1"
              disabled={loading || amount <= 0}
            >
              {loading ? 'Applying...' : 'Apply Discount'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Subscriptions() {
  const [data, setData] = useState<SubscriptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | Subscription['status']>('all');
  const [filterTier, setFilterTier] = useState<'all' | Subscription['tier']>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTier, setNewTier] = useState<keyof typeof tierConfig | null>(null);
  const [discountModal, setDiscountModal] = useState<DiscountModalState>({
    isOpen: false,
    subscriptionId: null,
    discountAmount: 0,
    discountReason: '',
  });

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/admin/subscriptions');
        setData(response);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load subscriptions'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  const handleTierChange = async (subscriptionId: string, newTierValue: keyof typeof tierConfig) => {
    try {
      await api.put(`/admin/subscriptions/${subscriptionId}`, {
        tier: newTierValue,
      });
      if (data) {
        setData({
          ...data,
          subscriptions: data.subscriptions.map((sub) =>
            sub.id === subscriptionId ? { ...sub, tier: newTierValue } : sub
          ),
        });
      }
      setEditingId(null);
      setNewTier(null);
    } catch (err) {
      console.error('Failed to update tier:', err);
    }
  };

  const handleApplyDiscount = async (subscriptionId: string, amount: number, reason: string) => {
    try {
      await api.post(`/admin/subscriptions/${subscriptionId}/discount`, {
        amount,
        reason,
      });
      if (data) {
        setData({
          ...data,
          subscriptions: data.subscriptions,
        });
      }
      setDiscountModal({ isOpen: false, subscriptionId: null, discountAmount: 0, discountReason: '' });
    } catch (err) {
      console.error('Failed to apply discount:', err);
      throw err;
    }
  };

  if (error && !data) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-subtitle">Manage subscription plans and billing</p>
        </div>
        <div className="card flex flex-col items-center justify-center py-16">
          <div className="text-surface-400 mb-4">
            <DollarSign size={48} className="opacity-50" />
          </div>
          <p className="text-surface-300 font-medium mb-2">Unable to load subscriptions</p>
          <p className="text-surface-500 text-sm mb-6">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors"
          >
            <RotateCcw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const subscriptions = data?.subscriptions || [];
  const summary = data?.summary || {
    total_active: 0,
    total_trialing: 0,
    total_past_due: 0,
    total_cancelled: 0,
    total_mrr: 0,
  };

  // Count by tier
  const tierCounts = {
    free: subscriptions.filter((s) => s.tier === 'free').length,
    starter: subscriptions.filter((s) => s.tier === 'starter').length,
    pro: subscriptions.filter((s) => s.tier === 'pro').length,
    enterprise: subscriptions.filter((s) => s.tier === 'enterprise').length,
  };

  // Filter subscriptions
  let filteredSubscriptions = subscriptions;
  if (filterStatus !== 'all') {
    filteredSubscriptions = filteredSubscriptions.filter((s) => s.status === filterStatus);
  }
  if (filterTier !== 'all') {
    filteredSubscriptions = filteredSubscriptions.filter((s) => s.tier === filterTier);
  }
  if (searchTerm) {
    const lowerSearch = searchTerm.toLowerCase();
    filteredSubscriptions = filteredSubscriptions.filter(
      (s) =>
        s.bakery_name.toLowerCase().includes(lowerSearch) ||
        s.owner_name.toLowerCase().includes(lowerSearch) ||
        s.owner_email.toLowerCase().includes(lowerSearch)
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-subtitle">Manage subscription plans and billing</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="card">
          <p className="text-surface-400 text-xs font-medium mb-1">Total Active</p>
          <p className="text-2xl font-bold text-emerald-400">{summary.total_active}</p>
        </div>
        <div className="card">
          <p className="text-surface-400 text-xs font-medium mb-1">Trials</p>
          <p className="text-2xl font-bold text-blue-400">{summary.total_trialing}</p>
        </div>
        <div className="card">
          <p className="text-surface-400 text-xs font-medium mb-1">Past Due</p>
          <p className="text-2xl font-bold text-yellow-400">{summary.total_past_due}</p>
        </div>
        <div className="card">
          <p className="text-surface-400 text-xs font-medium mb-1">Cancelled</p>
          <p className="text-2xl font-bold text-red-400">{summary.total_cancelled}</p>
        </div>
        <div className="card">
          <p className="text-surface-400 text-xs font-medium mb-1">Total MRR</p>
          <p className="text-2xl font-bold text-brand-400">{formatBRL(summary.total_mrr)}</p>
        </div>
      </div>

      {/* Tier Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TierPricingCard tier="free" count={tierCounts.free} loading={loading} />
        <TierPricingCard tier="starter" count={tierCounts.starter} loading={loading} />
        <TierPricingCard tier="pro" count={tierCounts.pro} loading={loading} />
        <TierPricingCard tier="enterprise" count={tierCounts.enterprise} loading={loading} />
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500" size={18} />
        <input
          type="text"
          placeholder="Search by baker name, bakery, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input w-full pl-12"
        />
      </div>

      {/* Filter Tabs - Status */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-surface-300">By Status</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              filterStatus === 'all'
                ? 'bg-brand-500 text-white'
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              filterStatus === 'active'
                ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/50'
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterStatus('trialing')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              filterStatus === 'trialing'
                ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50'
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            Trialing
          </button>
          <button
            onClick={() => setFilterStatus('past_due')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              filterStatus === 'past_due'
                ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50'
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            Past Due
          </button>
          <button
            onClick={() => setFilterStatus('cancelled')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              filterStatus === 'cancelled'
                ? 'bg-red-500/30 text-red-400 border border-red-500/50'
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Filter Pills - Tier */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-surface-300">By Tier</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterTier('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              filterTier === 'all'
                ? 'bg-brand-500 text-white'
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            All Tiers
          </button>
          <button
            onClick={() => setFilterTier('free')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              filterTier === 'free'
                ? 'bg-surface-700 text-white'
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            Free
          </button>
          <button
            onClick={() => setFilterTier('starter')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              filterTier === 'starter'
                ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50'
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            Starter
          </button>
          <button
            onClick={() => setFilterTier('pro')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              filterTier === 'pro'
                ? 'bg-brand-500/30 text-brand-400 border border-brand-500/50'
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            Pro
          </button>
          <button
            onClick={() => setFilterTier('enterprise')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              filterTier === 'enterprise'
                ? 'bg-purple-500/30 text-purple-400 border border-purple-500/50'
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            Enterprise
          </button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="card">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white">
            {filterStatus === 'all' ? 'All Subscriptions' : `${filterStatus.replace('_', ' ').charAt(0).toUpperCase() + filterStatus.replace('_', ' ').slice(1)} Subscriptions`}
          </h2>
          <p className="text-sm text-surface-400 mt-1">
            {filteredSubscriptions.length} subscription{filteredSubscriptions.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-surface-800 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredSubscriptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left py-3 px-3 text-surface-400 font-medium">Baker</th>
                  <th className="text-left py-3 px-3 text-surface-400 font-medium">Bakery</th>
                  <th className="text-left py-3 px-3 text-surface-400 font-medium">Tier</th>
                  <th className="text-left py-3 px-3 text-surface-400 font-medium">Monthly Price</th>
                  <th className="text-left py-3 px-3 text-surface-400 font-medium">Status</th>
                  <th className="text-left py-3 px-3 text-surface-400 font-medium">Started</th>
                  <th className="text-left py-3 px-3 text-surface-400 font-medium">Next Billing</th>
                  <th className="text-left py-3 px-3 text-surface-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                    <td className="py-3 px-3 text-white">{sub.owner_name}</td>
                    <td className="py-3 px-3 text-surface-300">{sub.bakery_name}</td>
                    <td className="py-3 px-3">
                      {editingId === sub.id ? (
                        <div className="relative inline-block">
                          <select
                            value={newTier || sub.tier}
                            onChange={(e) => setNewTier(e.target.value as keyof typeof tierConfig)}
                            onBlur={() => {
                              if (newTier && newTier !== sub.tier) {
                                handleTierChange(sub.id, newTier);
                              } else {
                                setEditingId(null);
                              }
                            }}
                            autoFocus
                            className="appearance-none bg-surface-700 border border-surface-600 rounded px-3 py-1 text-white text-xs pr-6 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            <option value="free">Free</option>
                            <option value="starter">Starter</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-2 top-1.5 text-surface-400 pointer-events-none" />
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingId(sub.id)}
                          className="hover:opacity-80 transition-opacity"
                        >
                          <TierBadge tier={sub.tier} />
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-3 text-left text-white font-medium">
                      {formatBRL(sub.monthly_price)}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="py-3 px-3 text-surface-400 text-xs">
                      {formatDate(sub.started_at)}
                    </td>
                    <td className="py-3 px-3 text-surface-400 text-xs">
                      {formatDate(sub.current_period_end)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDiscountModal({ ...discountModal, isOpen: true, subscriptionId: sub.id })}
                          className="p-1.5 hover:bg-surface-800 rounded-lg transition-colors text-surface-400 hover:text-yellow-400"
                          title="Apply discount"
                        >
                          <Zap size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-48 bg-surface-800/30 rounded-lg flex items-center justify-center text-surface-500">
            No subscriptions found
          </div>
        )}
      </div>

      {/* Discount Modal */}
      <DiscountModal
        isOpen={discountModal.isOpen}
        subscriptionId={discountModal.subscriptionId}
        onClose={() => setDiscountModal({ ...discountModal, isOpen: false, subscriptionId: null })}
        onSubmit={handleApplyDiscount}
        loading={loading}
      />
    </div>
  );
}
