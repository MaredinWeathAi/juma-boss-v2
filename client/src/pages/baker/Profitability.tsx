import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, Calculator, PieChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatBRL } from '../../lib/utils';
import { CardSkeleton } from '../../components/ui/LoadingSkeleton';

interface ProductProfit {
  id: string;
  name: string;
  category: string;
  price: number;
  effectiveCost: number;
  margin: number;
  profit: number;
  hasRecipe: boolean;
  revenue: number;
  quantitySold: number;
  totalCOGS: number;
  grossProfit: number;
  monthlyRevenue: { month: string; revenue: number; quantity: number }[];
}

interface CategoryData {
  category: string;
  productCount: number;
  totalRevenue: number;
  totalCOGS: number;
  totalGrossProfit: number;
  totalQuantity: number;
  avgMargin: number;
}

interface MonthlyTrend {
  month: string;
  revenue: number;
  order_count: number;
}

const Profitability = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    summary: any;
    products: ProductProfit[];
    categories: CategoryData[];
    monthlyTrends: MonthlyTrend[];
    topProducts: ProductProfit[];
    bottomProducts: ProductProfit[];
    lowestMarginProducts: ProductProfit[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'categories'>('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/baker/profitability');
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profitability data');
    } finally {
      setLoading(false);
    }
  };

  const getMarginColor = (margin: number): string => {
    if (margin < 20) return 'text-red-400';
    if (margin < 40) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const getMarginBg = (margin: number): string => {
    if (margin < 20) return 'bg-red-500';
    if (margin < 40) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const formatMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card bg-red-500/10 border-red-500/50 flex items-start gap-3">
        <AlertTriangle className="text-red-400 flex-shrink-0 mt-1" size={18} />
        <div>
          <p className="text-sm text-red-300">{error || 'Failed to load data'}</p>
          <button onClick={fetchData} className="text-sm text-red-400 underline mt-2">Tentar novamente</button>
        </div>
      </div>
    );
  }

  const { summary, categories, monthlyTrends, topProducts, bottomProducts, lowestMarginProducts, products } = data;

  // Revenue chart — simple bar chart using divs
  const maxRevenue = Math.max(...monthlyTrends.map(m => m.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title mb-2">Rentabilidade</h1>
          <p className="page-subtitle">Análise completa de receita, custos, margens e lucros</p>
        </div>
        <button
          onClick={() => navigate('/app/recipe-costing')}
          className="btn-secondary flex items-center gap-2"
        >
          <Calculator size={18} />
          Calculadora de Custos
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <DollarSign size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{formatBRL(summary.totalRevenue)}</p>
              <p className="text-xs text-surface-500">Receita Total</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <TrendingDown size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-red-400">{formatBRL(summary.totalCOGS)}</p>
              <p className="text-xs text-surface-500">Custo (COGS)</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">{formatBRL(summary.grossProfit)}</p>
              <p className="text-xs text-surface-500">Lucro Bruto</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <BarChart3 size={20} className="text-purple-400" />
            </div>
            <div>
              <p className={`text-xl font-bold ${getMarginColor(summary.overallMargin)}`}>
                {summary.overallMargin.toFixed(1)}%
              </p>
              <p className="text-xs text-surface-500">Margem Geral</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2">
        {(['overview', 'products', 'categories'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-brand-500 text-surface-950'
                : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            {tab === 'overview' ? 'Visão Geral' : tab === 'products' ? 'Por Produto' : 'Por Categoria'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Revenue Trend Chart */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Receita Mensal (últimos 6 meses)</h3>
            <div className="flex items-end gap-2 h-48">
              {monthlyTrends.map((month, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-surface-400">{formatBRL(month.revenue)}</span>
                  <div className="w-full relative" style={{ height: `${(month.revenue / maxRevenue) * 100}%`, minHeight: '4px' }}>
                    <div className="absolute inset-0 bg-brand-500/60 rounded-t-md hover:bg-brand-500/80 transition-colors" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-surface-500 block">{formatMonth(month.month)}</span>
                    <span className="text-[10px] text-surface-600">{month.order_count} pedidos</span>
                  </div>
                </div>
              ))}
              {monthlyTrends.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-surface-500 text-sm">
                  Sem dados de pedidos nos últimos 6 meses
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Products by Profit */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ArrowUpRight size={18} className="text-emerald-400" />
                Mais Rentáveis
              </h3>
              <div className="space-y-3">
                {topProducts.map((product, i) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-surface-600 w-5">{i + 1}.</span>
                      <div>
                        <p className="text-sm font-medium text-white">{product.name}</p>
                        <p className="text-xs text-surface-500 capitalize">{product.category} · {product.quantitySold} vendidos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-400">{formatBRL(product.grossProfit)}</p>
                      <p className={`text-xs ${getMarginColor(product.margin)}`}>{product.margin.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
                {topProducts.length === 0 && (
                  <p className="text-sm text-surface-500">Sem dados de vendas</p>
                )}
              </div>
            </div>

            {/* Lowest Margin Products */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ArrowDownRight size={18} className="text-red-400" />
                Menor Margem
              </h3>
              <div className="space-y-3">
                {lowestMarginProducts.map((product, i) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-surface-600 w-5">{i + 1}.</span>
                      <div>
                        <p className="text-sm font-medium text-white">{product.name}</p>
                        <p className="text-xs text-surface-500 capitalize">{product.category} · {formatBRL(product.price)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getMarginBg(product.margin)}`}
                            style={{ width: `${Math.min(Math.max(product.margin, 0), 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold ${getMarginColor(product.margin)}`}>
                          {product.margin.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-surface-500">Custo: {formatBRL(product.effectiveCost)}</p>
                    </div>
                  </div>
                ))}
                {lowestMarginProducts.length === 0 && (
                  <p className="text-sm text-surface-500">Sem dados de vendas</p>
                )}
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PieChart size={18} className="text-purple-400" />
              Rentabilidade por Categoria
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.sort((a, b) => b.totalRevenue - a.totalRevenue).map((cat) => {
                const catMargin = cat.totalRevenue > 0
                  ? ((cat.totalRevenue - cat.totalCOGS) / cat.totalRevenue) * 100
                  : cat.avgMargin;
                return (
                  <div key={cat.category} className="bg-surface-800/50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-white capitalize">{cat.category}</h4>
                      <span className="badge text-xs bg-surface-700 text-surface-300">{cat.productCount} prod.</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-surface-500">Receita</span>
                        <span className="text-white font-medium">{formatBRL(cat.totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-500">Lucro Bruto</span>
                        <span className="text-emerald-400 font-medium">{formatBRL(cat.totalGrossProfit)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-surface-500">Margem</span>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getMarginBg(catMargin)}`}
                              style={{ width: `${Math.min(catMargin, 100)}%` }}
                            />
                          </div>
                          <span className={`font-medium ${getMarginColor(catMargin)}`}>
                            {catMargin.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-500">Vendidos</span>
                        <span className="text-surface-300">{cat.totalQuantity} un</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {activeTab === 'products' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left text-xs text-surface-500 font-medium px-4 py-3">Produto</th>
                <th className="text-left text-xs text-surface-500 font-medium px-4 py-3">Categoria</th>
                <th className="text-right text-xs text-surface-500 font-medium px-4 py-3">Preço</th>
                <th className="text-right text-xs text-surface-500 font-medium px-4 py-3">Custo</th>
                <th className="text-right text-xs text-surface-500 font-medium px-4 py-3">Margem</th>
                <th className="text-right text-xs text-surface-500 font-medium px-4 py-3">Vendidos</th>
                <th className="text-right text-xs text-surface-500 font-medium px-4 py-3">Receita</th>
                <th className="text-right text-xs text-surface-500 font-medium px-4 py-3">COGS</th>
                <th className="text-right text-xs text-surface-500 font-medium px-4 py-3">Lucro Bruto</th>
              </tr>
            </thead>
            <tbody>
              {products
                .sort((a, b) => b.grossProfit - a.grossProfit)
                .map((product) => (
                  <tr key={product.id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{product.name}</span>
                        {product.hasRecipe && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Tem receita" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-400 capitalize">{product.category}</td>
                    <td className="px-4 py-3 text-sm text-white text-right">{formatBRL(product.price)}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={product.hasRecipe ? 'text-blue-400' : 'text-surface-400'}>
                        {formatBRL(product.effectiveCost)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-10 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getMarginBg(product.margin)}`}
                            style={{ width: `${Math.min(Math.max(product.margin, 0), 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm ${getMarginColor(product.margin)}`}>
                          {product.margin.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-300 text-right">{product.quantitySold}</td>
                    <td className="px-4 py-3 text-sm text-white font-medium text-right">{formatBRL(product.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-red-400 text-right">{formatBRL(product.totalCOGS)}</td>
                    <td className={`px-4 py-3 text-sm font-semibold text-right ${product.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatBRL(product.grossProfit)}
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-surface-600">
                <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-white">Total</td>
                <td className="px-4 py-3 text-sm font-semibold text-surface-300 text-right">
                  {products.reduce((sum, p) => sum + p.quantitySold, 0)}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-white text-right">
                  {formatBRL(summary.totalRevenue)}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-red-400 text-right">
                  {formatBRL(summary.totalCOGS)}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-emerald-400 text-right">
                  {formatBRL(summary.grossProfit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-4">
          {categories
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .map((cat) => {
              const catMargin = cat.totalRevenue > 0
                ? ((cat.totalRevenue - cat.totalCOGS) / cat.totalRevenue) * 100
                : cat.avgMargin;
              const revenueShare = summary.totalRevenue > 0
                ? (cat.totalRevenue / summary.totalRevenue) * 100
                : 0;

              return (
                <div key={cat.category} className="card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white capitalize">{cat.category}</h3>
                      <p className="text-sm text-surface-500">{cat.productCount} produtos · {cat.totalQuantity} unidades vendidas</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${getMarginColor(catMargin)}`}>
                        {catMargin.toFixed(1)}%
                      </span>
                      <p className="text-xs text-surface-500">Margem</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-surface-800/50 rounded-lg p-3">
                      <p className="text-xs text-surface-500">Receita</p>
                      <p className="text-lg font-semibold text-white">{formatBRL(cat.totalRevenue)}</p>
                      <div className="mt-2 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${revenueShare}%` }} />
                      </div>
                      <p className="text-[10px] text-surface-600 mt-1">{revenueShare.toFixed(1)}% do total</p>
                    </div>

                    <div className="bg-surface-800/50 rounded-lg p-3">
                      <p className="text-xs text-surface-500">COGS</p>
                      <p className="text-lg font-semibold text-red-400">{formatBRL(cat.totalCOGS)}</p>
                    </div>

                    <div className="bg-surface-800/50 rounded-lg p-3">
                      <p className="text-xs text-surface-500">Lucro Bruto</p>
                      <p className="text-lg font-semibold text-emerald-400">{formatBRL(cat.totalGrossProfit)}</p>
                    </div>

                    <div className="bg-surface-800/50 rounded-lg p-3">
                      <p className="text-xs text-surface-500">Margem Média</p>
                      <p className={`text-lg font-semibold ${getMarginColor(cat.avgMargin)}`}>
                        {cat.avgMargin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Recipe Coverage Info */}
      {summary.productsWithRecipes < summary.totalProducts && (
        <div className="card bg-amber-500/10 border border-amber-500/30 p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm text-amber-200 font-medium">
              Análise de custo parcial — {summary.productsWithRecipes} de {summary.totalProducts} produtos com receita configurada
            </p>
            <p className="text-xs text-amber-400/70 mt-1">
              Produtos sem receita usam o custo manual. Para cálculos mais precisos,{' '}
              <button onClick={() => navigate('/app/recipe-costing')} className="underline hover:text-amber-300">
                configure as receitas
              </button>{' '}
              de todos os produtos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profitability;
