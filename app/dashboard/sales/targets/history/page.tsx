'use client';

/**
 * SE-043.1 — Target History.
 *
 * Period-by-period history of a BDE's targets vs live-computed actuals, with
 * achievement badges and incentive earned. Read-only.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { History, Info, Trophy } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import type { BadgeVariant } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchTargetHistory } from '@/lib/api/bdeDashboard';
import { TARGET_TYPE_LABELS } from '@/lib/types/salesExecution';
import type { TargetHistoryEntry, PeriodType, TargetType } from '@/lib/types/salesExecution';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const count = (n: number) => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));

/** INR for revenue targets, plain count otherwise. */
function formatValue(value: number, type: TargetType): number | string {
  return type === 'revenue' ? inr(value) : count(value);
}

const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

function achievementBadge(pct: number): { variant: BadgeVariant; label: string } {
  const rounded = Math.round(pct || 0);
  let variant: BadgeVariant = 'danger';
  if (rounded >= 100) variant = 'success';
  else if (rounded >= 80) variant = 'info';
  else if (rounded >= 50) variant = 'warning';
  return { variant, label: `${rounded}%` };
}

function TargetHistoryPageInner() {
  const { toast } = useToast();
  const [history, setHistory] = useState<TargetHistoryEntry[]>([]);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchTargetHistory();
      setHistory(res.history ?? []);
      setNote(res.note ?? '');
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to load target history', 'error');
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    if (history.length === 0) return { periods: 0, met: 0, totalIncentive: 0 };
    let met = 0;
    let totalIncentive = 0;
    for (const e of history) {
      if ((e.achievementPct || 0) >= 100) met += 1;
      totalIncentive += e.incentiveEarned || 0;
    }
    return { periods: history.length, met, totalIncentive };
  }, [history]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales' },
              { label: 'Target History', href: '/dashboard/sales/targets/history' },
            ]}
          />
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Target History</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Period-by-period view of your targets, achievement and incentives earned.
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      {!isLoading && history.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="flex items-center gap-3 border border-gray-200 px-4 py-3 dark:border-gray-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
              <History size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-tight text-gray-900 dark:text-gray-100">{summary.periods}</p>
              <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">Periods Tracked</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 border border-gray-200 px-4 py-3 dark:border-gray-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300">
              <Trophy size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-tight text-gray-900 dark:text-gray-100">{summary.met}</p>
              <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">Targets Met (100%+)</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 border border-gray-200 px-4 py-3 dark:border-gray-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300">
              <Trophy size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-tight text-gray-900 dark:text-gray-100">{inr(summary.totalIncentive)}</p>
              <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">Total Incentive Earned</p>
            </div>
          </Card>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <EmptyState
          icon={<History size={32} />}
          title="No target history available."
          description="Once targets are set for past periods, their achievement and incentives will appear here."
        />
      ) : (
        <Card className="overflow-hidden border border-gray-200 p-0 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Target</th>
                  <th className="px-4 py-3 text-right">Actual</th>
                  <th className="px-4 py-3 text-center">Achievement</th>
                  <th className="px-4 py-3 text-right">Incentive Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {history.map((entry) => {
                  const badge = achievementBadge(entry.achievementPct);
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        <span>{entry.period}</span>
                        <span className="ml-2 text-xs font-normal text-gray-400">{PERIOD_TYPE_LABELS[entry.periodType]}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{TARGET_TYPE_LABELS[entry.type]}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-100">
                        {formatValue(entry.target, entry.type)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-100">
                        {formatValue(entry.actual, entry.type)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        {inr(entry.incentiveEarned)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {note && (
            <p className="flex items-start gap-1.5 border-t border-gray-100 px-4 py-3 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-500">
              <Info size={13} className="mt-0.5 shrink-0" />
              {note}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

export default function TargetHistoryPage() {
  return (
    <PermissionPageGuard module="sales">
      <TargetHistoryPageInner />
    </PermissionPageGuard>
  );
}
