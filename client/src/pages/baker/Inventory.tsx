import React, { useState, useEffect } from 'react';
import { Plus, Edit2, AlertTriangle, Zap } from 'lucide-react';
import api from '../../lib/api';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  min_stock: number;
  supplier?: string;
  cost_per_unit: number;
  status: 'active' | 'inactive';
}

const Inventory = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    stock: '',
    unit: 'kg',
    minStock: '',
    supplier: '',
    costPerUnit: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/baker/inventory');
      const data = response.data || response || [];
      setItems(data);

      const cats = [...new Set(data.map((item: InventoryItem) => item.category))].filter(Boolean);
      setCategories(cats as string[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.stock) {
      setError('Preencha os campos obrigatórios');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        category: formData.category,
        stock: parseFloat(formData.stock),
        unit: formData.unit,
        minStock: parseInt(formData.minStock) || 0,
        supplier: formData.supplier || undefined,
        costPerUnit: parseFloat(formData.costPerUnit) || 0,
      };

      if (editingId) {
        await api.put(`/baker/inventory/${editingId}`, payload);
      } else {
        await api.post('/baker/inventory', payload);
      }

      setFormData({
        name: '',
        category: '',
        stock: '',
        unit: 'kg',
        minStock: '',
        supplier: '',
        costPerUnit: '',
        status: 'active',
      });
      setEditingId(null);
      setShowModal(false);
      await fetchInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setFormData({
      name: item.name,
      category: item.category,
      stock: item.stock.toString(),
      unit: item.unit,
      minStock: item.min_stock.toString(),
      supplier: item.supplier || '',
      costPerUnit: item.cost_per_unit.toString(),
      status: item.status,
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza?')) return;

    try {
      await api.delete(`/baker/inventory/${id}`);
      await fetchInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const filteredItems = categoryFilter
    ? items.filter((item) => item.category === categoryFilter)
    : items;

  const lowStockItems = filteredItems.filter((item) => item.stock <= item.min_stock);

  const stockPercentage = (item: InventoryItem) => {
    const ratio = item.stock / (item.min_stock || 1);
    return Math.min(100, Math.round(ratio * 100));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title mb-2">Inventário</h1>
          <p className="page-subtitle">Gerenciar ingredientes e estoque</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              category: '',
              stock: '',
              unit: 'kg',
              minStock: '',
              supplier: '',
              costPerUnit: '',
              status: 'active',
            });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Novo Item
        </button>
      </div>

      {error && (
        <div className="card bg-red-500/10 border-red-500/50 flex items-start gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-1" size={18} />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="card bg-yellow-500/10 border-yellow-500/30 flex items-start gap-3">
          <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-1" size={18} />
          <div>
            <p className="text-sm font-medium text-yellow-300">
              {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} com estoque baixo
            </p>
            <p className="text-xs text-yellow-300/70">Considere fazer um reabastecimento</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card flex gap-2 flex-wrap">
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

      {/* Inventory Items */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card animate-pulse h-24"></div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-surface-400 mb-4">Nenhum item encontrado</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            Adicionar primeiro item
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isLowStock = item.stock <= item.min_stock;
            const percentage = stockPercentage(item);

            return (
              <div
                key={item.id}
                className={`card-hover p-4 ${isLowStock ? 'border-yellow-500/30' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{item.name}</h3>
                    <p className="text-sm text-surface-400">
                      {item.category}
                      {item.supplier && ` • ${item.supplier}`}
                    </p>
                  </div>

                  {isLowStock && (
                    <div className="flex items-center gap-1 text-yellow-400 text-sm font-medium">
                      <AlertTriangle size={16} />
                      Baixo
                    </div>
                  )}
                </div>

                {/* Stock Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-white">
                      {item.stock} {item.unit}
                    </span>
                    <span className="text-xs text-surface-500">
                      Mín: {item.min_stock} {item.unit}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        percentage <= 50
                          ? 'bg-red-500'
                          : percentage <= 80
                          ? 'bg-yellow-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-surface-400">
                    R$ {item.cost_per_unit.toFixed(2)} por {item.unit}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="btn-ghost text-sm px-3 flex items-center gap-2"
                    >
                      <Edit2 size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="btn-danger text-sm px-3"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-6">
              {editingId ? 'Editar Item' : 'Novo Item'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Nome do ingrediente"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input w-full"
                required
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
                  <label className="block text-xs text-surface-500 mb-1">Quantidade</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-surface-500 mb-1">Unidade</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="input w-full"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                    <option value="ml">ml</option>
                    <option value="un">un</option>
                    <option value="cx">cx</option>
                  </select>
                </div>
              </div>

              <input
                type="number"
                placeholder="Estoque mínimo"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                className="input w-full"
              />

              <input
                type="text"
                placeholder="Fornecedor (opcional)"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="input w-full"
              />

              <input
                type="number"
                step="0.01"
                placeholder="Custo unitário (R$)"
                value={formData.costPerUnit}
                onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                className="input w-full"
              />

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

export default Inventory;
