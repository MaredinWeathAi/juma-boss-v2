'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  X,
  RotateCcw,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import api from '../../lib/api';

interface Announcement {
  id: string;
  title: string;
  message: string;
  target_tiers: string;
  is_active: number;
  created_at: string;
}

interface AnnouncementsData {
  announcements: Announcement[];
}

const tierOptions = ['free', 'starter', 'pro', 'enterprise'];

export default function Announcements() {
  const [data, setData] = useState<AnnouncementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_tiers: {
      all: true,
      free: false,
      starter: false,
      pro: false,
      enterprise: false,
    },
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/announcements');
      setData(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load announcements'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchAnnouncements();
  };

  const handleTierChange = (tier: string) => {
    if (tier === 'all') {
      setFormData({
        ...formData,
        target_tiers: {
          all: !formData.target_tiers.all,
          free: false,
          starter: false,
          pro: false,
          enterprise: false,
        },
      });
    } else {
      const newTiers = {
        ...formData.target_tiers,
        [tier]: !formData.target_tiers[tier as keyof typeof formData.target_tiers],
      };
      newTiers.all = false;
      setFormData({
        ...formData,
        target_tiers: newTiers,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      const targetTiers = formData.target_tiers.all
        ? 'all'
        : tierOptions
            .filter((tier) => formData.target_tiers[tier as keyof typeof formData.target_tiers])
            .join(',');

      await api.post('/admin/announcements', {
        title: formData.title,
        message: formData.message,
        target_tiers: targetTiers,
      });

      setFormData({
        title: '',
        message: '',
        target_tiers: {
          all: true,
          free: false,
          starter: false,
          pro: false,
          enterprise: false,
        },
      });
      setShowModal(false);
      await fetchAnnouncements();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      await api.delete(`/admin/announcements/${id}`);
      await fetchAnnouncements();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete announcement');
    }
  };

  const handleToggleActive = async (id: string, currentActive: number) => {
    try {
      await api.put(`/admin/announcements/${id}`, {
        is_active: currentActive === 1 ? 0 : 1,
      });
      await fetchAnnouncements();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update announcement');
    }
  };

  const announcements = data?.announcements || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTargetLabel = (target: string) => {
    if (target === 'all') return 'All Tiers';
    return target
      .split(',')
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
      .join(', ');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Communicate with bakers across the platform</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors w-full sm:w-auto justify-center sm:justify-start"
        >
          <Plus size={18} />
          New Announcement
        </button>
      </div>

      {/* Error State */}
      {error && !data && (
        <div className="card flex flex-col items-center justify-center py-16">
          <div className="text-surface-400 mb-4">
            <MessageSquare size={48} className="opacity-50" />
          </div>
          <p className="text-surface-300 font-medium mb-2">Unable to load announcements</p>
          <p className="text-surface-500 text-sm mb-6">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors"
          >
            <RotateCcw size={16} />
            Try Again
          </button>
        </div>
      )}

      {/* Announcements List */}
      {!error && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card h-32 bg-surface-800 rounded animate-pulse" />
              ))}
            </div>
          ) : announcements.length > 0 ? (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`card border-l-4 transition-all duration-300 hover:shadow-lg ${
                  announcement.is_active
                    ? 'border-l-brand-500 bg-surface-900/50'
                    : 'border-l-surface-600 opacity-75'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white truncate mb-2">
                      {announcement.title}
                    </h3>
                    <p className="text-surface-400 text-sm mb-3 line-clamp-2">
                      {announcement.message}
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-xs text-surface-500">
                        {formatDate(announcement.created_at)}
                      </span>
                      <span className="text-xs font-medium text-surface-400">
                        {getTargetLabel(announcement.target_tiers)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleToggleActive(announcement.id, announcement.is_active)
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        announcement.is_active
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                          : 'bg-surface-700 text-surface-400 hover:bg-surface-600'
                      }`}
                    >
                      {announcement.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-xs font-medium"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="card flex flex-col items-center justify-center py-16">
              <MessageSquare size={48} className="text-surface-600 mb-4" />
              <p className="text-surface-300 font-medium">No announcements yet</p>
              <p className="text-surface-500 text-sm mt-1">
                Create one to communicate with your bakers
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-surface-800">
              <h2 className="text-lg font-bold text-white">New Announcement</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-surface-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-surface-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Announcement title"
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-2 text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Announcement message"
                  rows={5}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-2 text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              {/* Target Tiers */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  Target Audience
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.target_tiers.all}
                      onChange={() => handleTierChange('all')}
                      className="w-4 h-4 rounded bg-surface-800 border-surface-600 text-brand-500 focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="text-sm text-surface-300">All Tiers</span>
                  </label>

                  {!formData.target_tiers.all && (
                    <>
                      {tierOptions.map((tier) => (
                        <label
                          key={tier}
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={
                              formData.target_tiers[tier as keyof typeof formData.target_tiers]
                            }
                            onChange={() => handleTierChange(tier)}
                            className="w-4 h-4 rounded bg-surface-800 border-surface-600 text-brand-500 focus:ring-2 focus:ring-brand-500"
                          />
                          <span className="text-sm text-surface-300 capitalize">{tier}</span>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-6 border-t border-surface-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
