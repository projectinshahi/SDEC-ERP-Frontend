'use client';

import Link from 'next/link';
import { Star, ArrowRight, CheckCircle2, Clock, Users } from 'lucide-react';

interface PerformanceStats {
  active: number;
  self_pending: number;
  manager_pending: number;
  completed: number;
}

interface PerformanceSummaryProps {
  stats?: PerformanceStats;
  loading?: boolean;
}

export function PerformanceSummary({ stats, loading = false }: PerformanceSummaryProps) {
  const data = stats ?? {
    active: 8,
    self_pending: 5,
    manager_pending: 3,
    completed: 12,
  };

  const totalAppraisals = data.active + data.completed;
  const completionPct = totalAppraisals > 0 ? Math.round((data.completed / totalAppraisals) * 100) : 0;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Star size={14} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Performance Summary</h2>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-9">Appraisal cycle progress</p>
        </div>
        <Link
          href="/dashboard/hr/performance"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline"
        >
          Manage <ArrowRight size={11} />
        </Link>
      </div>

      {/* Body */}
      <div className="flex-1 p-5 flex flex-col gap-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
            </div>
          </div>
        ) : (
          <>
            {/* Summary headline */}
            <div className="rounded-xl border border-violet-100 dark:border-violet-900/30 bg-violet-50/60 dark:bg-violet-950/15 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500 dark:text-violet-400 mb-1">Total Appraisals</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{totalAppraisals}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{data.active} active · {data.completed} completed</p>
            </div>

            {/* Completion bar */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Cycle Completion</span>
                <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">{completionPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>

            {/* Stage breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/60 dark:bg-amber-950/15 p-3">
                <div className="flex items-center gap-1 mb-1">
                  <Users size={11} className="text-amber-500" />
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Self Review</p>
                </div>
                <p className="text-xl font-black text-amber-700 dark:text-amber-400 tabular-nums">{data.self_pending}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Pending</p>
              </div>

              <div className="rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/60 dark:bg-rose-950/15 p-3">
                <div className="flex items-center gap-1 mb-1">
                  <Clock size={11} className="text-rose-500" />
                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">Mgr Review</p>
                </div>
                <p className="text-xl font-black text-rose-700 dark:text-rose-400 tabular-nums">{data.manager_pending}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Pending</p>
              </div>

              <div className="col-span-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/60 dark:bg-emerald-950/15 p-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Completed Reviews</span>
                </div>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">{data.completed}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
