'use client';

import { LucideIcon, RefreshCw, AlertCircle, Inbox } from 'lucide-react';
import { Card, CardBody } from '@/components/Card';
import { StatCardSkeleton } from '../ui/Skeleton';

export interface StatCardProps {
  label: string;
  value?: string | number | null;
  change?: string;
  changeText?: string;
  icon: LucideIcon;
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'primary';
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  onRetry?: () => void;
}

/**
 * Premium dashboard statistical metric card.
 * Handles loading skeleton, empty, error (with retry), and normal presentation states.
 */
export function StatCard({
  label,
  value,
  change,
  changeText = 'from last month',
  icon: Icon,
  variant = 'primary',
  isLoading = false,
  isError = false,
  isEmpty = false,
  onRetry,
}: StatCardProps) {
  // 1. Loading State - render skeleton loader
  if (isLoading) {
    return <StatCardSkeleton />;
  }

  // Define colors based on the design system variant
  const variantStyles = {
    primary: {
      bg: 'bg-indigo-50 dark:bg-indigo-500/15',
      text: 'text-indigo-600 dark:text-indigo-400',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/15',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-500/15',
      text: 'text-blue-600 dark:text-blue-400',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-500/15',
      text: 'text-amber-600 dark:text-amber-400',
    },
    danger: {
      bg: 'bg-rose-50 dark:bg-rose-500/15',
      text: 'text-rose-600 dark:text-rose-400',
    },
  };

  const style = variantStyles[variant] || variantStyles.primary;

  // Determine if content is empty (null, undefined, or explicitly marked)
  const isDataEmpty = isEmpty || value === null || value === undefined;

  return (
    <Card variant="outlined" className="h-full transition-all duration-200 hover:shadow-md !bg-white dark:!bg-gray-900 !border-gray-200 dark:!border-gray-800">
      <CardBody className="p-6">
        <div className="flex items-center justify-between h-full">
          
          {/* Main textual metrics panel */}
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 whitespace-normal mb-1">
              {label}
            </p>

            {/* 2. Error State */}
            {isError ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 font-medium">
                  <AlertCircle size={15} className="shrink-0" />
                  <span className="text-xs truncate">Failed to load data</span>
                </div>
                {onRetry && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onRetry();
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:underline focus:outline-none transition-colors"
                  >
                    <RefreshCw size={11} className="animate-spin-hover" />
                    <span>Retry API</span>
                  </button>
                )}
              </div>
            ) : isDataEmpty ? (
              /* 3. Empty State */
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 font-medium">
                  <Inbox size={15} className="shrink-0" />
                  <span className="text-xs">No data available</span>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Wait for next sync</p>
              </div>
            ) : (
              /* 4. Normal Presentation State */
              <>
                <p className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 leading-tight">
                  {value}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs truncate">
                  {change && (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {change}
                    </span>
                  )}
                  <span className="text-gray-500 dark:text-gray-400 font-normal">
                    {changeText}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Right Icon indicator box */}
          <div className={`w-12 h-12 ${style.bg} rounded-2xl flex items-center justify-center shrink-0`}>
            <Icon size={22} className={style.text} />
          </div>

        </div>
      </CardBody>
    </Card>
  );
}
