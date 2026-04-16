import React from 'react';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card text-center py-12 px-6">
      {/* Icon */}
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center text-surface-500">
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>

      {/* Description */}
      <p className="text-sm text-surface-400 mb-6 max-w-sm mx-auto">{description}</p>

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary inline-flex items-center gap-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
