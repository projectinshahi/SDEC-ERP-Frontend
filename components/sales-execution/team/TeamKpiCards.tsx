'use client';

/**
 * SE-028.1 — KPI summary tiles for the Manager Team Task view.
 *
 * Renders the headline counters (total / completed / pending / overdue /
 * blocked) plus an overall completion gauge. Overdue is toned red and blocked
 * amber to match the SE-028/029 dashboard highlight treatment.
 */

import {
  ListChecks,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  Loader2,
  Flame,
  Timer,
} from 'lucide-react';
import { Card } from '@/components/Card';
import { classNames } from '@/lib/utils';
import type { TeamTasksResponse } from '@/lib/types/salesExecution';

interface TeamKpiCardsProps {
  kpis: TeamTasksResponse['kpis'];
}

interface Tile {
  key: string;
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
  bgClass: string;
}

export function TeamKpiCards({ kpis }: TeamKpiCardsProps) {
  const tiles: Tile[] = [
    {
      key: 'total',
      label: 'Total Tasks',
      value: kpis.total,
      icon: ListChecks,
      iconClass: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      key: 'inProgress',
      label: 'In Progress',
      value: kpis.inProgress,
      icon: Loader2,
      iconClass: 'text-violet-600 dark:text-violet-400',
      bgClass: 'bg-violet-50 dark:bg-violet-950/30',
    },
    {
      key: 'completed',
      label: 'Completed',
      value: kpis.completed,
      icon: CheckCircle2,
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      key: 'pending',
      label: 'Pending',
      value: kpis.pending,
      icon: Clock,
      iconClass: 'text-sky-600 dark:text-sky-400',
      bgClass: 'bg-sky-50 dark:bg-sky-950/30',
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: kpis.overdue,
      icon: AlertTriangle,
      iconClass: 'text-rose-600 dark:text-rose-400',
      bgClass: 'bg-rose-50 dark:bg-rose-950/30',
    },
    {
      key: 'highPriority',
      label: 'High Priority',
      value: kpis.highPriority,
      icon: Flame,
      iconClass: 'text-orange-600 dark:text-orange-400',
      bgClass: 'bg-orange-50 dark:bg-orange-950/30',
    },
    {
      key: 'blocked',
      label: 'Blocked',
      value: kpis.blocked,
      icon: Ban,
      iconClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    },
  ];

  const pct = Math.max(0, Math.min(100, Math.round(kpis.completionRate)));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Card
            key={tile.key}
            variant="outlined"
            className="flex items-center gap-3 px-4 py-3.5"
          >
            <span
              className={classNames(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                tile.bgClass,
                tile.iconClass
              )}
            >
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-none text-gray-900 dark:text-gray-100">
                {tile.value}
              </p>
              <p className="mt-1 truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                {tile.label}
              </p>
            </div>
          </Card>
        );
      })}

      {/* Completion gauge */}
      <Card
        variant="outlined"
        className="col-span-2 flex items-center gap-4 px-4 py-3.5 sm:col-span-1"
      >
        <CompletionRing pct={pct} />
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none text-gray-900 dark:text-gray-100">
            {pct}%
          </p>
          <p className="mt-1 truncate text-xs font-medium text-gray-500 dark:text-gray-400">
            Completion Rate
          </p>
        </div>
      </Card>

      {/* Average completion time (days) over completed tasks */}
      <Card variant="outlined" className="flex items-center gap-3 px-4 py-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400">
          <Timer size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none text-gray-900 dark:text-gray-100">
            {kpis.avgCompletionDays > 0 ? `${kpis.avgCompletionDays}d` : '—'}
          </p>
          <p className="mt-1 truncate text-xs font-medium text-gray-500 dark:text-gray-400">
            Avg. Completion
          </p>
        </div>
      </Card>
    </div>
  );
}

/** Small SVG progress ring for the overall completion rate. */
function CompletionRing({ pct }: { pct: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const stroke =
    pct >= 75
      ? 'stroke-emerald-500'
      : pct >= 40
        ? 'stroke-amber-500'
        : 'stroke-rose-500';

  return (
    <svg
      className="h-12 w-12 shrink-0 -rotate-90"
      viewBox="0 0 44 44"
      aria-hidden="true"
    >
      <circle
        cx="22"
        cy="22"
        r={radius}
        strokeWidth="5"
        fill="none"
        className="stroke-gray-200 dark:stroke-gray-700"
      />
      <circle
        cx="22"
        cy="22"
        r={radius}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={classNames('transition-all duration-500', stroke)}
      />
    </svg>
  );
}
