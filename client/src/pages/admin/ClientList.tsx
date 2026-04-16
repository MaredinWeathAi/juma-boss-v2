'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  ChevronRight,
  X,
  AlertCircle,
  Loader,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

interface ClientData {
  id: string;
  email: string;
  name: string;
  phone: string;
  created_at: string;
  bakery_id: string;
  bakery_name: string;
  slug: string;
  status: 'active' | 'suspended' | 'churned';
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  subscription_status: 'active' | 'inactive' | 'cancelled';
  total_orders: number;
  total_revenue: number;
  total_products: number;
  total_customers: number;
  total_employees: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ClientsResponse {
  clients: ClientData[];
  pagination: PaginationData;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  bakery_name: string;
  phone: string;
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
}

const TIER_COLORS = {
  free: { bg: 'bg-surface-700', text: 'text-surface-300', badge: 'badge-free' },
  starter: { bg: 'bg-blue-500/10', text: 'text-blue-400', badge: 'badge-starter' },
  pro: { bg: 'bg-brand-500/10', text: 'text-brand-400', badge: 'badge-pro' },
  enterprise: { bg: 'bg-purple-500/10', text: 'text-purple-400', badge: 'badge-enterprise' },
};

const STATUS_COLORS = {
  active: 'bg-emerald-500/20 text-emerald-400',
  suspended: 'bg-red-500/20 text-red-400',
  churned: 'bg-surface-700 text-surface-400',
};

const TierBadge = ({ tier }: { tier: keyof typeof TIER_COLORS }) => (
  <span className={`badge ${TIER_COLORS[tier].badge} capitalize`}>{tier}</span>
);

const StatusIndicator = ({ status }: { status: 'active' | 'suspended' | 'churned' }) => {
  const colors = {
    active: 'bg-emerald-500',
    suspended: 'bg-red-500',
    churned: 'bg-surface-500',
  };
  return <div className={`w-3 h-3 rounded-full ${colors[status]}`} />;
};

const SkeletonCard = () => (
  <div className="card space-y-4">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="h-5 w-40 bg-surface-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-48 bg-surface-800 rounded animate-pulse mb-3" />
        <div className="h-3 w-32 bg-surface-800 rounded animate-pulse" />
      </div>
      <div className="w-12 h-6 bg-surface-800 rounded animate-pulse" />
    </div>
    <div className="grid grid-cols-4 gap-2 pt-4 border-t border-surface-800">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-1">
          <div className="h-3 w-8 bg-surface-800 rounded animate-pulse" />
          <div className="h-4 w-12 bg-surface-800 rounded animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

const ClientCard = ({
  client,
  onEdit,
  onDelete,
  onView,
}: {
  client: ClientData;
  onEdit: (client: ClientData) => void;
  onDelete: (clientId: string, clientName: string) => void;
  onView: (clientId: string) => void;
}) => {
  const [hovering, setHovering] = useState(false);

  const memberSinceDate = new Date(client.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="card-hover group relative overflow-hidden cursor-pointer"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => onView(client.id)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-lg font-bold text-white">{client.name}</p>
          <p className="text-sm text-surface-400">{client.bakery_name}</p>
          <p className="text-xs text-surface-500 mt-1">{client.email}</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <TierBadge tier={client.tier} />
          <div className="flex items-center gap-1.5">
            <StatusIndicator status={client.status} />
            <span className="text-xs text-surface-400 capitalize">{client.status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 pt-4 border-t border-surface-800">
        <div>
          <p className="text-xs text-surface-500">Orders</p>
          <p className="text-sm font-semibold text-white flex items-center gap-1">
            <ShoppingCart size={14} className="text-surface-400" />
            {client.total_orders}
          </p>
        </div>
        <div>
          <p className="text-xs text-surface-500">Revenue</p>
          <p className="text-sm font-semibold text-white flex items-center gap-1">
            <DollarSign size={14} className="text-surface-400" />
            ${(client.total_revenue / 100).toFixed(0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-surface-500">Products</p>
          <p className="text-sm font-semibold text-white flex items-center gap-1">
            <Package size={14} className="text-surface-400" />
            {client.total_products}
          </p>
        </div>
        <div>
          <p className="text-xs text-surface-500">Customers</p>
          <p className="text-sm font-semibold text-white flex items-center gap-1">
            <Users size={14} className="text-surface-400" />
            {client.total_customers}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-800">
        <p className="text-xs text-surface-500">Member since {memberSinceDate}</p>
        {hovering && (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(client);
              }}
              className="p-1.5 hover:bg-surface-800 rounded-lg transition-colors text-surface-400 hover:text-white"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(client.id, client.name);
              }}
              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 hover:text-red-300"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Modal = ({
  isOpen,
  title,
  onClose,
  children,
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-900 rounded-xl border border-surface-800 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-surface-800 sticky top-0 bg-surface-900">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-surface-400" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const AddClientForm = ({
  onSubmit,
  onCancel,
  loading,
}: {
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) => {
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    bakery_name: '',
    phone: '',
    tier: 'starter',
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name || !form.email || !form.password || !form.bakery_name) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add client');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Baker Name *
        </label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          className="input w-full"
          placeholder="John Doe"
          disabled={loading}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Email *
        </label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          className="input w-full"
          placeholder="baker@email.com"
          disabled={loading}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Password *
        </label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          className="input w-full"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Bakery Name *
        </label>
        <input
          type="text"
          name="bakery_name"
          value={form.bakery_name}
          onChange={handleChange}
          className="input w-full"
          placeholder="Sweet Dreams Bakery"
          disabled={loading}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Phone (Optional)
        </label>
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          className="input w-full"
          placeholder="+1 (555) 000-0000"
          disabled={loading}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Tier
        </label>
        <select
          name="tier"
          value={form.tier}
          onChange={handleChange}
          className="input w-full"
          disabled={loading}
        >
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary flex-1"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary flex-1 flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
          {loading ? 'Creating...' : 'Add Client'}
        </button>
      </div>
    </form>
  );
};

const EditClientForm = ({
  client,
  onSubmit,
  onCancel,
  loading,
}: {
  client: ClientData;
  onSubmit: (data: Partial<FormData>) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) => {
  const [form, setForm] = useState({
    name: client.name,
    email: client.email,
    bakery_name: client.bakery_name,
    phone: client.phone,
    tier: client.tier,
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name || !form.email || !form.bakery_name) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Baker Name *
        </label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          className="input w-full"
          disabled={loading}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Email *
        </label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          className="input w-full"
          disabled={loading}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Bakery Name *
        </label>
        <input
          type="text"
          name="bakery_name"
          value={form.bakery_name}
          onChange={handleChange}
          className="input w-full"
          disabled={loading}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Phone
        </label>
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          className="input w-full"
          disabled={loading}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1">
          Tier
        </label>
        <select
          name="tier"
          value={form.tier}
          onChange={handleChange}
          className="input w-full"
          disabled={loading}
        >
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary flex-1"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary flex-1 flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? <Loader size={16} className="animate-spin" /> : <Edit2 size={16} />}
          {loading ? 'Updating...' : 'Update Client'}
        </button>
      </div>
    </form>
  );
};

const DeleteConfirmModal = ({
  isOpen,
  clientName,
  onConfirm,
  onCancel,
  loading,
}: {
  isOpen: boolean;
  clientName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-900 rounded-xl border border-surface-800 w-full max-w-sm">
        <div className="p-6">
          <div className="flex gap-3 mb-4">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertCircle className="text-red-400" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white mb-1">Delete Client?</h3>
              <p className="text-sm text-surface-400">
                Are you sure you want to delete <strong>{clientName}</strong>? This action
                cannot be undone.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg mb-4">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="btn-danger flex-1 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ClientList() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState<'all' | ClientData['tier']>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [deletingClientName, setDeletingClientName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const debouncedSearch = useMemo(() => {
    let timeout: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setSearch(value);
      }, 300);
    };
  }, []);

  const fetchClients = useCallback(async (page = 1, searchVal = '', tierVal: 'all' | ClientData['tier'] = 'all') => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (searchVal) params.append('search', searchVal);
      if (tierVal !== 'all') params.append('tier', tierVal);

      const response = await api.get(`/admin/clients?${params.toString()}`);
      const data = response as ClientsResponse;

      setClients(data.clients);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients(1, search, tier);
  }, [search, tier, fetchClients]);

  const handleAddClient = async (formData: FormData) => {
    try {
      setSubmitting(true);
      await api.post('/admin/clients', formData);
      setShowAddModal(false);
      await fetchClients(pagination.page, search, tier);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClient = async (formData: Partial<FormData>) => {
    if (!editingClient) return;
    try {
      setSubmitting(true);
      await api.put(`/admin/clients/${editingClient.id}`, formData);
      setShowEditModal(false);
      setEditingClient(null);
      await fetchClients(pagination.page, search, tier);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!deletingClientId) return;
    try {
      setSubmitting(true);
      await api.delete(`/admin/clients/${deletingClientId}`);
      setShowDeleteModal(false);
      setDeletingClientId(null);
      setDeletingClientName(null);
      await fetchClients(pagination.page, search, tier);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchClients(newPage, search, tier);
  };

  const handleTierChange = (newTier: 'all' | ClientData['tier']) => {
    setTier(newTier);
  };

  const tierTabs: Array<{ label: string; value: 'all' | ClientData['tier'] }> = [
    { label: 'All', value: 'all' },
    { label: 'Free', value: 'free' },
    { label: 'Starter', value: 'starter' },
    { label: 'Pro', value: 'pro' },
    { label: 'Enterprise', value: 'enterprise' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">Manage your baker clients ({pagination.total})</p>
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setShowAddModal(true);
          }}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add New Client
        </button>
      </div>

      {/* Error State */}
      {error && !clients.length && (
        <div className="card flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle size={48} className="text-red-400 mb-4 opacity-50" />
          <p className="text-surface-300 font-medium mb-2">Failed to load clients</p>
          <p className="text-surface-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => fetchClients(1, search, tier)}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Search Bar */}
      {(clients.length > 0 || !loading) && (
        <>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500" size={18} />
            <input
              type="text"
              placeholder="Search by name, email, or bakery..."
              defaultValue={search}
              onChange={(e) => debouncedSearch(e.target.value)}
              className="input w-full pl-12"
            />
          </div>

          {/* Tier Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tierTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTierChange(tab.value)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  tier === tab.value
                    ? 'bg-brand-500 text-surface-950'
                    : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Client Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : clients.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onEdit={(c) => {
                      setEditingClient(c);
                      setShowEditModal(true);
                    }}
                    onDelete={(id, name) => {
                      setDeletingClientId(id);
                      setDeletingClientName(name);
                      setShowDeleteModal(true);
                    }}
                    onView={(id) => navigate(`/admin/clients/${id}`)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between gap-4 pt-6">
                  <p className="text-sm text-surface-400">
                    Page {pagination.page} of {pagination.pages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <Users size={48} className="text-surface-600 mb-4 opacity-50" />
              <p className="text-surface-300 font-medium mb-2">No clients found</p>
              <p className="text-surface-500 text-sm">
                {search || tier !== 'all' ? 'Try adjusting your filters' : 'Start by adding your first client'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <Modal
        isOpen={showAddModal}
        title="Add New Client"
        onClose={() => setShowAddModal(false)}
      >
        <AddClientForm
          onSubmit={handleAddClient}
          onCancel={() => setShowAddModal(false)}
          loading={submitting}
        />
      </Modal>

      <Modal
        isOpen={showEditModal}
        title="Edit Client"
        onClose={() => {
          setShowEditModal(false);
          setEditingClient(null);
        }}
      >
        {editingClient && (
          <EditClientForm
            client={editingClient}
            onSubmit={handleEditClient}
            onCancel={() => {
              setShowEditModal(false);
              setEditingClient(null);
            }}
            loading={submitting}
          />
        )}
      </Modal>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        clientName={deletingClientName || ''}
        onConfirm={handleDeleteClient}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeletingClientId(null);
          setDeletingClientName(null);
        }}
        loading={submitting}
      />
    </div>
  );
}
