'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  Download,
  AlertTriangle,
  DollarSign,
  RotateCcw,
} from 'lucide-react';
import api from '../../lib/api';
import { formatBRL } from '../../lib/utils';

interface FinancialData {
  mrrHistory: Array<{
    month: string;
    new: number;
    expansion: number;
    contraction: number;
    churn: number;
    total: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
  churnTrend: Array<{
    month: string;
    rate: number;
  }>;
  ltvByTier: Array<{
    tier: string;
    ltv: number;
    avgDuration: number;
    avgMonthlyPrice: number;
  }>;
  failedPayments: Array<{
    id: string;
    bakery_name: string;
    owner_name: string;
    amount: number;
    attempt_date: string;
    retry_status: 'pending' | 'retried' | 'failed';
  }>;
}

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

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
}) => (
  <div className="card">
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

export default function FinancialReports() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/admin/financial-reports');
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load financial data');
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  const handleExport = async (reportType: string) => {
    try {
      await api.post(`/admin/financial-reports/export`, { type: reportType });
      alert(`${reportType} report exported successfully`);
    } catch (err) {
      alert(`Failed to export ${reportType} report`);
    }
  };

  if (error && !data) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Financial Reports</h1>
          <p className="page-subtitle">Detailed financial analysis and metrics</p>
        </div>
        <div className="card flex flex-col items-center justify-center py-16">
          <div className="text-surface-400 mb-4">
            <DollarSign size={48} className="opacity-50" />
          </div>
          <p className="text-surface-300 font-medium mb-2">Unable to load financial data</p>
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

  const totalMRR = (data as any)?.currentMRR ?? (data?.mrrHistory[data.mrrHistory.length - 1]?.total || 0);
  const currentChurn = (data as any)?.monthlyChurnRate ?? (data?.churnTrend[data.churnTrend.length - 1]?.rate || 0);
  const avgLTV = data?.ltvByTier
    ? data.ltvByTier.reduce((sum, t) => sum + t.ltv, 0) / data.ltvByTier.length
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Financial Reports</h1>
          <p className="page-subtitle">Detailed financial analysis and metrics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('revenue')}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <Download size={16} />
            Export MRR Report
          </button>
          <button
            onClick={() => handleExport('churn')}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <Download size={16} />
            Export Churn Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={<DollarSign size={24} />}
            label="Current MRR"
            value={formatBRL(totalMRR)}
            loading={loading}
          />
          <StatCard
            icon={<TrendingUp size={24} />}
            label="Monthly Churn Rate"
            value={`${currentChurn.toFixed(1)}%`}
            loading={loading}
          />
          <StatCard
            icon={<DollarSign size={24} />}
            label="Average LTV"
            value={formatBRL(avgLTV)}
            loading={loading}
          />
        </div>
      )}

      {/* MRR Waterfall Chart */}
      {data && data.mrrHistory.length > 0 && (
        <div className="card">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">MRR Waterfall (Last 12 Months)</h2>
            <p className="text-sm text-surface-400 mt-1">
              Revenue recognition: new, expansion, contraction, and churn
            </p>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={data.mrrHistory}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
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
                formatter={(value) => [formatBRL(typeof value === 'number' ? value : 0)]}
              />
              <Legend />
              <Bar dataKey="new" stackId="a" fill="#10b981" name="New" />
              <Bar dataKey="expansion" stackId="a" fill="#3b82f6" name="Expansion" />
              <Bar dataKey="contraction" stackId="a" fill="#f59e0b" name="Contraction" />
              <Bar dataKey="churn" stackId="a" fill="#ef4444" name="Churn" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Payment Methods & Churn Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Breakdown */}
        {data && data.paymentMethods.length > 0 && (
          <div className="card">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">Payment Methods</h2>
              <p className="text-sm text-surface-400 mt-1">Distribution of payment methods</p>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.paymentMethods}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${(percentage * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.paymentMethods.map((entry, index) => (
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

            <div className="mt-6 space-y-2">
              {data.paymentMethods.map((method) => (
                <div key={method.method} className="flex items-center justify-between text-sm">
                  <span className="text-surface-400">{method.method}</span>
                  <span className="text-white font-medium">
                    {method.count} ({method.percentage.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Churn Rate Trend */}
        {data && data.churnTrend.length > 0 && (
          <div className="card">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">Churn Rate Trend</h2>
              <p className="text-sm text-surface-400 mt-1">Monthly churn rate over time</p>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.churnTrend}>
                <defs>
                  <linearGradient id="colorChurn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01} />
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
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(23, 23, 23, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ color: '#f3f4f6' }}
                  formatter={(value) => [`${(typeof value === 'number' ? value : 0).toFixed(2)}%`, 'Churn Rate']}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#ef4444"
                  fillOpacity={1}
                  fill="url(#colorChurn)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* LTV by Tier */}
      {data && data.ltvByTier.length > 0 && (
        <div className="card">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Lifetime Value by Tier</h2>
            <p className="text-sm text-surface-400 mt-1">
              LTV = Average Subscription Duration (months) × Average Monthly Price
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.ltvByTier.map((tier) => (
              <div key={tier.tier} className="border border-surface-800 rounded-lg p-4">
                <p className="text-surface-400 text-sm font-medium mb-3 capitalize">{tier.tier}</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-surface-500 mb-1">LTV</p>
                    <p className="text-lg font-bold text-brand-400">{formatBRL(tier.ltv)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 mb-1">Avg Duration</p>
                    <p className="text-sm text-white">{tier.avgDuration.toFixed(1)} months</p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-500 mb-1">Avg Monthly Price</p>
                    <p className="text-sm text-white">{formatBRL(tier.avgMonthlyPrice)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed Payments Tracker */}
      {data && data.failedPayments.length > 0 && (
        <div className="card">
          <div className="mb-6 flex items-center gap-2">
            <AlertTriangle size={20} className="text-yellow-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Failed Payments</h2>
              <p className="text-sm text-surface-400 mt-1">
                {data.failedPayments.length} failed payment{data.failedPayments.length !== 1 ? 's' : ''} requiring attention
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left py-3 px-3 text-surface-400 font-medium">Bakery</th>
                  <th className="text-left py-3 px-3 text-surface-400 font-medium">Owner</th>
                  <th className="text-right py-3 px-3 text-surface-400 font-medium">Amount</th>
                  <th className="text-left py-3 px-3 text-surface-400 font-medium">Attempt Date</th>
                  <th className="text-left py-3 px-3 text-surface-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.failedPayments.map((payment, idx) => (
                  <tr
                    key={payment.id}
                    className={`border-b border-surface-800 hover:bg-surface-800/30 transition-colors ${
                      idx === data.failedPayments.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="py-3 px-3 text-white font-medium">{payment.bakery_name}</td>
                    <td className="py-3 px-3 text-surface-300">{payment.owner_name}</td>
                    <td className="py-3 px-3 text-white font-medium text-right">
                      {formatBRL(payment.amount)}
                    </td>
                    <td className="py-3 px-3 text-surface-400">
                      {new Date(payment.attempt_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          payment.retry_status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : payment.retry_status === 'retried'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {payment.retry_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Failed Payments Message */}
      {data && data.failedPayments.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-12 text-center">
          <div className="text-emerald-400 mb-4">
            <TrendingUp size={48} className="opacity-50" />
          </div>
          <p className="text-surface-300 font-medium mb-2">All Payments Healthy</p>
          <p className="text-surface-500 text-sm">No failed payments in the system</p>
        </div>
      )}
    </div>
  );
}
