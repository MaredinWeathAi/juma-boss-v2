'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  ShoppingCart,
  UserCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  RotateCcw,
  AlertTriangle,
  Calendar,
  FileDown,
  Zap,
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
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatBRL } from '../../lib/utils';

interface DashboardData {
  totalBakers: number;
  activeBakers: number;
  newBakersThisMonth: number;
  mrr: number;
  arr: number;
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  tierBreakdown: Array<{
    tier: 'free' | 'starter' | 'pro' | 'enterprise';
    count: number;
    revenue: number;
  }>;
  recentActivity: Array<{
    id: string;
    order_number: string;
    total: number;
    status: 'pending' | 'confirmed' | 'production' | 'ready' | 'delivered' | 'cancelled';
    created_at: string;
    customer_name: string;
    bakery_name: string;
  }>;
  growthData: Array<{
    month: string;
    bakers: number;
    orders: number;
    revenue: number;
  }>;
}

interface SubscriptionOverviewData {
  active: number;
  trialing: number;
  past_due: number;
  cancelled: number;
  failedPayments: number;
  upcomingRenewals: Array<{
    id: string;
    bakery_name: string;
    owner_name: string;
    tier: string;
    current_period_end: string;
    monthly_price: number;
  }>;
}

const KPICard = ({
  icon: Icon,
  label,
  value,
  subValue,
  subLabel,
  trend,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string | number;
  subLabel?: string;
  trend?: number;
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <div className="card animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 w-24 bg-surface-800 rounded mb-2 animate-pulse" />
            <div className="h-8 w-32 bg-surface-800 rounded animate-pulse" />
          </div>
          <div className="p-3 bg-surface-800 rounded-lg animate-pulse">
            <div className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-surface-400 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          {subValue && (
            <p className="text-xs text-surface-400 mt-1">
              {subValue} {subLabel}
            </p>
          )}
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend >= 0 ? (
                <ArrowUpRight size={14} className="text-emerald-400" />
              ) : (
                <ArrowDownRight size={14} className="text-red-400" />
              )}
              <span
                className={`text-xs font-medium ${
                  trend >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {Math.abs(trend)}% vs last month
              </span>
            </div>
          )}
        </div>
        <div className="p-3 bg-brand-500/10 rounded-lg text-brand-400">
          {Icon}
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({
  status,
}: {
  status: 'pending' | 'confirmed' | 'production' | 'ready' | 'delivered' | 'cancelled';
}) => {
  const statusConfig = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pending' },
    confirmed: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Confirmed' },
    production: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'In Production' },
    ready: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Ready' },
    delivered: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Delivered' },
    cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancelled' },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const RelativeTime = ({ dateString }: { dateString: string }) => {
  const [relativeTime, setRelativeTime] = useState('');

  useEffect(() => {
    const getRelativeTime = () => {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (seconds < 60) {
        return 'just now';
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
      } else if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
      } else {
        const days = Math.floor(seconds / 86400);
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
      }
    };

    setRelativeTime(getRelativeTime());

    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime());
    }, 30000);

    return () => clearInterval(interval);
  }, [dateString]);

  return (
    <div className="flex items-center gap-1 text-surface-400">
      <Clock size={14} />
      <span className="text-xs">{relativeTime}</span>
    </div>
  );
};

const TierBar = ({
  tier,
  count,
  revenue,
  percentage,
}: {
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  count: number;
  revenue: number;
  percentage: number;
}) => {
  const tierConfig = {
    free: { color: 'bg-surface-600', label: 'Free', accent: 'surface' },
    starter: { color: 'bg-blue-500', label: 'Starter', accent: 'blue' },
    pro: { color: 'bg-amber-500', label: 'Pro', accent: 'amber' },
    enterprise: { color: 'bg-purple-500', label: 'Enterprise', accent: 'purple' },
  };

  const config = tierConfig[tier];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-surface-300 capitalize">{config.label}</span>
        <span className="text-xs text-surface-400">{count} bakers</span>
      </div>
      <div className="w-full bg-surface-800 rounded-full h-2">
        <div className={`h-full ${config.color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-surface-500">${revenue.toLocaleString()} revenue</span>
        <span className="text-xs text-surface-400">{percentage}%</span>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [subData, setSubData] = useState<SubscriptionOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [dashResponse, subResponse] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/subscriptions/overview'),
        ]);
        setData(dashResponse);
        setSubData(subResponse);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load dashboard data'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  if (error && !data) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.name || 'Admin'}
          </p>
        </div>
        <div className="card flex flex-col items-center justify-center py-16">
          <div className="text-surface-400 mb-4">
            <ShoppingCart size={48} className="opacity-50" />
          </div>
          <p className="text-surface-300 font-medium mb-2">Unable to load dashboard</p>
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

  const totalBakersValue = data?.totalBakers || 0;
  const activeBakersValue = data?.activeBakers || 0;
  const mrrValue = data?.mrr || 0;
  const arrValue = data?.arr || 0;
  const totalOrdersValue = data?.totalOrders || 0;
  const totalCustomersValue = data?.totalCustomers || 0;
  const newBakersValue = data?.newBakersThisMonth || 0;

  const ordersFromActivity = data?.recentActivity?.length || 0;
  const avgOrderValue =
    ordersFromActivity > 0
      ? (data?.totalRevenue || 0) / (data?.totalOrders || 1)
      : 0;

  const tierTotal = data?.tierBreakdown?.reduce((sum, t) => sum + t.count, 0) || 1;
  const revenueTotal =
    data?.tierBreakdown?.reduce((sum, t) => sum + t.revenue, 0) || 1;

  const formatCurrency = (value: number) => formatBRL(value);

  const formatNumber = (value: number) => {
    return value.toLocaleString('en-US');
  };

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.name || 'Admin'}
          </p>
        </div>
        <div className="text-sm text-surface-400">
          {currentDate.toLocaleDateString('en-US', dateOptions)}
        </div>
      </div>

      {/* Failed Payments Alert */}
      {subData && subData.failedPayments > 0 && (
        <div className="flex gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg animate-fade-in">
          <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-white font-semibold mb-1">Failed Payments Alert</p>
            <p className="text-sm text-yellow-200">
              You have {subData.failedPayments} failed payment{subData.failedPayments !== 1 ? 's' : ''} that need attention.
            </p>
          </div>
          <button className="text-sm text-yellow-400 hover:text-yellow-300 whitespace-nowrap font-medium">
            View
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          icon={<Users size={24} />}
          label="Total Bakers"
          value={formatNumber(totalBakersValue)}
          subValue={`${activeBakersValue} active`}
          subLabel="bakers"
          loading={loading}
        />
        <KPICard
          icon={<DollarSign size={24} />}
          label="Monthly Recurring Revenue"
          value={formatCurrency(mrrValue)}
          subValue={formatCurrency(arrValue)}
          subLabel="ARR"
          loading={loading}
        />
        <KPICard
          icon={<ShoppingCart size={24} />}
          label="Total Orders"
          value={formatNumber(totalOrdersValue)}
          trend={12}
          loading={loading}
        />
        <KPICard
          icon={<UserCheck size={24} />}
          label="Total Customers"
          value={formatNumber(totalCustomersValue)}
          trend={8}
          loading={loading}
        />
      </div>

      {/* Subscription Health */}
      {subData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-surface-400 text-sm font-medium mb-2">Active Subscriptions</p>
            <p className="text-3xl font-bold text-emerald-400">{subData.active}</p>
          </div>
          <div className="card">
            <p className="text-surface-400 text-sm font-medium mb-2">Trials</p>
            <p className="text-3xl font-bold text-blue-400">{subData.trialing}</p>
          </div>
          <div className="card">
            <p className="text-surface-400 text-sm font-medium mb-2">Past Due</p>
            <p className="text-3xl font-bold text-yellow-400">{subData.past_due}</p>
          </div>
          <div className="card">
            <p className="text-surface-400 text-sm font-medium mb-2">Cancelled</p>
            <p className="text-3xl font-bold text-red-400">{subData.cancelled}</p>
          </div>
        </div>
      )}

      {/* Revenue by Plan Tier */}
      {data && data.tierBreakdown && (
        <div className="card animate-fade-in">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Revenue by Plan Tier</h2>
            <p className="text-sm text-surface-400 mt-1">
              Distribution of revenue across tiers
            </p>
          </div>

          {data.tierBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.tierBreakdown.map(t => ({ name: t.tier.charAt(0).toUpperCase() + t.tier.slice(1), value: t.revenue || 1 }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#f59e0b" />
                  <Cell fill="#3b82f6" />
                  <Cell fill="#8b5cf6" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(23, 23, 23, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ color: '#f3f4f6' }}
                  formatter={(value) => [formatBRL(typeof value === 'number' ? value : 0), 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 bg-surface-800 rounded-lg flex items-center justify-center text-surface-500">
              No tier data available
            </div>
          )}
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="card lg:col-span-2 animate-fade-in">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Revenue & Growth</h2>
            <p className="text-sm text-surface-400 mt-1">
              Historical revenue and baker growth
            </p>
          </div>

          {loading ? (
            <div className="h-80 bg-surface-800 rounded-lg flex items-center justify-center">
              <div className="text-surface-500">Loading chart...</div>
            </div>
          ) : data?.growthData && data.growthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={data.growthData}>
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
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f59e0b"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 bg-surface-800 rounded-lg flex items-center justify-center text-surface-500">
              No growth data available
            </div>
          )}
        </div>

        {/* Tier Distribution */}
        <div className="card animate-fade-in">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Tier Distribution</h2>
            <p className="text-sm text-surface-400 mt-1">
              Baker breakdown by subscription tier
            </p>
          </div>

          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 bg-surface-800 rounded animate-pulse" />
                  <div className="h-2 w-full bg-surface-800 rounded-full animate-pulse" />
                  <div className="h-3 w-24 bg-surface-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : data?.tierBreakdown && data.tierBreakdown.length > 0 ? (
            <div className="space-y-6">
              {data.tierBreakdown.map((tier) => (
                <TierBar
                  key={tier.tier}
                  tier={tier.tier}
                  count={tier.count}
                  revenue={tier.revenue}
                  percentage={Math.round((tier.count / tierTotal) * 100)}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-surface-500">
              No tier data available
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Renewals & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Renewals */}
        <div className="card animate-fade-in">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar size={20} />
              Next 7 Days
            </h2>
            <p className="text-sm text-surface-400 mt-1">Upcoming renewals</p>
          </div>

          {subData && subData.upcomingRenewals && subData.upcomingRenewals.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {subData.upcomingRenewals.map((renewal) => (
                <div key={renewal.id} className="p-3 bg-surface-800/50 rounded-lg border border-surface-700">
                  <p className="text-sm font-semibold text-white">{renewal.bakery_name}</p>
                  <p className="text-xs text-surface-400 mt-1">{renewal.owner_name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-1 rounded capitalize">
                      {renewal.tier}
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {formatBRL(renewal.monthly_price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-surface-500 text-sm">
              No renewals in next 7 days
            </div>
          )}
        </div>

        {/* Quick Actions & Stats */}
        <div className="card animate-fade-in">
          <h2 className="text-lg font-bold text-white mb-6">Quick Stats</h2>
          <div className="space-y-6">
            <div className="pb-6 border-b border-surface-800">
              <p className="text-surface-400 text-sm mb-2">New Bakers This Month</p>
              <p className="text-3xl font-bold text-brand-400">
                {formatNumber(newBakersValue)}
              </p>
            </div>
            <div className="pb-6 border-b border-surface-800">
              <p className="text-surface-400 text-sm mb-2">Recent Orders Count</p>
              <p className="text-3xl font-bold text-blue-400">
                {formatNumber(ordersFromActivity)}
              </p>
            </div>
            <div>
              <p className="text-surface-400 text-sm mb-2">Average Order Value</p>
              <p className="text-3xl font-bold text-emerald-400">
                {formatCurrency(avgOrderValue)}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card lg:col-span-3 animate-fade-in">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Recent Activity</h2>
            <p className="text-sm text-surface-400 mt-1">
              Last {Math.min(10, data?.recentActivity?.length || 0)} orders
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between pb-4 border-b border-surface-800">
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-surface-800 rounded mb-2 animate-pulse" />
                    <div className="h-3 w-48 bg-surface-800 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-20 bg-surface-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : data?.recentActivity && data.recentActivity.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {data.recentActivity.slice(0, 10).map((activity, index) => (
                <div
                  key={activity.id}
                  className={`pb-4 flex flex-col gap-3 ${
                    index < data.recentActivity.length - 1
                      ? 'border-b border-surface-800'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-semibold text-white truncate">
                          {activity.order_number}
                        </p>
                        <StatusBadge status={activity.status} />
                      </div>
                      <p className="text-xs text-surface-400 truncate">
                        {activity.customer_name} from {activity.bakery_name}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-white whitespace-nowrap">
                      {formatCurrency(activity.total)}
                    </p>
                  </div>
                  <RelativeTime dateString={activity.created_at} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-surface-500">
              No recent activity
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
