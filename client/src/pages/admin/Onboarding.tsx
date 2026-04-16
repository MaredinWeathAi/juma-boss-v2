'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import api from '../../lib/api';

interface OnboardingStep {
  step: string;
  completed: number;
  completed_at: string | null;
}

interface BakerOnboarding {
  bakery_id: string;
  bakery_name: string;
  owner_name: string;
  tier: string;
  created_at: string;
  steps: OnboardingStep[];
  completion_pct: number;
}

interface OnboardingData {
  pipeline: BakerOnboarding[];
}

const stepLabels: Record<string, string> = {
  profile_setup: 'Profile Setup',
  add_products: 'Add Products',
  first_product: 'First Product',
  add_customers: 'Add Customers',
  first_customer: 'First Customer',
  create_first_order: 'First Order',
  first_order: 'First Order',
  team_setup: 'Team Setup',
  payment_setup: 'Payment Setup',
};

const StatCard = ({
  label,
  value,
  subtext,
  loading,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <div className="card">
        <div className="flex-1">
          <div className="h-4 w-24 bg-surface-800 rounded mb-2 animate-pulse" />
          <div className="h-8 w-32 bg-surface-800 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="card hover:shadow-lg transition-shadow duration-300">
      <p className="text-surface-400 text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
      {subtext && <p className="text-xs text-surface-400 mt-1">{subtext}</p>}
    </div>
  );
};

export default function Onboarding() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOnboarding = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/admin/onboarding');
        setData(response);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load onboarding data'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOnboarding();
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  if (error && !data) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Onboarding Pipeline</h1>
          <p className="page-subtitle">Track customer onboarding progress</p>
        </div>
        <div className="card flex flex-col items-center justify-center py-16">
          <div className="text-surface-400 mb-4">
            <TrendingUp size={48} className="opacity-50" />
          </div>
          <p className="text-surface-300 font-medium mb-2">Unable to load onboarding data</p>
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

  const pipeline = data?.pipeline || [];
  const totalInOnboarding = pipeline.length;
  const avgCompletion =
    pipeline.length > 0
      ? Math.round(pipeline.reduce((sum, p) => sum + p.completion_pct, 0) / pipeline.length)
      : 0;
  const fullyCompleted = pipeline.filter((p) => p.completion_pct === 100).length;

  // Sort by completion percentage (least complete first)
  const sortedPipeline = [...pipeline].sort((a, b) => a.completion_pct - b.completion_pct);

  const getProgressColor = (pct: number) => {
    if (pct < 33) return 'bg-red-500';
    if (pct < 66) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getProgressBgColor = (pct: number) => {
    if (pct < 33) return 'bg-red-500/10';
    if (pct < 66) return 'bg-yellow-500/10';
    return 'bg-emerald-500/10';
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'bg-surface-700 text-surface-300';
      case 'starter':
        return 'bg-blue-500/20 text-blue-400';
      case 'pro':
        return 'bg-brand-500/20 text-brand-400';
      case 'enterprise':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-surface-700 text-surface-300';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">Onboarding Pipeline</h1>
        <p className="page-subtitle">Track baker onboarding progress and identify at-risk accounts</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="In Onboarding"
          value={totalInOnboarding}
          subtext="bakers in pipeline"
          loading={loading}
        />
        <StatCard
          label="Avg Completion"
          value={`${avgCompletion}%`}
          subtext="across all bakers"
          loading={loading}
        />
        <StatCard
          label="Fully Completed"
          value={fullyCompleted}
          subtext={`${totalInOnboarding > 0 ? ((fullyCompleted / totalInOnboarding) * 100).toFixed(0) : 0}% of pipeline`}
          loading={loading}
        />
      </div>

      {/* Pipeline Cards */}
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card">
                <div className="h-48 bg-surface-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : sortedPipeline.length > 0 ? (
          sortedPipeline.map((baker) => (
            <div key={baker.bakery_id} className="card hover:shadow-lg transition-shadow duration-300">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-surface-800">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{baker.owner_name}</h3>
                  <p className="text-sm text-surface-400 mt-1 truncate">{baker.bakery_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTierColor(baker.tier)} capitalize`}
                  >
                    {baker.tier}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-surface-300">Completion</span>
                  <span className="text-sm font-bold text-white">{baker.completion_pct}%</span>
                </div>
                <div
                  className={`w-full h-3 rounded-full ${getProgressBgColor(baker.completion_pct)}`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getProgressColor(baker.completion_pct)}`}
                    style={{ width: `${baker.completion_pct}%` }}
                  />
                </div>
              </div>

              {/* Steps Checklist */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {baker.steps.map((step) => (
                  <div key={step.step} className="flex items-center gap-3">
                    {step.completed ? (
                      <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle size={20} className="text-surface-600 flex-shrink-0" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        step.completed ? 'text-surface-300' : 'text-surface-500'
                      }`}
                    >
                      {stepLabels[step.step] || step.step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="card flex flex-col items-center justify-center py-16">
            <TrendingUp size={48} className="text-surface-600 mb-4" />
            <p className="text-surface-300 font-medium">No bakers in onboarding</p>
          </div>
        )}
      </div>
    </div>
  );
}
