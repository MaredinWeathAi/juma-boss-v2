'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import api from '../../lib/api';

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
}

const tierConfig = {
  free: { label: 'Free', price: 0 },
  starter: { label: 'Starter', price: 29 },
  pro: { label: 'Pro', price: 79 },
  enterprise: { label: 'Enterprise', price: 199 },
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
        ${config.price}
        <span className="text-sm text-surface-400 font-normal">/mo</span>
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

export default function Subscriptions() {
  const [data, setData] = useState<SubscriptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | Subscription['status']>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTier, setNewTier] = useState<keyof typeof tierConfig | null>(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/admin/subscriptions');
        setData(response.data);
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

  // Calculate MRR
  const mrr = subscriptions
    .filter((s) => s.status === 'active' || s.status === 'trialing')
    .reduce((sum, s) => sum + s.monthly_price, 0);

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
    filteredSubscriptions = subscriptions.filter((s) => s.status === filterStatus);
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
      {/* Header with MRR */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="page-subtitle">Manage subscription plans and billing</p>
        </div>
        <div className="card sm:w-auto">
          <p className="text-surface-400 text-sm mb-1">Monthly Recurring Revenue</p>
          <p className="text-3xl font-bold text-brand-400">
            ${mrr.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Tier Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TierPricingCard tier="free" count={tierCounts.free} loading={loading} />
        <TierPricingCard tier="starter" count={tierCounts.starter} loading={loading} />
        <TierPricingCard tier="pro" count={tierCounts.pro} loading={loading} />
        <TierPricingCard tier="enterprise" count={tierCounts.enterprise} loading={loading} />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterStatus === 'all'
              ? 'bg-brand-500 text-white'
              : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterStatus === 'active'
              ? 'bg-brand-500 text-white'
              : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilterStatus('past_due')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterStatus === 'past_due'
              ? 'bg-brand-500 text-white'
              : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
          }`}
        >
          Past Due
        </button>
        <button
          onClick={() => setFilterStatus('cancelled')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterStatus === 'cancelled'
              ? 'bg-brand-500 text-white'
              : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
          }`}
        >
          Cancelled
        </button>
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
                  <th className="text-right py-3 px-3 text-surface-400 font-medium">Price</th>
                  <th className="text-left py-3 px-3 text-surface-400 font-medium">Status</th>
                  <th className="text-left py-3 px-3 text-surface-400 font-medium">Started</th>
                  <th className="text-left py-3 px-3 text-surface-400 font-medium">Period End</th>
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
                    <td className="py-3 px-3 text-right text-white font-medium">
                      ${tierConfig[sub.tier].price}
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
    </div>
  );
}
