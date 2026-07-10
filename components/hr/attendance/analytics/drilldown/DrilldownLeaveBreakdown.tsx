'use client';

import { Umbrella } from 'lucide-react';
import type { EmployeeLeaveBreakdown } from '@/lib/hr/attendanceAnalytics.types';
import { prettyLabel } from './statusMeta';

function StatusPill({ label, count, tone }: { label: string; count: number; tone: string }) {
  if (count === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {count} {label}
    </span>
  );
}

export function DrilldownLeaveBreakdown({ data }: { data: EmployeeLeaveBreakdown }) {
  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800/60">
          <Umbrella size={22} />
        </div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">No leave records</p>
        <p className="mt-1 text-xs text-gray-400">No leave requests overlap the selected period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Requests</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{data.totalRequests}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Days</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{data.totalDays}</p>
        </div>
      </div>

      {/* Per leave type */}
      <ul className="space-y-2">
        {data.items.map((it) => (
          <li
            key={it.leaveType}
            className="rounded-xl border border-gray-100 bg-white p-3.5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{prettyLabel(it.leaveType)}</span>
              <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                {it.days} <span className="text-xs font-medium text-gray-400">day{it.days === 1 ? '' : 's'}</span>
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-gray-400">{it.requests} request{it.requests === 1 ? '' : 's'}:</span>
              <StatusPill label="approved" count={it.approved} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" />
              <StatusPill label="pending" count={it.pending} tone="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" />
              <StatusPill label="rejected" count={it.rejected} tone="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
