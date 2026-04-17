'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  DollarSign,
  Package,
  RotateCcw,
  AlertTriangle,
  Award,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  UserCheck,
  CreditCard,
  Clock,
  Zap,
} from 'lucide-react';
import api from '../../lib/api';
import { formatBRL } from '../../lib/utils';

// ── Types ──────────────────────────────────────────
interface BIData {
  platformHealth: {
    totalRevenue: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    revenueGrowth: number;
    totalOrders: number;
    ordersThisMonth: number;
    ordersLastMonth: number;
    ordersGrowth: number;
    avgOrderValue: number;
    avgOrderValueLastMonth: number;
    activeBakers: number;
    totalCustomers: number;
    churnRate: number;
  };
  revenueAnalytics: Array<{
    month: string;
    revenue: number;
    orders: number;
    newBakers: number;
    avgOrderValue: number;
    cumulativeRevenue: number;
    cumulativeOrders: number;
  }>;
  bakerPerformance: {
    topBakers: Array<{
      id: string;
      name: string;
      bakery_name: string;
      tier: string;
      totalOrders: number;
      totalRevenue: number;
      avgOrderValue: number;
      totalCustomers: number;
      totalProducts: number;
      recipeAdoption: number;
    }>;
    bottomBakers: Array<{
      id: string;
      name: string;
      bakery_name: string;
      tier: string;
      totalOrders: number;
      totalRevenue: number;
      avgOrderValue: number;
      totalCustomers: number;
      totalProducts: number;
      recipeAdoption: number;
    }>;
    mostActiveThisMonth: Array<{
      name: string;
      bakery_name: string;
      ordersThisMonth: number;
      revenueThisMonth: number;
    }>;
  };
  cohortAnalysis: Array<{
    cohort: string;
    totalBakers: number;
    activeBakers: number;
    retentionRate: number;
    totalRevenue: number;
    avgRevenuePerBaker: number;
  }>;
  productIntelligence: {
    topProducts: Array<{
      name: string;
      category: string;
      bakery_name: string;
      quantity_sold: number;
      revenue: number;
      avg_price: number;
    }>;
    categoryBreakdown: Array<{
      category: string;
      totalRevenue: number;
      totalQuantity: number;
      productCount: number;
      avgPrice: number;
      avgMargin: number;
    }>;
  };
  customerIntelligence: {
    totalCustomers: number;
    avgCustomersPerBakery: number;
    topCustomers: Array<{
      name: string;
      bakery_name: string;
      total_orders: number;
      total_spent: number;
    }>;
    concentrationPercent: number;
  };
  operationalMetrics: {
    orderStatusDistribution: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    paymentMethodBreakdown: Array<{
      method: string;
      count: number;
      totalAmount: number;
    }>;
    avgDeliveryTimeHours: number;
  };
  tierInsights: Array<{
    tier: string;
    bakerCount: number;
    avgRevenue: number;
    avgOrders: number;
    avgProducts: number;
    avgCustomers: number;
  }>;
}

type TabKey = 'overview' | 'bakers' | 'products' | 'customers' | 'operations' | 'cohorts';

// ── Shared Components ──────────────────────────────
const tooltipStyle = {
  backgroundColor: 'rgba(23, 23, 23, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '0.5rem',
};

const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];

const GrowthBadge = ({ value }: { value: number }) => (
  <div className="flex items-center gap-1">
    {value >= 0 ? (
      <ArrowUpRight size={14} className="text-emerald-400" />
    ) : (
      <ArrowDownRight size={14} className="text-red-400" />
    )}
    <span className={`text-xs font-semibold ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {value >= 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  </div>
);

const KPICard = ({ icon: Icon, label, value, sub, growth }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  growth?: number;
}) => (
  <div className="card hover:shadow-lg transition-shadow duration-300">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-surface-400 text-sm font-medium">{label}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {sub && <p className="text-xs text-surface-500 mt-1">{sub}</p>}
        {growth !== undefined && <div className="mt-1"><GrowthBadge value={growth} /></div>}
      </div>
      <div className="p-3 bg-brand-500/10 rounded-lg text-brand-400">{Icon}</div>
    </div>
  </div>
);

const TierBadge = ({ tier }: { tier: string }) => {
  const cfg: Record<string, string> = {
    free: 'bg-surface-700 text-surface-300',
    starter: 'bg-blue-500/20 text-blue-400',
    pro: 'bg-amber-500/20 text-amber-400',
    enterprise: 'bg-purple-500/20 text-purple-400',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${cfg[tier] || cfg.free}`}>
      {tier}
    </span>
  );
};

