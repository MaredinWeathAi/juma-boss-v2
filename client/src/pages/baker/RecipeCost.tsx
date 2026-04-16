import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Edit2, Trash2, Calculator, TrendingUp } from 'lucide-react';
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
  ingredientCost: number;
  margin: number;
  profit: number;
  recipeItems: RecipeItem[];
}

const RecipeCost = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/baker/recipes');
      setProducts(response.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const getMarginColor = (margin: number) => {
    if (margin < 30) return 'bg-red-500';
    if (margin < 50) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getMarginBgColor = (margin: number) => {
    if (margin < 30) return 'bg-red-500/10';
    if (margin < 50) return 'bg-yellow-500/10';
    return 'bg-emerald-500/10';
  };

  const avgMargin =
    products.length > 0 ? products.reduce((sum, p) => sum + p.margin, 0) / products.length : 0;
  const lowestMargin = products.length > 0 ? Math.min(...products.map((p) => p.margin)) : 0;
  const highestProfit = products.length > 0 ? Math.max(...products.map((p) => p.profit)) : 0;

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 bg-surface-800 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse h-20"></div>
          ))}
        </div>
        <div className="card animate-pulse h-96"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-500/10 border-red-500/50">
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-1" size={20} />
          <div className="flex-1">
            <h3 className="font-semibold text-red-400 mb-1">Erro ao carregar receitas</h3>
            <p className="text-sm text-red-300 mb-4">{error}</p>
            <button onClick={fetchRecipes} className="btn-secondary text-sm">
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title mb-2 flex items-center gap-3">
          <Calculator size={32} className="text-amber-400" />
          Custo de Receitas
        </h1>
        <p className="page-subtitle">Análise de margens e rentabilidade dos produtos</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-surface-400 text-sm font-medium">Margem Média</p>
          <p className={`text-2xl font-bold mt-2 ${avgMargin >= 50 ? 'text-emerald-400' : avgMargin >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
            {avgMargin.toFixed(1)}%
          </p>
        </div>
        <div className="stat-card">
          <p className="text-surface-400 text-sm font-medium">Menor Margem</p>
          <p className="text-2xl font-bold mt-2 text-red-400">{lowestMargin.toFixed(1)}%</p>
        </div>
        <div className="stat-card">
          <p className="text-surface-400 text-sm font-medium">Maior Lucro</p>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{formatBRL(highestProfit)}</p>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-6">Produtos</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="table-header text-left py-3">Produto</th>
                <th className="table-header text-right py-3">Preço</th>
                <th className="table-header text-right py-3">Custo</th>
                <th className="table-header text-right py-3">Lucro</th>
                <th className="table-header text-center py-3">Margem</th>
                <th className="table-header text-center py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-surface-800 hover:bg-surface-800/30"
                  >
                    <td className="py-3 text-sm font-medium text-white">{product.name}</td>
                    <td className="py-3 text-sm text-right text-emerald-400 font-medium">
                      {formatBRL(product.price)}
                    </td>
                    <td className="py-3 text-sm text-right text-surface-300">
                      {formatBRL(product.ingredientCost)}
                    </td>
                    <td className="py-3 text-sm text-right text-emerald-400 font-medium">
                      {formatBRL(product.profit)}
                    </td>
                    <td className="py-3 text-center">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getMarginBgColor(product.margin)}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${getMarginColor(product.margin)}`}></div>
                        {product.margin.toFixed(1)}%
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowModal(true);
                        }}
                        className="text-amber-400 hover:text-amber-300 transition-colors"
                        title="Ver/Editar receita"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-surface-400">
                    Nenhum produto encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recipe Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-800 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-surface-900 p-6 border-b border-surface-700 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">{selectedProduct.name}</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedProduct(null);
                }}
                className="text-surface-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* Recipe Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-surface-900 p-4 rounded-lg">
                  <p className="text-sm text-surface-400">Preço</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {formatBRL(selectedProduct.price)}
                  </p>
                </div>
                <div className="bg-surface-900 p-4 rounded-lg">
                  <p className="text-sm text-surface-400">Custo de Ingredientes</p>
                  <p className="text-xl font-bold text-amber-400">
                    {formatBRL(selectedProduct.ingredientCost)}
                  </p>
                </div>
                <div className="bg-surface-900 p-4 rounded-lg">
                  <p className="text-sm text-surface-400">Lucro Unitário</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {formatBRL(selectedProduct.profit)}
                  </p>
                </div>
              </div>

              {/* Margin Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-white">Margem de Lucro</p>
                  <p className={`text-sm font-bold ${selectedProduct.margin >= 50 ? 'text-emerald-400' : selectedProduct.margin >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {selectedProduct.margin.toFixed(1)}%
                  </p>
                </div>
                <div className="w-full bg-surface-900 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${getMarginColor(selectedProduct.margin)}`}
                    style={{ width: `${Math.min(selectedProduct.margin, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Ingredientes</h4>
                {selectedProduct.recipeItems && selectedProduct.recipeItems.length > 0 ? (
                  <div className="space-y-2">
                    {selectedProduct.recipeItems.map((item) => {
                      const itemCost = (item.quantity_per_batch * item.cost_per_unit) / item.batch_size;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-surface-900 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{item.ingredient_name}</p>
                            <p className="text-xs text-surface-400">
                              {item.quantity_per_batch.toFixed(2)} {item.unit} por {item.batch_size} unid.
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-amber-400">
                              {formatBRL(itemCost)}
                            </p>
                            <p className="text-xs text-surface-400">
                              {formatBRL(item.cost_per_unit)}/un
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-surface-400 py-4">Nenhum ingrediente configurado</p>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-surface-900 p-6 border-t border-surface-700 flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedProduct(null);
                }}
                className="flex-1 btn-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeCost;
