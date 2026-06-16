'use client';

import { Target, TrendingUp, Wallet, PencilLine } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import type { TargetProgress } from '@/lib/types/salesExecution';

interface TargetProgressCardProps {
  target: TargetProgress;
  canEdit: boolean;
  onEdit: () => void;
}

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

/**
 * Monthly target / achievement / remaining with a capped-visual progress bar.
 */
export function TargetProgressCard({ target, canEdit, onEdit }: TargetProgressCardProps) {
  const pct = Math.round(target.achievementPct || 0);
  const barWidth = Math.min(100, Math.max(0, pct));
  const reached = pct >= 100;

  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 shrink-0">
            <Target size={20} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sales Target</h3>
            <p className="text-xs text-gray-400">{target.period}</p>
          </div>
        </div>
        {canEdit && (
          <Button variant="secondary" size="sm" onClick={onEdit} className="shrink-0">
            <PencilLine size={15} /> Set Target
          </Button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Target</p>
          <p className="mt-1 text-base font-bold tabular-nums text-gray-900 dark:text-white">{inr(target.target)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-3">
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Achieved</p>
          <p className="mt-1 text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{inr(target.achievement)}</p>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-3">
          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Remaining</p>
          <p className="mt-1 text-base font-bold tabular-nums text-amber-700 dark:text-amber-300">
            {inr(Math.max(0, target.remaining))}
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
    </Card>
  );
}
