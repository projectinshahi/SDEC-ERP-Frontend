'use client';

import { LeaveStatus } from '@/lib/hr/leave.types';

interface LeaveStatusBadgeProps {
  status: LeaveStatus;
}

const STATUS_CONFIGS: Record<LeaveStatus, { label: string; bg: string; text: string; dot: string; border: string }> = {
  Pending: {
    label: 'Pending',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
    border: 'border-amber-200/50 dark:border-amber-900/30',
  },
  Approved: {
    label: 'Approved',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200/50 dark:border-emerald-900/30',
  },
  Rejected: {
    label: 'Rejected',
    bg: 'bg-rose-50 dark:bg-rose-950/20',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
    border: 'border-rose-200/50 dark:border-rose-900/30',
  },
  Cancelled: {
    label: 'Cancelled',
    bg: 'bg-gray-100 dark:bg-gray-800/40',
    text: 'text-gray-500 dark:text-gray-400',
    dot: 'bg-gray-400',
    border: 'border-gray-200/50 dark:border-gray-700/35',
  },
};

export function LeaveStatusBadge({ status }: LeaveStatusBadgeProps) {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.Pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} shrink-0`} />
      {config.label}
    </span>
  );
}
