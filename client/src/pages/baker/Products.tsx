import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, Grid, List, Package, Calculator, ChevronDown, ChevronUp, Search, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatBRL } from '../../lib/utils';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeleton } from '../../components/ui/LoadingSkeleton';

interface RecipeItem {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  cost_per_unit: number;
  quantity_per_batch: number;
  batch_size: number;
  cost: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  status: 'active' | 'inactive' | 'archived';
  prep_time_minutes: number;
  // Recipe-enriched fields
  ingredientCost?: number;
  recipeItems?: RecipeItem[];
  hasRecipe?: boolean;
}

const Products = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'margin' | 'cost'>('name');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    cost: '',
    prepTimeMinutes: '',
    isActive: true,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch products and recipe costing data in parallel
      const [productsRes, recipesRes] = await Promise.all([
        api.get('/baker/products'),
        api.get('/baker/recipe-costing').catch(() => ({ products: [] })),
      ]);

      const productsData = productsRes.products || [];
      const recipesData = recipesRes.products || [];

      // Build a map of recipe data by product ID
      const recipeMap = new Map<string, any>();
      recipesData.forEach((r: any) => {
        recipeMap.set(r.id, r);
      });

      // Enrich products with recipe cost data
      const enrichedProducts = productsData.map((p: Product) => {
        const recipe = recipeMap.get(p.id);
        if (recipe && recipe.recipeItems && recipe.recipeItems.length > 0) {
          return {
            ...p,
            ingredientCost: recipe.ingredientCost || 0,
            recipeItems: recipe.recipeItems || [],
            hasRecipe: true,
          };
        }
        return { ...p, ingredientCost: 0, recipeItems: [], hasRecipe: false };
      });

      setProducts(enrichedProducts);

      const cats = [...new Set(enrichedProducts.map((p: Product) => p.category))].filter(Boolean);
      setCategories(cats as string[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      setError('Preencha os campos obrigatórios');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost) || 0,
        prepTimeMinutes: parseInt(formData.prepTimeMinutes) || 0,
        isActive: formData.isActive,
      };

      if (editingId) {
        await api.put(`/baker/products/${editingId}`, payload);
      } else {
        await api.post('/baker/products', payload);
      }

      setFormData({
        name: '',
        description: '',
        category: '',
        price: '',
        cost: '',
        prepTimeMinutes: '',
        isActive: true,
      });
      setEditingId(null);
      setShowModal(false);
      await fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price.toString(),
      cost: product.cost.toString(),
      prepTimeMinutes: product.prep_time_minutes.toString(),
      isActive: product.status === 'active',
    });
    setEditingId(product.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      await api.delete(`/baker/products/${id}`);
      await fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const getEffectiveCost = (product: Product): number => {
    return product.hasRecipe && product.ingredientCost! > 0 ? product.ingredientCost! : product.cost;
  };

  const getMargin = (product: Product): number => {
    const cost = getEffectiveCost(product);
    if (product.price <= 0) return 0;
    return ((product.price - cost) / product.price) * 100;
  };

  const getProfit = (product: Product): number => {
    return product.price - getEffectiveCost(product);
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

  // Filter & sort
  const filteredProducts = products
    .filter((p) => {
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price': return b.price - a.price;
        case 'margin': return getMargin(b) - getMargin(a);
        case 'cost': return getEffectiveCost(b) - getEffectiveCost(a);
        default: return a.name.localeCompare(b.name);
      }
    });

  // Summary stats
  const activeProducts = products.filter(p => p.status === 'active');
  const withRecipe = activeProducts.filter(p => p.hasRecipe);
  const withoutRecipe = activeProducts.filter(p => !p.hasRecipe);
  const avgMargin = activeProducts.length > 0
    ? activeProducts.reduce((sum, p) => sum + getMargin(p), 0) / activeProducts.length
    : 0;
  const avgPrice = activeProducts.length > 0
    ? activeProducts.reduce((sum, p) => sum + p.price, 0) / activeProducts.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title mb-2">Produtos</h1>
          <p className="page-subtitle">Gerenciar catálogo de produtos, custos e margens</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/app/recipe-costing')}
            className="btn-secondary flex items-center gap-2"
          >
            <Calculator size={18} />
            Calculadora de Custos
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: '',
                description: '',
                category: '',
                price: '',
                cost: '',
                prepTimeMinutes: '',
                isActive: true,
              });
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Novo Produto
          </button>
        </div>
      </div>

      {error && (
        <div className="card bg-red-500/10 border-red-500/50 flex items-start gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-1" size={18} />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center">
              <Package size={20} className="text-brand-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activeProducts.length}</p>
              <p className="text-xs text-surface-500">Produtos Ativos</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${getMarginColor(avgMargin)}`}>{avgMargin.toFixed(1)}%</p>
              <p className="text-xs text-surface-500">Margem Média</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <DollarSign size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatBRL(avgPrice)}</p>
              <p className="text-xs text-surface-500">Preço Médio</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <BarChart3 size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{withRecipe.length}<span className="text-surface-500 text-sm font-normal">/{activeProducts.length}</span></p>
              <p className="text-xs text-surface-500">Com Receita</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert for products without recipes */}
      {withoutRecipe.length > 0 && (
        <div className="card bg-amber-500/10 border border-amber-500/30 p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm text-amber-200 font-medium">
              {withoutRecipe.length} produto{withoutRecipe.length > 1 ? 's' : ''} sem receita configurada
            </p>
            <p className="text-xs text-amber-400/70 mt-1">
              Configure receitas na <button onClick={() => navigate('/app/recipe-costing')} className="underline hover:text-amber-300">Calculadora de Custos</button> para calcular margens reais com base nos ingredientes.
            </p>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar produtos..."
              className="input w-full pl-9 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                categoryFilter === null
                  ? 'bg-brand-500 text-surface-950'
                  : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  categoryFilter === cat
                    ? 'bg-brand-500 text-surface-950'
                    : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input py-2 text-sm"
          >
            <option value="name">Nome</option>
            <option value="price">Preço</option>
            <option value="margin">Margem</option>
            <option value="cost">Custo</option>
          </select>

          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-brand-500 text-surface-950'
                  : 'bg-surface-800 text-surface-400'
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-brand-500 text-surface-950'
                  : 'bg-surface-800 text-surface-400'
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid/List */}
      {loading ? (
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : ''}`}>
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={<Package size={28} />}
          title="Nenhum produto encontrado"
          description="Comece criando seu primeiro produto para começar a receber pedidos."
          action={{
            label: 'Criar primeiro produto',
            onClick: () => setShowModal(true),
          }}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const margin = getMargin(product);
            const profit = getProfit(product);
            const effectiveCost = getEffectiveCost(product);
            const isExpanded = expandedProduct === product.id;

            return (
              <div key={product.id} className="card-hover p-4 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{product.name}</h3>
                    <span className="text-xs text-surface-500 capitalize">{product.category}</span>
                  </div>
                  <span className={`badge text-xs ${
                    product.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : product.status === 'inactive'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-surface-700 text-surface-300'
                  }`}>
                    {product.status === 'active' ? 'Ativo' : product.status === 'inactive' ? 'Inativo' : 'Arquivado'}
                  </span>
                </div>

                {product.description && (
                  <p className="text-sm text-surface-400 mb-3 flex-1 line-clamp-2">
                    {product.description}
                  </p>
                )}

                {/* Pricing & Cost Section */}
                <div className="space-y-2 mb-3 py-3 border-t border-surface-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">Preço de Venda</span>
                    <span className="text-white font-semibold">{formatBRL(product.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">
                      Custo {product.hasRecipe ? '(receita)' : '(manual)'}
                    </span>
                    <span className={`${product.hasRecipe ? 'text-blue-400' : 'text-surface-300'}`}>
                      {formatBRL(effectiveCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">Lucro/un</span>
                    <span className={`font-medium ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatBRL(profit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-surface-500">Margem</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getMarginBg(margin)}`}
                          style={{ width: `${Math.min(margin, 100)}%` }}
                        />
                      </div>
                      <span className={`font-medium ${getMarginColor(margin)}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {product.prep_time_minutes > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-500">Preparo</span>
                      <span className="text-surface-300">{product.prep_time_minutes}min</span>
                    </div>
                  )}
                </div>

                {/* Recipe ingredient breakdown (expandable) */}
                {product.hasRecipe && product.recipeItems && product.recipeItems.length > 0 && (
                  <div className="mb-3">
                    <button
                      onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {product.recipeItems.length} ingrediente{product.recipeItems.length > 1 ? 's' : ''} na receita
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-1 bg-surface-800/50 rounded-lg p-3">
                        {product.recipeItems.map((item: RecipeItem) => (
                          <div key={item.id} className="flex justify-between text-xs">
                            <span className="text-surface-400">
                              {item.ingredient_name} ({item.quantity_per_batch} {item.unit})
                            </span>
                            <span className="text-surface-300">{formatBRL(item.cost)}</span>
                          </div>
                        ))}
                        <div className="border-t border-surface-700 mt-2 pt-2 flex justify-between text-xs font-medium">
                          <span className="text-surface-400">Total Ingredientes</span>
                          <span className="text-blue-400">{formatBRL(product.ingredientCost || 0)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!product.hasRecipe && (
                  <button
                    onClick={() => navigate('/app/recipe-costing')}
                    className="text-xs text-amber-400/70 hover:text-amber-300 mb-3 text-left transition-colors"
                  >
                    + Configurar receita para cálculo automático
                  </button>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => handleEdit(product)}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
                  >
                    <Edit2 size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="btn-danger flex items-center justify-center gap-2 text-sm px-3"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left text-xs text-surface-500 font-medium px-4 py-3">Produto</th>
                <th className="text-left text-xs text-surface-500 font-medium px-4 py-3">Categoria</th>
                <th className="text-right text-xs text-surface-500 font-medium px-4 py-3">Preço</th>
                <th className="text-right text-xs text-surface-500 font-medium px-4 py-3">Custo</th>
                <th className="text-right text-xs text-surface-500 font-medium px-4 py-3">Lucro</th>
                <th className="text-right text-xs text-surface-500 font-medium px-4 py-3">Margem</th>
                <th className="text-right text-xs text-surface-500 font-medium px-4 py-3">Receita</th>
                <th className="text-right text-xs text-surface-500 font-medium px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const margin = getMargin(product);
                const profit = getProfit(product);
                const effectiveCost = getEffectiveCost(product);

                return (
                  <tr key={product.id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-white text-sm">{product.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                            product.status === 'active' ? 'bg-emerald-400' : 'bg-yellow-400'
                          }`} />
                          <span className="text-xs text-surface-500">
                            {product.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-surface-400 capitalize">{product.category}</td>
                    <td className="px-4 py-3 text-sm text-white font-medium text-right">{formatBRL(product.price)}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={product.hasRecipe ? 'text-blue-400' : 'text-surface-400'}>
                        {formatBRL(effectiveCost)}
                      </span>
                      {product.hasRecipe && (
                        <span className="text-[10px] text-blue-400/60 block">receita</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium text-right ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatBRL(profit)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getMarginBg(margin)}`}
                            style={{ width: `${Math.min(margin, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${getMarginColor(margin)}`}>
                          {margin.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {product.hasRecipe ? (
                        <span className="badge text-[10px] bg-blue-500/20 text-blue-400">
                          {product.recipeItems?.length} ing.
                        </span>
                      ) : (
                        <button
                          onClick={() => navigate('/app/recipe-costing')}
                          className="text-[10px] text-amber-400/70 hover:text-amber-300"
                        >
                          + receita
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-1.5 rounded hover:bg-red-500/20 text-surface-400 hover:text-red-400 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="card max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-white mb-6">
              {editingId ? 'Editar Produto' : 'Novo Produto'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-surface-500 mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  placeholder="Ex: Bolo de Chocolate"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-surface-500 mb-1">Descrição</label>
                <textarea
                  placeholder="Descrição do produto (opcional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs text-surface-500 mb-1">Categoria</label>
                <input
                  type="text"
                  placeholder="Ex: bolo, pão, doce"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input w-full"
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-surface-500 mb-1">Preço de Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-surface-500 mb-1">Custo Manual (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="input w-full"
                  />
                  <p className="text-[10px] text-surface-600 mt-1">
                    Será substituído pelo custo da receita se configurada
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-surface-500 mb-1">Tempo de Preparo (min)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.prepTimeMinutes}
                    onChange={(e) => setFormData({ ...formData, prepTimeMinutes: e.target.value })}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs text-surface-500 mb-1">Status</label>
                  <select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                    className="input w-full"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  {editingId ? 'Salvar Alterações' : 'Criar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
