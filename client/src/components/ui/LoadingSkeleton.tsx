import React from 'react';

export function CardSkeleton() {
  return (
    <div className="card animate-pulse space-y-4">
      <div className="h-4 bg-surface-800 rounded w-3/4"></div>
      <div className="space-y-3">
        <div className="h-3 bg-surface-800 rounded"></div>
        <div className="h-3 bg-surface-800 rounded w-5/6"></div>
        <div className="h-3 bg-surface-800 rounded w-4/6"></div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="p-4 bg-surface-900 rounded-lg border border-surface-800 animate-pulse">
          <div className="flex gap-4">
            <div className="h-4 bg-surface-800 rounded flex-1"></div>
            <div className="h-4 bg-surface-800 rounded w-1/4"></div>
            <div className="h-4 bg-surface-800 rounded w-1/4"></div>
            <div className="h-4 bg-surface-800 rounded w-1/6"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card animate-pulse">
      <div className="h-4 bg-surface-800 rounded w-3/4 mb-3"></div>
      <div className="h-8 bg-surface-800 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-surface-800 rounded w-2/3"></div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-surface-800 rounded w-1/4 animate-pulse"></div>
        <div className="h-4 bg-surface-800 rounded w-1/3 animate-pulse"></div>
      </div>

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="card space-y-4 animate-pulse">
        <div className="h-6 bg-surface-800 rounded w-1/4"></div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-surface-800 rounded w-full"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
