import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, Grid, List } from 'lucide-react';
import api from '../../lib/api';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  status: 'active' | 'inactive' | 'archived';
  prep_time_minutes: number;
}

const Products = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

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
      const response = await api.get('/baker/products');
      const data = response.data || response || [];
      setProducts(data);

      // Extract unique categories
      const cats = [...new Set(data.map((p: Product) => p.category))].filter(Boolean);
      setCategories(cats as string[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.cost) {
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
        cost: parseFloat(formData.cost),
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
    if (!window.confirm('Tem certeza?')) return;

    try {
      await api.delete(`/baker/products/${id}`);
      await fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const filteredProducts = categoryFilter
    ? products.filter((p) => p.category === categoryFilter)
    : products;

  const margin = (product: Product) => {
    return (((product.price - product.cost) / product.price) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title mb-2">Produtos</h1>
          <p className="page-subtitle">Gerenciar catálogo de produtos</p>
        </div>
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

      {error && (
        <div className="card bg-red-500/10 border-red-500/50 flex items-start gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-1" size={18} />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="card flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                categoryFilter === cat
                  ? 'bg-brand-500 text-surface-950'
                  : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
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

      {/* Products Grid/List */}
      {loading ? (
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : ''}`}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse h-64"></div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-surface-400 mb-4">Nenhum produto encontrado</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            Criar primeiro produto
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="card-hover p-4 flex flex-col">
              <h3 className="font-semibold text-white mb-2">{product.name}</h3>
              {product.description && (
                <p className="text-sm text-surface-400 mb-3 flex-1 line-clamp-2">
                  {product.description}
                </p>
              )}

              <div className="space-y-2 mb-4 py-3 border-t border-surface-700">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Preço</span>
                  <span className="text-white font-semibold">R$ {product.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Custo</span>
                  <span className="text-white">R$ {product.cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Margem</span>
                  <span className="text-emerald-400 font-medium">{margin(product)}%</span>
                </div>
                {product.prep_time_minutes > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500">Prep</span>
                    <span className="text-white">{product.prep_time_minutes}min</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
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

              <div className="mt-3 pt-3 border-t border-surface-700">
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
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((product) => (
            <div key={product.id} className="card-hover p-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-white">{product.name}</h3>
                <div className="flex gap-4 mt-2 text-sm text-surface-400">
                  <span>{product.category}</span>
                  <span>R$ {product.price.toFixed(2)}</span>
                  <span>Margem: {margin(product)}%</span>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleEdit(product)}
                  className="btn-ghost text-sm px-3 flex items-center gap-2"
                >
                  <Edit2 size={16} />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="btn-danger text-sm px-3"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-6">
              {editingId ? 'Editar Produto' : 'Novo Produto'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Nome do produto"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input w-full"
                required
              />

              <textarea
                placeholder="Descrição (opcional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input w-full"
                rows={3}
              />

              <input
                type="text"
                placeholder="Categoria"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input w-full"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-surface-500 mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-surface-500 mb-1">Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
              </div>

              <input
                type="number"
                placeholder="Tempo de prep (minutos)"
                value={formData.prepTimeMinutes}
                onChange={(e) => setFormData({ ...formData, prepTimeMinutes: e.target.value })}
                className="input w-full"
              />

              <select
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                className="input w-full"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>

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
                  {editingId ? 'Salvar' : 'Criar'}
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
