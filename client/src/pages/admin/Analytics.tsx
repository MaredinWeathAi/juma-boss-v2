'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  ShoppingCart,
  Users,
  RotateCcw,
} from 'lucide-react';
import api from '../../lib/api';

interface AnalyticsData {
  dailyOrders: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
  topBakers: Array<{
    name: string;
    bakery_name: string;
    revenue: number;
    order_count: number;
  }>;
  topProducts: Array<{
    name: string;
    bakery_name: string;
    revenue: number;
    quantity: number;
  }>;
  customerGrowth: Array<{
    month: string;
    new_customers: number;
    total_customers: number;
  }>;
  churnRate: number;
  retentionByMonth: Array<{
    month: string;
    retained: number;
    churned: number;
  }>;
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <div className="card">
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
    <div className="card hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-surface-400 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
        </div>
        <div className="p-3 bg-brand-500/10 rounded-lg text-brand-400">
          {Icon}
        </div>
      </div>
    </div>
  );
};

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/admin/analytics');
        setData(response);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load analytics'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
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
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Platform-wide metrics and insights</p>
        </div>
        <div className="card flex flex-col items-center justify-center py-16">
          <div className="text-surface-400 mb-4">
            <TrendingUp size={48} className="opacity-50" />
          </div>
          <p className="text-surface-300 font-medium mb-2">Unable to load analytics</p>
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

  const last30Days = data?.dailyOrders?.slice(-30) || [];
  const churnRateDisplay = (data?.churnRate || 0).toFixed(2);
  const totalCustomers = data?.customerGrowth?.[data.customerGrowth.length - 1]?.total_customers || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Platform-wide metrics and insights</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Customers"
          value={totalCustomers}
          icon={<Users size={24} />}
          loading={loading}
        />
        <StatCard
          label="Churn Rate"
          value={`${churnRateDisplay}%`}
          icon={<TrendingUp size={24} />}
          loading={loading}
        />
        <StatCard
          label="Total Products"
          value={data?.topProducts?.length || 0}
          icon={<ShoppingCart size={24} />}
          loading={loading}
        />
        <StatCard
          label="Total Bakers"
          value={data?.topBakers?.length || 0}
          icon={<Users size={24} />}
          loading={loading}
        />
      </div>

      {/* Daily Orders Chart */}
      <div className="card">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white">Daily Orders (Last 30 Days)</h2>
          <p className="text-sm text-surface-400 mt-1">Order volume and revenue trend</p>
        </div>

        {loading ? (
          <div className="h-80 bg-surface-800 rounded-lg flex items-center justify-center">
            <div className="text-surface-500">Loading chart...</div>
          </div>
        ) : last30Days.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={last30Days}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255, 255, 255, 0.1)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="rgba(255, 255, 255, 0.3)"
                style={{ fontSize: '0.875rem' }}
              />
              <YAxis
                stroke="rgba(255, 255, 255, 0.3)"
                style={{ fontSize: '0.875rem' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(23, 23, 23, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Bar dataKey="count" fill="#f59e0b" name="Orders" />
              <Bar dataKey="revenue" fill="#60a5fa" name="Revenue ($)" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 bg-surface-800 rounded-lg flex items-center justify-center text-surface-500">
            No data available
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Growth Chart */}
        <div className="card">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Customer Growth</h2>
            <p className="text-sm text-surface-400 mt-1">New vs total customers by month</p>
          </div>

          {loading ? (
            <div className="h-80 bg-surface-800 rounded-lg flex items-center justify-center">
              <div className="text-surface-500">Loading chart...</div>
            </div>
          ) : (data?.customerGrowth || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.customerGrowth || []}>
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
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(23, 23, 23, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="new_customers"
                  stroke="#f59e0b"
                  name="New Customers"
                  isAnimationActive={true}
                />
                <Line
                  type="monotone"
                  dataKey="total_customers"
                  stroke="#60a5fa"
                  name="Total Customers"
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 bg-surface-800 rounded-lg flex items-center justify-center text-surface-500">
              No data available
            </div>
          )}
        </div>

        {/* Retention by Month Chart */}
        <div className="card">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Retention by Month</h2>
            <p className="text-sm text-surface-400 mt-1">Retained vs churned customers</p>
          </div>

          {loading ? (
            <div className="h-80 bg-surface-800 rounded-lg flex items-center justify-center">
              <div className="text-surface-500">Loading chart...</div>
            </div>
          ) : (data?.retentionByMonth || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.retentionByMonth || []}>
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
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(23, 23, 23, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Legend />
                <Bar dataKey="retained" fill="#10b981" name="Retained" />
                <Bar dataKey="churned" fill="#ef4444" name="Churned" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 bg-surface-800 rounded-lg flex items-center justify-center text-surface-500">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Bakers */}
        <div className="card">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Top Bakers</h2>
            <p className="text-sm text-surface-400 mt-1">By revenue</p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-surface-800 rounded animate-pulse" />
              ))}
            </div>
          ) : (data?.topBakers || []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-3 px-3 text-surface-400 font-medium">Rank</th>
                    <th className="text-left py-3 px-3 text-surface-400 font-medium">Baker</th>
                    <th className="text-left py-3 px-3 text-surface-400 font-medium">Bakery</th>
                    <th className="text-right py-3 px-3 text-surface-400 font-medium">Revenue</th>
                    <th className="text-right py-3 px-3 text-surface-400 font-medium">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topBakers || []).map((baker, idx) => (
                    <tr key={idx} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                      <td className="py-3 px-3 text-white font-bold">#{idx + 1}</td>
                      <td className="py-3 px-3 text-white">{baker.name}</td>
                      <td className="py-3 px-3 text-surface-300">{baker.bakery_name}</td>
                      <td className="py-3 px-3 text-right text-brand-400 font-medium">${baker.revenue.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-surface-300">{baker.order_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-48 bg-surface-800/30 rounded-lg flex items-center justify-center text-surface-500">
              No data available
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Top Products</h2>
            <p className="text-sm text-surface-400 mt-1">By revenue</p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-surface-800 rounded animate-pulse" />
              ))}
            </div>
          ) : (data?.topProducts || []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-3 px-3 text-surface-400 font-medium">Rank</th>
                    <th className="text-left py-3 px-3 text-surface-400 font-medium">Product</th>
                    <th className="text-left py-3 px-3 text-surface-400 font-medium">Bakery</th>
                    <th className="text-right py-3 px-3 text-surface-400 font-medium">Revenue</th>
                    <th className="text-right py-3 px-3 text-surface-400 font-medium">Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topProducts || []).map((product, idx) => (
                    <tr key={idx} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                      <td className="py-3 px-3 text-white font-bold">#{idx + 1}</td>
                      <td className="py-3 px-3 text-white">{product.name}</td>
                      <td className="py-3 px-3 text-surface-300">{product.bakery_name}</td>
                      <td className="py-3 px-3 text-right text-brand-400 font-medium">${product.revenue.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-surface-300">{product.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-48 bg-surface-800/30 rounded-lg flex items-center justify-center text-surface-500">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
