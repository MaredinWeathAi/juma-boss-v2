'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '../../lib/api';

interface AuditEntry {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  created_at: string;
  user_name: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface AuditLogData {
  entries: AuditEntry[];
  pagination: PaginationInfo;
}

const actionConfig: Record<string, { bg: string; text: string; label: string }> = {
  client_created: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Created' },
  client_updated: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Updated' },
  client_deleted: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Deleted' },
  subscription_changed: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Updated' },
  user_impersonated: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Impersonate' },
  payment_processed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Payment' },
  announcement_created: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Created' },
};

const RelativeTime = ({ dateString }: { dateString: string }) => {
  const [relativeTime, setRelativeTime] = useState('');

  useEffect(() => {
    const getRelativeTime = () => {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (seconds < 60) {
        return 'just now';
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
      } else if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
      } else if (seconds < 604800) {
        const days = Math.floor(seconds / 86400);
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
      } else {
        const weeks = Math.floor(seconds / 604800);
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
      }
    };

    setRelativeTime(getRelativeTime());

    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime());
    }, 30000);

    return () => clearInterval(interval);
  }, [dateString]);

  return (
    <div className="flex items-center gap-1 text-surface-400">
      <Clock size={14} />
      <span className="text-xs">{relativeTime}</span>
    </div>
  );
};

const ActionBadge = ({ action }: { action: string }) => {
  const config = actionConfig[action] || {
    bg: 'bg-surface-700',
    text: 'text-surface-400',
    label: action.replace('_', ' '),
  };

  const label =
    config.label ||
    action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {label}
    </span>
  );
};

export default function AuditLog() {
  const [data, setData] = useState<AuditLogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterAction, setFilterAction] = useState<string>('all');

  useEffect(() => {
    fetchAuditLog(currentPage);
  }, [currentPage]);

  const fetchAuditLog = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/admin/audit-log?page=${page}&limit=50`);
      setData(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load audit log'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchAuditLog(currentPage);
  };

  if (error && !data) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">System activity and security events</p>
        </div>
        <div className="card flex flex-col items-center justify-center py-16">
          <div className="text-surface-400 mb-4">
            <Clock size={48} className="opacity-50" />
          </div>
          <p className="text-surface-300 font-medium mb-2">Unable to load audit log</p>
          <p className="text-surface-500 text-sm mb-6">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors"
          >
            <RotateCcw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const entries = data?.entries || [];
  const pagination = data?.pagination || {
    page: 1,
    limit: 50,
    total: 0,
    pages: 1,
  };

  // Get unique actions for filter
  const uniqueActions = ['all', ...new Set(entries.map((e) => e.action))];

  // Filter entries
  let filteredEntries = entries;
  if (filterAction !== 'all') {
    filteredEntries = entries.filter((e) => e.action === filterAction);
  }

  const canGoBack = pagination.page > 1;
  const canGoForward = pagination.page < pagination.pages;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">Audit Log</h1>
        <p className="page-subtitle">System activity and security events</p>
      </div>

      {/* Filter Section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <label className="text-sm font-medium text-white">Filter by Action:</label>
        <div className="relative">
          <select
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setCurrentPage(1);
            }}
            className="appearance-none bg-surface-800 border border-surface-700 rounded-lg px-4 py-2 text-white pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {action === 'all'
                  ? 'All Actions'
                  : action
                      .split('_')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-surface-800 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredEntries.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="text-left py-3 px-3 text-surface-400 font-medium">Time</th>
                    <th className="text-left py-3 px-3 text-surface-400 font-medium">Admin User</th>
                    <th className="text-left py-3 px-3 text-surface-400 font-medium">Action</th>
                    <th className="text-left py-3 px-3 text-surface-400 font-medium">Details</th>
                    <th className="text-left py-3 px-3 text-surface-400 font-medium">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <RelativeTime dateString={entry.created_at} />
                      </td>
                      <td className="py-3 px-3 text-white font-medium">{entry.user_name}</td>
                      <td className="py-3 px-3">
                        <ActionBadge action={entry.action} />
                      </td>
                      <td className="py-3 px-3 text-surface-300 text-xs max-w-xs truncate">
                        {entry.details}
                      </td>
                      <td className="py-3 px-3 text-surface-400 text-xs">
                        {entry.target_type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-6 pt-6 border-t border-surface-800 flex items-center justify-between">
                <p className="text-sm text-surface-400">
                  Page {pagination.page} of {pagination.pages}
                  <span className="ml-3">
                    {filteredEntries.length} entries (Total: {pagination.total})
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={!canGoBack}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-surface-800 hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                    disabled={!canGoForward}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-surface-800 hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <Clock size={48} className="text-surface-600 mb-4" />
            <p className="text-surface-300 font-medium">No audit entries found</p>
          </div>
        )}
      </div>
    </div>
  );
}