const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400">{Icon}</div>
    <div>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="text-sm text-surface-400">{subtitle}</p>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────
export default function Analytics() {
  const [data, setData] = useState<BIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('overview');

  useEffect(() => {
    const fetchBI = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/admin/bi-dashboard');
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load BI data');
      } finally {
        setLoading(false);
      }
    };
    fetchBI();
  }, []);

  if (error && !data) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Business Intelligence</h1>
          <p className="page-subtitle">Platform-wide analytics and insights</p>
        </div>
        <div className="card flex flex-col items-center justify-center py-16">
          <TrendingUp size={48} className="text-surface-500 mb-4 opacity-50" />
          <p className="text-surface-300 font-medium mb-2">Unable to load analytics</p>
          <p className="text-surface-500 text-sm mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors">
            <RotateCcw size={16} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const h = data?.platformHealth;
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
    { key: 'bakers', label: 'Bakers', icon: <Crown size={16} /> },
    { key: 'products', label: 'Products', icon: <Package size={16} /> },
    { key: 'customers', label: 'Customers', icon: <Users size={16} /> },
    { key: 'operations', label: 'Operations', icon: <Activity size={16} /> },
    { key: 'cohorts', label: 'Cohorts', icon: <Layers size={16} /> },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">Business Intelligence</h1>
        <p className="page-subtitle">Platform-wide analytics, performance rankings, and actionable insights</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 w-24 bg-surface-800 rounded mb-3" />
              <div className="h-8 w-32 bg-surface-800 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ═══ OVERVIEW TAB ═══ */}
          {tab === 'overview' && h && (
            <div className="space-y-8">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                  icon={<DollarSign size={24} />}
                  label="Revenue This Month"
                  value={formatBRL(h.revenueThisMonth)}
                  sub={`All-time: ${formatBRL(h.totalRevenue)}`}
                  growth={h.revenueGrowth}
                />
                <KPICard
                  icon={<ShoppingCart size={24} />}
                  label="Orders This Month"
                  value={h.ordersThisMonth.toLocaleString()}
                  sub={`All-time: ${h.totalOrders.toLocaleString()}`}
                  growth={h.ordersGrowth}
                />
                <KPICard
                  icon={<Target size={24} />}
                  label="Avg Order Value"
                  value={formatBRL(h.avgOrderValue)}
                  sub={`Last month: ${formatBRL(h.avgOrderValueLastMonth)}`}
                />
                <KPICard
                  icon={<UserCheck size={24} />}
                  label="Active Bakers"
                  value={h.activeBakers}
                  sub={`${h.totalCustomers.toLocaleString()} total customers`}
                />
              </div>

              {/* Churn Alert */}
              {h.churnRate > 0 && (
                <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white font-semibold">Churn Rate: {h.churnRate.toFixed(1)}%</p>
                    <p className="text-sm text-red-200">Some bakeries have suspended or churned status. Review the Bakers tab for at-risk accounts.</p>
                  </div>
                </div>
              )}

              {/* Revenue Trend Chart */}
              <div className="card">
                <SectionHeader icon={<TrendingUp size={20} />} title="Revenue & Order Trend" subtitle="12-month revenue and order volume" />
                {data?.revenueAnalytics && data.revenueAnalytics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={data.revenueAnalytics}>
                      <defs>
                        <linearGradient id="biRevGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="biOrdGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '0.75rem' }} />
                      <YAxis yAxisId="rev" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '0.75rem' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <YAxis yAxisId="ord" orientation="right" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '0.75rem' }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [name === 'Revenue' ? formatBRL(v) : v.toLocaleString(), name]} />
                      <Legend />
                      <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="#f59e0b" fill="url(#biRevGrad)" name="Revenue" />
                      <Area yAxisId="ord" type="monotone" dataKey="orders" stroke="#3b82f6" fill="url(#biOrdGrad)" name="Orders" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 bg-surface-800 rounded-lg flex items-center justify-center text-surface-500">No data</div>
                )}
              </div>

              {/* Tier Insights */}
              <div className="card">
                <SectionHeader icon={<Layers size={20} />} title="Tier Performance" subtitle="Average metrics per subscription tier" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-800">
                        <th className="text-left py-3 px-4 text-surface-400 font-medium">Tier</th>
                        <th className="text-right py-3 px-4 text-surface-400 font-medium">Bakers</th>
                        <th className="text-right py-3 px-4 text-surface-400 font-medium">Avg Revenue</th>
                        <th className="text-right py-3 px-4 text-surface-400 font-medium">Avg Orders</th>
                        <th className="text-right py-3 px-4 text-surface-400 font-medium">Avg Products</th>
                        <th className="text-right py-3 px-4 text-surface-400 font-medium">Avg Customers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.tierInsights || []).map(t => (
                        <tr key={t.tier} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                          <td className="py-3 px-4"><TierBadge tier={t.tier} /></td>
                          <td className="py-3 px-4 text-right text-white font-bold">{t.bakerCount}</td>
                          <td className="py-3 px-4 text-right text-brand-400 font-medium">{formatBRL(t.avgRevenue)}</td>
                          <td className="py-3 px-4 text-right text-surface-300">{t.avgOrders.toFixed(0)}</td>
                          <td className="py-3 px-4 text-right text-surface-300">{t.avgProducts.toFixed(0)}</td>
                          <td className="py-3 px-4 text-right text-surface-300">{t.avgCustomers.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ BAKERS TAB ═══ */}
          {tab === 'bakers' && data?.bakerPerformance && (
            <div className="space-y-8">
              {/* Top Performers */}
              <div className="card">
                <SectionHeader icon={<Award size={20} />} title="Top 10 Bakers by Revenue" subtitle="Highest-performing bakeries across the platform" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-800">
                        <th className="text-left py-3 px-3 text-surface-400 font-medium">#</th>
                        <th className="text-left py-3 px-3 text-surface-400 font-medium">Baker</th>
                        <th className="text-left py-3 px-3 text-surface-400 font-medium">Bakery</th>
                        <th className="text-center py-3 px-3 text-surface-400 font-medium">Tier</th>
                        <th className="text-right py-3 px-3 text-surface-400 font-medium">Revenue</th>
                        <th className="text-right py-3 px-3 text-surface-400 font-medium">Orders</th>
                        <th className="text-right py-3 px-3 text-surface-400 font-medium">AOV</th>
                        <th className="text-right py-3 px-3 text-surface-400 font-medium">Customers</th>
                        <th className="text-right py-3 px-3 text-surface-400 font-medium">Products</th>
                        <th className="text-right py-3 px-3 text-surface-400 font-medium">Recipes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bakerPerformance.topBakers.map((b, i) => (
                        <tr key={b.id} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                          <td className="py-3 px-3 text-brand-400 font-bold">{i + 1}</td>
                          <td className="py-3 px-3 text-white font-medium">{b.name}</td>
                          <td className="py-3 px-3 text-surface-300">{b.bakery_name}</td>
                          <td className="py-3 px-3 text-center"><TierBadge tier={b.tier} /></td>
                          <td className="py-3 px-3 text-right text-emerald-400 font-semibold">{formatBRL(b.totalRevenue)}</td>
                          <td className="py-3 px-3 text-right text-surface-300">{b.totalOrders.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right text-surface-300">{formatBRL(b.avgOrderValue)}</td>
                          <td className="py-3 px-3 text-right text-surface-300">{b.totalCustomers}</td>
                          <td className="py-3 px-3 text-right text-surface-300">{b.totalProducts}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={`font-semibold ${b.recipeAdoption >= 50 ? 'text-emerald-400' : b.recipeAdoption > 0 ? 'text-yellow-400' : 'text-surface-600'}`}>
                              {b.recipeAdoption.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* At-Risk Bakers */}
              <div className="card border border-red-500/20">
                <SectionHeader icon={<AlertTriangle size={20} />} title="At-Risk Bakers (Lowest Revenue)" subtitle="Bakeries that may need attention or outreach" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-800">
                        <th className="text-left py-3 px-3 text-surface-400 font-medium">Baker</th>
                        <th className="text-left py-3 px-3 text-surface-400 font-medium">Bakery</th>
                        <th className="text-center py-3 px-3 text-surface-400 font-medium">Tier</th>
                        <th className="text-right py-3 px-3 text-surface-400 font-medium">Revenue</th>
                        <th className="text-right py-3 px-3 text-surface-400 font-medium">Orders</th>
                        <th className="text-right py-3 px-3 text-surface-400 font-medium">Customers</th>
                        <th className="text-right py-3 px-3 text-surface-400 font-medium">Products</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bakerPerformance.bottomBakers.map(b => (
                        <tr key={b.id} className="border-b border-surface-800/50 hover:bg-red-500/5">
                          <td className="py-3 px-3 text-white font-medium">{b.name}</td>
                          <td className="py-3 px-3 text-surface-300">{b.bakery_name}</td>
                          <td className="py-3 px-3 text-center"><TierBadge tier={b.tier} /></td>
                          <td className="py-3 px-3 text-right text-red-400 font-semibold">{formatBRL(b.totalRevenue)}</td>
                          <td className="py-3 px-3 text-right text-surface-300">{b.totalOrders.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right text-surface-300">{b.totalCustomers}</td>
                          <td className="py-3 px-3 text-right text-surface-300">{b.totalProducts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Most Active This Month */}
              <div className="card">
                <SectionHeader icon={<Zap size={20} />} title="Most Active This Month" subtitle="Bakers with the highest order count this month" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {data.bakerPerformance.mostActiveThisMonth.map((b, i) => (
                    <div key={i} className="bg-surface-800/50 rounded-lg p-4 border border-surface-700">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-brand-400 font-bold text-lg">#{i + 1}</span>
                        <p className="text-white font-medium text-sm truncate">{b.bakery_name}</p>
                      </div>
                      <p className="text-xs text-surface-400">{b.name}</p>
                      <div className="mt-3 flex justify-between">
                        <div>
                          <p className="text-xl font-bold text-white">{b.ordersThisMonth}</p>
                          <p className="text-[10px] text-surface-500">orders</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-emerald-400">{formatBRL(b.revenueThisMonth)}</p>
                          <p className="text-[10px] text-surface-500">revenue</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ PRODUCTS TAB ═══ */}
          {tab === 'products' && data?.productIntelligence && (
            <div className="space-y-8">
              {/* Category Breakdown Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <SectionHeader icon={<PieChartIcon size={20} />} title="Revenue by Category" subtitle="Product category distribution" />
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.productIntelligence.categoryBreakdown.map(c => ({ name: c.category, value: c.totalRevenue }))}
                        cx="50%" cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.productIntelligence.categoryBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatBRL(v), 'Revenue']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="card">
                  <SectionHeader icon={<BarChart3 size={20} />} title="Category Metrics" subtitle="Average margins and pricing by category" />
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {data.productIntelligence.categoryBreakdown.map(c => (
                      <div key={c.category} className="flex items-center justify-between py-2 px-3 bg-surface-800/30 rounded-lg">
                        <div>
                          <p className="text-sm text-white capitalize font-medium">{c.category}</p>
                          <p className="text-[10px] text-surface-500">
                            {c.productCount} products · {c.totalQuantity.toLocaleString()} sold
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-brand-400">{formatBRL(c.totalRevenue)}</p>
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-[10px] text-surface-500">Avg {formatBRL(c.avgPrice)}</span>
                            <span className={`text-xs font-semibold ${c.avgMargin >= 40 ? 'text-emerald-400' : c.avgMargin >= 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {c.avgMargin.toFixed(1)}% margin
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Products Table */}
              <div className="card">
                <SectionHeader icon={<Package size={20} />} title="Top 20 Products Across All Bakeries" subtitle="By total quantity sold" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-800">
                        <th className="text-left py-3 px-3 text-surface-400 font-medium">#</th>
                        <th className="text-left py-3 px-3 text-surface-400 font-medium">Product</th>
                        <th className="text-left py-3 px-3 text-surface-400 font-medium">Category</th>
                        <th className="text-left py-3 px-3 text-surface-400 font-medium">Bakery</th>
                        <th className="text-right py-3 px-3 text-surface-400 font-medium">Qty Sold</th>
                        <th className="text-right py-3 px-3 text-surface-400 font-medium">Revenue</th>
                        <th className="text-right py-3 px-3 text-surface-400 font-medium">Avg Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.productIntelligence.topProducts.map((p, i) => (
                        <tr key={i} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                          <td className="py-3 px-3 text-brand-400 font-bold">{i + 1}</td>
                          <td className="py-3 px-3 text-white font-medium">{p.name}</td>
                          <td className="py-3 px-3 text-surface-400 capitalize">{p.category}</td>
                          <td className="py-3 px-3 text-surface-300">{p.bakery_name}</td>
                          <td className="py-3 px-3 text-right text-white font-semibold">{p.quantity_sold.toLocaleString()}</td>
                          <td className="py-3 px-3 text-right text-emerald-400 font-medium">{formatBRL(p.revenue)}</td>
                          <td className="py-3 px-3 text-right text-surface-300">{formatBRL(p.avg_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ CUSTOMERS TAB ═══ */}
          {tab === 'customers' && data?.customerIntelligence && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                  icon={<Users size={24} />}
                  label="Total Customers"
                  value={data.customerIntelligence.totalCustomers.toLocaleString()}
                  sub="Across all bakeries"
                />
                <KPICard
                  icon={<UserCheck size={24} />}
                  label="Avg per Bakery"
                  value={data.customerIntelligence.avgCustomersPerBakery.toFixed(1)}
                  sub="Average customers per bakery"
                />
                <KPICard
                  icon={<Target size={24} />}
                  label="Revenue Concentration"
                  value={`${data.customerIntelligence.concentrationPercent.toFixed(1)}%`}
                  sub="Revenue from top 10% of customers"
                />
              </div>

              <div className="card">
                <SectionHeader icon={<Crown size={20} />} title="Top 10 Customers by Spend" subtitle="Highest-value customers across the platform" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-800">
                        <th className="text-left py-3 px-4 text-surface-400 font-medium">#</th>
                        <th className="text-left py-3 px-4 text-surface-400 font-medium">Customer</th>
                        <th className="text-left py-3 px-4 text-surface-400 font-medium">Bakery</th>
                        <th className="text-right py-3 px-4 text-surface-400 font-medium">Orders</th>
                        <th className="text-right py-3 px-4 text-surface-400 font-medium">Total Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.customerIntelligence.topCustomers.map((c, i) => (
                        <tr key={i} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                          <td className="py-3 px-4 text-brand-400 font-bold">{i + 1}</td>
                          <td className="py-3 px-4 text-white font-medium">{c.name}</td>
                          <td className="py-3 px-4 text-surface-300">{c.bakery_name}</td>
                          <td className="py-3 px-4 text-right text-surface-300">{c.total_orders}</td>
                          <td className="py-3 px-4 text-right text-emerald-400 font-semibold">{formatBRL(c.total_spent)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ OPERATIONS TAB ═══ */}
          {tab === 'operations' && data?.operationalMetrics && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order Status */}
                <div className="card lg:col-span-2">
                  <SectionHeader icon={<ShoppingCart size={20} />} title="Order Status Distribution" subtitle="Current breakdown of all orders" />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {data.operationalMetrics.orderStatusDistribution.map(s => {
                      const statusColors: Record<string, string> = {
                        pending: 'text-yellow-400 bg-yellow-500/10',
                        confirmed: 'text-blue-400 bg-blue-500/10',
                        production: 'text-purple-400 bg-purple-500/10',
                        ready: 'text-cyan-400 bg-cyan-500/10',
                        delivered: 'text-emerald-400 bg-emerald-500/10',
                        cancelled: 'text-red-400 bg-red-500/10',
                      };
                      const color = statusColors[s.status] || 'text-surface-400 bg-surface-800';
                      return (
                        <div key={s.status} className={`rounded-lg p-4 ${color.split(' ')[1]}`}>
                          <p className="text-xs text-surface-400 capitalize mb-1">{s.status}</p>
                          <p className={`text-2xl font-bold ${color.split(' ')[0]}`}>{s.count.toLocaleString()}</p>
                          <p className="text-xs text-surface-500">{s.percentage.toFixed(1)}%</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Avg Delivery Time */}
                <div className="card flex flex-col items-center justify-center">
                  <Clock size={40} className="text-brand-400 mb-3" />
                  <p className="text-surface-400 text-sm mb-1">Avg Delivery Time</p>
                  <p className="text-4xl font-bold text-white">
                    {data.operationalMetrics.avgDeliveryTimeHours > 0
                      ? `${data.operationalMetrics.avgDeliveryTimeHours.toFixed(0)}h`
                      : 'N/A'}
                  </p>
                  <p className="text-xs text-surface-500 mt-1">From order to delivery</p>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="card">
                <SectionHeader icon={<CreditCard size={20} />} title="Payment Method Breakdown" subtitle="How customers are paying" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {data.operationalMetrics.paymentMethodBreakdown.map((pm, i) => {
                    const total = data.operationalMetrics.paymentMethodBreakdown.reduce((s, p) => s + p.count, 0);
                    const pct = total > 0 ? (pm.count / total) * 100 : 0;
                    return (
                      <div key={pm.method} className="bg-surface-800/50 rounded-lg p-5 border border-surface-700">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-white font-semibold capitalize text-lg">{pm.method}</p>
                          <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-1 rounded-full font-semibold">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400">{formatBRL(pm.totalAmount)}</p>
                        <p className="text-xs text-surface-500 mt-1">{pm.count.toLocaleString()} transactions</p>
                        <div className="w-full bg-surface-700 rounded-full h-2 mt-3">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══ COHORTS TAB ═══ */}
          {tab === 'cohorts' && data?.cohortAnalysis && (
            <div className="space-y-8">
              {/* Retention Chart */}
              <div className="card">
                <SectionHeader icon={<Layers size={20} />} title="Cohort Retention" subtitle="Baker retention rate by signup month" />
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.cohortAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="cohort" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '0.75rem' }} />
                    <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: '0.75rem' }} tickFormatter={v => `${v}%`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [name === 'Retention %' ? `${v.toFixed(1)}%` : v, name]} />
                    <Legend />
                    <Bar dataKey="retentionRate" fill="#10b981" name="Retention %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Cohort Table */}
              <div className="card">
                <SectionHeader icon={<Target size={20} />} title="Cohort Details" subtitle="Full breakdown by signup month" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-800">
                        <th className="text-left py-3 px-4 text-surface-400 font-medium">Cohort</th>
                        <th className="text-right py-3 px-4 text-surface-400 font-medium">Joined</th>
                        <th className="text-right py-3 px-4 text-surface-400 font-medium">Active</th>
                        <th className="text-right py-3 px-4 text-surface-400 font-medium">Retention</th>
                        <th className="text-right py-3 px-4 text-surface-400 font-medium">Total Revenue</th>
                        <th className="text-right py-3 px-4 text-surface-400 font-medium">Avg Rev/Baker</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cohortAnalysis.map(c => (
                        <tr key={c.cohort} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                          <td className="py-3 px-4 text-white font-medium">{c.cohort}</td>
                          <td className="py-3 px-4 text-right text-surface-300">{c.totalBakers}</td>
                          <td className="py-3 px-4 text-right text-surface-300">{c.activeBakers}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`font-semibold ${c.retentionRate >= 80 ? 'text-emerald-400' : c.retentionRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {c.retentionRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-brand-400 font-medium">{formatBRL(c.totalRevenue)}</td>
                          <td className="py-3 px-4 text-right text-surface-300">{formatBRL(c.avgRevenuePerBaker)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
