'use client';

import { type ReactNode } from 'react';
import { classNames } from '@/lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) => (
  <div className={classNames('rounded-3xl border border-dashed border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900/80 p-10 text-center shadow-sm', className)}>
    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-300">
      {icon}
    </div>
    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs mx-auto">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
