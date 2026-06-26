'use client';

import { Target, TrendingUp, Wallet, Gift } from 'lucide-react';
import { Card } from '@/components/Card';
import { TargetStatusBadge } from '@/components/sales-execution/targetShared';
import { TARGET_TYPE_LABELS } from '@/lib/types/salesExecution';
import type { TargetProgress } from '@/lib/types/salesExecution';

interface TargetProgressCardProps {
  /**
   * Read-only widget. Targets are created/edited ONLY in the Targets module
   * (/dashboard/sales/targets) — the BDE dashboard just displays the assigned one.
   */
  target: TargetProgress;
}

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const count = (n: number) => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));

/**
 * Target / achievement / remaining with a capped-visual progress bar (SE-041).
 *
 * Formats values by target type (INR for revenue, plain counts otherwise),
 * surfaces incentive earned, supports 100%+ achievement, and renders an explicit
 * empty state when no target is set.
 */
export function TargetProgressCard({ target }: TargetProgressCardProps) {
  const isRevenue = (target.type ?? 'revenue') === 'revenue';
  const fmt = isRevenue ? inr : count;
  const typeLabel = TARGET_TYPE_LABELS[target.type ?? 'revenue'];

  const pct = Math.round(target.achievementPct || 0);
  const barWidth = Math.min(100, Math.max(0, pct));
  const reached = target.reached ?? pct >= 100;
  const incentive = target.incentiveEarned ?? 0;
  const hasTarget = (target.hasTarget ?? target.target > 0) && target.target > 0;

  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 shrink-0">
            <Target size={20} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{typeLabel} Target</h3>
            <p className="text-xs text-gray-400">{target.period}</p>
          </div>
        </div>
        {hasTarget && target.status && <TargetStatusBadge status={target.status} />}
      </div>

      {!hasTarget ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/30 px-4 py-8 text-center">
          <Target size={28} className="text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-200">No revenue target has been assigned.</p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Target</p>
              <p className="mt-1 text-base font-bold tabular-nums text-gray-900 dark:text-white">{fmt(target.target)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-3">
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Achieved</p>
              <p className="mt-1 text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{fmt(target.achievement)}</p>
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-3">
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Remaining</p>
              <p className="mt-1 text-base font-bold tabular-nums text-amber-700 dark:text-amber-300">
                {fmt(Math.max(0, target.remaining))}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400">
                {reached ? <TrendingUp size={13} className="text-emerald-500" /> : <Wallet size={13} />}
                Achievement
              </span>
              <span className={`font-bold tabular-nums ${reached ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                {pct}%
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ${reached ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>

          {incentive > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <Gift size={14} /> Incentive
              </span>
              <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{inr(incentive)}</span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
