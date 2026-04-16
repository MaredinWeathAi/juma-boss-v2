import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Calculator,
  TrendingUp,
  DollarSign,
  Target,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  BarChart3,
  Package,
  Search,
} from 'lucide-react';
import api from '../../lib/api';
import { formatBRL } from '../../lib/utils';

interface RecipeItem {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  quantity_per_batch: number;
  batch_size: number;
  cost_per_unit: number;
  unit: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  category: string;
  ingredientCost: number;
  margin: number;
  profit: number;
  recipeItems: RecipeItem[];
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  stock: number;
}

const getMarginColor = (margin: number) => {
  if (margin < 20) return 'text-red-400';
  if (margin < 40) return 'text-yellow-400';
  return 'text-emerald-400';
};

const getMarginBg = (margin: number) => {
  if (margin < 20) return 'bg-red-500/10 border-red-500/30';
  if (margin < 40) return 'bg-yellow-500/10 border-yellow-500/30';
  return 'bg-emerald-500/10 border-emerald-500/30';
};

const getMarginBarColor = (margin: number) => {
  if (margin < 20) return 'bg-red-500';
  if (margin < 40) return 'bg-yellow-500';
  return 'bg-emerald-500';
};

const RecipeCost = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'margin' | 'profit' | 'cost'>('name');

  // Add ingredient form state
  const [addingToProduct, setAddingToProduct] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ ingredientId: '', quantityPerBatch: '', batchSize: '1' });

  // Target margin calculator
  const [targetMarginProduct, setTargetMarginProduct] = useState<string | null>(null);
  const [targetMargin, setTargetMargin] = useState('50');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [recipesRes, ingredientsRes] = await Promise.all([
        api.get('/baker/recipes'),
        api.get('/baker/inventory'),
      ]);
      setProducts(recipesRes.products || []);
      setIngredients(ingredientsRes.ingredients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipeItem = async (productId: string) => {
    if (!newItem.ingredientId || !newItem.quantityPerBatch) return;

    try {
      await api.post(`/baker/recipes/${productId}/items`, {
        ingredientId: newItem.ingredientId,
        quantityPerBatch: parseFloat(newItem.quantityPerBatch),
        batchSize: parseInt(newItem.batchSize) || 1,
      });
      setNewItem({ ingredientId: '', quantityPerBatch: '', batchSize: '1' });
      setAddingToProduct(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar ingrediente');
    }
  };

  const handleDeleteRecipeItem = async (productId: string, itemId: string) => {
    try {
      await api.delete(`/baker/recipes/${productId}/items/${itemId}`);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover ingrediente');
    }
  };

  const calculateSuggestedPrice = (ingredientCost: number, targetMarginPct: number) => {
    if (targetMarginPct >= 100 || targetMarginPct < 0) return 0;
    return ingredientCost / (1 - targetMarginPct / 100);
  };

  // Get unique categories
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  // Filter & sort
  const filtered = products
    .filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = !categoryFilter || p.category === categoryFilter;
      return matchesSearch && matchesCat;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'margin': return a.margin - b.margin;
        case 'profit': return b.profit - a.profit;
        case 'cost': return b.ingredientCost - a.ingredientCost;
        default: return a.name.localeCompare(b.name);
      }
    });

  // Summary stats
  const productsWithRecipe = products.filter((p) => p.recipeItems.length > 0);
  const avgMargin = productsWithRecipe.length > 0
    ? productsWithRecipe.reduce((sum, p) => sum + p.margin, 0) / productsWithRecipe.length
    : 0;
  const totalCOGS = productsWithRecipe.reduce((sum, p) => sum + p.ingredientCost, 0);
  const lowestMargin = productsWithRecipe.length > 0
    ? Math.min(...productsWithRecipe.map((p) => p.margin))
    : 0;
  const highestProfit = productsWithRecipe.length > 0
    ? Math.max(...productsWithRecipe.map((p) => p.profit))
    : 0;
  const productsNoRecipe = products.filter((p) => p.recipeItems.length === 0).length;

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 bg-surface-800 rounded w-1/3 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse h-24" />
          ))}
        </div>
        <div className="card animate-pulse h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title mb-2 flex items-center gap-3">
            <Calculator size={28} className="text-amber-400" />
            Calculadora de Custos
          </h1>
          <p className="page-subtitle">Monte receitas, calcule custos e defina preços com base em margens</p>
        </div>
      </div>

      {error && (
        <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-300">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Alert for products without recipes */}
      {productsNoRecipe > 0 && (
        <div className="flex gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-200">
              <strong>{productsNoRecipe} produto{productsNoRecipe !== 1 ? 's' : ''}</strong> sem receita configurada.
              Adicione ingredientes para calcular custos e margens reais.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-surface-400 text-xs font-medium">Margem Média</p>
              <p className={`text-2xl font-bold mt-1 ${getMarginColor(avgMargin)}`}>
                {avgMargin.toFixed(1)}%
              </p>
            </div>
            <div className="p-2 bg-brand-500/10 rounded-lg">
              <TrendingUp size={18} className="text-brand-400" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-surface-400 text-xs font-medium">Menor Margem</p>
              <p className={`text-2xl font-bold mt-1 ${getMarginColor(lowestMargin)}`}>
                {lowestMargin.toFixed(1)}%
              </p>
            </div>
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-surface-400 text-xs font-medium">Maior Lucro</p>
              <p className="text-2xl font-bold mt-1 text-emerald-400">{formatBRL(highestProfit)}</p>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign size={18} className="text-emerald-400" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-surface-400 text-xs font-medium">Com Receita</p>
              <p className="text-2xl font-bold mt-1 text-white">
                {productsWithRecipe.length}/{products.length}
              </p>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Package size={18} className="text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              !categoryFilter ? 'bg-brand-500 text-surface-950' : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                categoryFilter === cat ? 'bg-brand-500 text-surface-950' : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="input text-sm"
        >
          <option value="name">Nome</option>
          <option value="margin">Menor margem</option>
          <option value="profit">Maior lucro</option>
          <option value="cost">Maior custo</option>
        </select>
      </div>

      {/* Product Cards with Expandable Recipes */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card py-16 text-center">
            <Package size={48} className="text-surface-600 mx-auto mb-4" />
            <p className="text-surface-400">Nenhum produto encontrado</p>
          </div>
        ) : (
          filtered.map((product) => {
            const isExpanded = expandedProduct === product.id;
            const hasRecipe = product.recipeItems.length > 0;

            return (
              <div key={product.id} className="card p-0 overflow-hidden">
                {/* Product Header Row */}
                <button
                  onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-surface-800/30 transition-colors text-left"
                >
                  {/* Product name & category */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white truncate">{product.name}</h3>
                      {product.category && (
                        <span className="px-2 py-0.5 bg-surface-800 rounded text-xs text-surface-400 capitalize flex-shrink-0">
                          {product.category}
                        </span>
                      )}
                    </div>
                    {!hasRecipe && (
                      <p className="text-xs text-amber-400 mt-1">⚠ Sem receita — adicione ingredientes</p>
                    )}
                  </div>

                  {/* Price / Cost / Margin */}
                  <div className="hidden sm:grid grid-cols-4 gap-6 text-right flex-shrink-0" style={{ width: '400px' }}>
                    <div>
                      <p className="text-xs text-surface-500">Preço</p>
                      <p className="text-sm font-semibold text-white">{formatBRL(product.price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-surface-500">Custo</p>
                      <p className="text-sm font-semibold text-amber-400">
                        {hasRecipe ? formatBRL(product.ingredientCost) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-surface-500">Lucro</p>
                      <p className="text-sm font-semibold text-emerald-400">
                        {hasRecipe ? formatBRL(product.profit) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-surface-500">Margem</p>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${getMarginBg(product.margin)}`}>
                        <span className={getMarginColor(product.margin)}>
                          {hasRecipe ? `${product.margin.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile price/margin */}
                  <div className="sm:hidden text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-white">{formatBRL(product.price)}</p>
                    <p className={`text-xs font-bold ${getMarginColor(product.margin)}`}>
                      {hasRecipe ? `${product.margin.toFixed(1)}%` : '—'}
                    </p>
                  </div>

                  {/* Expand icon */}
                  <div className="text-surface-400 flex-shrink-0">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Margin bar */}
                {hasRecipe && (
                  <div className="px-4 pb-1">
                    <div className="w-full bg-surface-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all ${getMarginBarColor(product.margin)}`}
                        style={{ width: `${Math.min(Math.max(product.margin, 0), 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Expanded: Recipe Details */}
                {isExpanded && (
                  <div className="border-t border-surface-800 bg-surface-900/50">
                    <div className="p-4 space-y-4">
                      {/* Cost Breakdown Header */}
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Calculator size={16} className="text-amber-400" />
                          Receita — Ingredientes
                        </h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setTargetMarginProduct(
                                targetMarginProduct === product.id ? null : product.id
                              );
                            }}
                            className="text-xs px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <Target size={14} />
                            Calcular preço
                          </button>
                          <button
                            onClick={() => {
                              setAddingToProduct(addingToProduct === product.id ? null : product.id);
                              setNewItem({ ingredientId: '', quantityPerBatch: '', batchSize: '1' });
                            }}
                            className="text-xs px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-surface-950 rounded-lg flex items-center gap-1.5 font-medium transition-colors"
                          >
                            <Plus size={14} />
                            Ingrediente
                          </button>
                        </div>
                      </div>

                      {/* Target Margin Calculator */}
                      {targetMarginProduct === product.id && hasRecipe && (
                        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                          <div className="flex items-center gap-3 mb-3">
                            <Target size={16} className="text-blue-400" />
                            <p className="text-sm font-medium text-white">Calcular preço sugerido</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-surface-400">Margem desejada:</label>
                              <input
                                type="number"
                                value={targetMargin}
                                onChange={(e) => setTargetMargin(e.target.value)}
                                className="input w-20 text-center text-sm"
                                min="0"
                                max="99"
                              />
                              <span className="text-xs text-surface-400">%</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-surface-400">Preço sugerido: </span>
                              <span className="text-lg font-bold text-blue-400">
                                {formatBRL(calculateSuggestedPrice(product.ingredientCost, parseFloat(targetMargin) || 0))}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="text-surface-400">Lucro: </span>
                              <span className="font-semibold text-emerald-400">
                                {formatBRL(
                                  calculateSuggestedPrice(product.ingredientCost, parseFloat(targetMargin) || 0) -
                                    product.ingredientCost
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Add Ingredient Form */}
                      {addingToProduct === product.id && (
                        <div className="p-4 bg-surface-800/50 border border-surface-700 rounded-lg">
                          <p className="text-xs font-medium text-surface-300 mb-3">Adicionar ingrediente à receita</p>
                          <div className="flex gap-3 items-end flex-wrap">
                            <div className="flex-1 min-w-[180px]">
                              <label className="text-xs text-surface-500 mb-1 block">Ingrediente</label>
                              <select
                                value={newItem.ingredientId}
                                onChange={(e) => setNewItem({ ...newItem, ingredientId: e.target.value })}
                                className="input w-full text-sm"
                              >
                                <option value="">Selecionar...</option>
                                {ingredients
                                  .filter((ing) => !product.recipeItems.find((ri) => ri.ingredient_id === ing.id))
                                  .map((ing) => (
                                    <option key={ing.id} value={ing.id}>
                                      {ing.name} ({formatBRL(ing.cost_per_unit)}/{ing.unit})
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div className="w-28">
                              <label className="text-xs text-surface-500 mb-1 block">Quantidade</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={newItem.quantityPerBatch}
                                onChange={(e) => setNewItem({ ...newItem, quantityPerBatch: e.target.value })}
                                className="input w-full text-sm"
                              />
                            </div>
                            <div className="w-24">
                              <label className="text-xs text-surface-500 mb-1 block">Rende (un)</label>
                              <input
                                type="number"
                                value={newItem.batchSize}
                                onChange={(e) => setNewItem({ ...newItem, batchSize: e.target.value })}
                                className="input w-full text-sm"
                                min="1"
                              />
                            </div>
                            {newItem.ingredientId && newItem.quantityPerBatch && (
                              <div className="text-right">
                                <p className="text-xs text-surface-500">Custo/un</p>
                                <p className="text-sm font-semibold text-amber-400">
                                  {formatBRL(
                                    (() => {
                                      const ing = ingredients.find((i) => i.id === newItem.ingredientId);
                                      if (!ing) return 0;
                                      return (parseFloat(newItem.quantityPerBatch) * ing.cost_per_unit) / (parseInt(newItem.batchSize) || 1);
                                    })()
                                  )}
                                </p>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAddRecipeItem(product.id)}
                                disabled={!newItem.ingredientId || !newItem.quantityPerBatch}
                                className="btn-primary text-sm px-4 disabled:opacity-50"
                              >
                                <Save size={14} />
                              </button>
                              <button
                                onClick={() => setAddingToProduct(null)}
                                className="btn-secondary text-sm px-3"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Ingredient List */}
                      {product.recipeItems.length > 0 ? (
                        <div className="space-y-1">
                          {/* Header */}
                          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-surface-500 font-medium">
                            <div className="col-span-4">Ingrediente</div>
                            <div className="col-span-2 text-right">Qtd / Lote</div>
                            <div className="col-span-2 text-right">Custo Unit.</div>
                            <div className="col-span-2 text-right">Custo/Unid.</div>
                            <div className="col-span-1 text-right">% Total</div>
                            <div className="col-span-1"></div>
                          </div>
                          {product.recipeItems.map((item) => {
                            const itemCost = (item.quantity_per_batch * item.cost_per_unit) / item.batch_size;
                            const pctOfTotal = product.ingredientCost > 0
                              ? (itemCost / product.ingredientCost) * 100
                              : 0;

                            return (
                              <div
                                key={item.id}
                                className="grid grid-cols-12 gap-2 px-3 py-2.5 bg-surface-800/40 rounded-lg items-center hover:bg-surface-800/60 transition-colors"
                              >
                                <div className="col-span-4">
                                  <p className="text-sm font-medium text-white">{item.ingredient_name}</p>
                                  <p className="text-xs text-surface-500">
                                    {formatBRL(item.cost_per_unit)}/{item.unit}
                                  </p>
                                </div>
                                <div className="col-span-2 text-right">
                                  <p className="text-sm text-surface-300">
                                    {item.quantity_per_batch} {item.unit}
                                  </p>
                                  <p className="text-xs text-surface-500">
                                    p/ {item.batch_size} un
                                  </p>
                                </div>
                                <div className="col-span-2 text-right">
                                  <p className="text-sm text-surface-300">
                                    {formatBRL(item.quantity_per_batch * item.cost_per_unit)}
                                  </p>
                                </div>
                                <div className="col-span-2 text-right">
                                  <p className="text-sm font-semibold text-amber-400">
                                    {formatBRL(itemCost)}
                                  </p>
                                </div>
                                <div className="col-span-1 text-right">
                                  <span className="text-xs text-surface-400">
                                    {pctOfTotal.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="col-span-1 text-right">
                                  <button
                                    onClick={() => handleDeleteRecipeItem(product.id, item.id)}
                                    className="text-surface-500 hover:text-red-400 transition-colors p-1"
                                    title="Remover"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Totals row */}
                          <div className="grid grid-cols-12 gap-2 px-3 py-3 border-t border-surface-700 mt-2">
                            <div className="col-span-4">
                              <p className="text-sm font-bold text-white">TOTAL</p>
                            </div>
                            <div className="col-span-2"></div>
                            <div className="col-span-2 text-right">
                              <p className="text-sm font-bold text-amber-400">
                                {formatBRL(product.recipeItems.reduce((sum, item) => sum + item.quantity_per_batch * item.cost_per_unit, 0))}
                              </p>
                              <p className="text-xs text-surface-500">lote</p>
                            </div>
                            <div className="col-span-2 text-right">
                              <p className="text-sm font-bold text-amber-400">
                                {formatBRL(product.ingredientCost)}
                              </p>
                              <p className="text-xs text-surface-500">unidade</p>
                            </div>
                            <div className="col-span-1 text-right">
                              <span className="text-xs text-surface-400">100%</span>
                            </div>
                            <div className="col-span-1"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <Calculator size={32} className="text-surface-600 mx-auto mb-3" />
                          <p className="text-surface-400 text-sm mb-1">Nenhum ingrediente na receita</p>
                          <p className="text-surface-500 text-xs">
                            Clique em "+ Ingrediente" para começar a montar a receita
                          </p>
                        </div>
                      )}

                      {/* Price vs Cost Summary */}
                      {hasRecipe && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-surface-700">
                          <div className="p-3 bg-surface-800/50 rounded-lg">
                            <p className="text-xs text-surface-500">Preço de Venda</p>
                            <p className="text-lg font-bold text-white">{formatBRL(product.price)}</p>
                          </div>
                          <div className="p-3 bg-surface-800/50 rounded-lg">
                            <p className="text-xs text-surface-500">Custo Ingredientes</p>
                            <p className="text-lg font-bold text-amber-400">{formatBRL(product.ingredientCost)}</p>
                          </div>
                          <div className="p-3 bg-surface-800/50 rounded-lg">
                            <p className="text-xs text-surface-500">Lucro Bruto</p>
                            <p className={`text-lg font-bold ${product.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {formatBRL(product.profit)}
                            </p>
                          </div>
                          <div className={`p-3 rounded-lg border ${getMarginBg(product.margin)}`}>
                            <p className="text-xs text-surface-500">Margem</p>
                            <p className={`text-lg font-bold ${getMarginColor(product.margin)}`}>
                              {product.margin.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RecipeCost;
