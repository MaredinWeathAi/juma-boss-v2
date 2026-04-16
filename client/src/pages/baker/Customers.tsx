import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, Search } from 'lucide-react';
import api from '../../lib/api';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  total_orders: number;
  total_spent: number;
  status: 'active' | 'inactive';
}

const Customers = () => {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/baker/customers');
      setCustomers(response.data || response || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      setError('Nome e email são obrigatórios');
      return;
    }

    try {
      setLoading(true);

      if (editingId) {
        await api.put(`/baker/customers/${editingId}`, formData);
      } else {
        await api.post('/baker/customers', formData);
      }

      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        status: 'active',
      });
      setEditingId(null);
      setShowModal(false);
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      status: customer.status,
    });
    setEditingId(customer.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza?')) return;

    try {
      await api.delete(`/baker/customers/${id}`);
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title mb-2">Clientes</h1>
          <p className="page-subtitle">Gerenciar base de clientes</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              email: '',
              phone: '',
              address: '',
              city: '',
              status: 'active',
            });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {error && (
        <div className="card bg-red-500/10 border-red-500/50 flex items-start gap-3">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-1" size={18} />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-surface-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card animate-pulse h-24"></div>
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-surface-400 mb-4">Nenhum cliente encontrado</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            Adicionar primeiro cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="card-hover p-4 flex flex-col">
              <h3 className="font-semibold text-white mb-1">{customer.name}</h3>
              <p className="text-sm text-surface-400 mb-3">{customer.email}</p>

              {customer.phone && (
                <p className="text-sm text-surface-400 mb-3">{customer.phone}</p>
              )}

              <div className="flex-1 space-y-2 py-3 border-t border-surface-700">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Pedidos</span>
                  <span className="text-white font-semibold">{customer.total_orders}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Total Gasto</span>
                  <span className="text-emerald-400 font-semibold">
                    R$ {customer.total_spent.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleEdit(customer)}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
                >
                  <Edit2 size={16} />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(customer.id)}
                  className="btn-danger flex items-center justify-center gap-2 text-sm px-3"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-surface-700">
                <span className={`badge text-xs ${
                  customer.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {customer.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
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
              {editingId ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Nome completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input w-full"
                required
              />

              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input w-full"
                required
              />

              <input
                type="tel"
                placeholder="Telefone (opcional)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input w-full"
              />

              <input
                type="text"
                placeholder="Endereço (opcional)"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="input w-full"
              />

              <input
                type="text"
                placeholder="Cidade (opcional)"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="input w-full"
              />

              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
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

export default Customers;
