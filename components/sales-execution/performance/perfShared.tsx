'use client';

/**
 * Shared primitives for the Manager + Executive performance dashboards.
 * KPI tiles, attainment % badge/bar helpers and INR formatting live here so
 * both pages stay lightweight and consistent.
 */

import type { ReactNode } from 'react';
import { Badge, type BadgeVariant } from '@/components/Badge';
import { Card } from '@/components/Card';
import { classNames } from '@/lib/utils';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Format a number as INR with no decimals (₹1,23,456). */
export function formatINR(n: number | null | undefined): string {
  return inrFormatter.format(n || 0);
}

/** Attainment % → Badge variant: <50 danger, 50–80 warning, 80–100 info, >=100 success. */
export function attainmentVariant(pct: number): BadgeVariant {
  if (pct >= 100) return 'success';
  if (pct >= 80) return 'info';
  if (pct >= 50) return 'warning';
  return 'danger';
}

/** Attainment % → bar fill color (matches badge tone). */
export function attainmentBarClass(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500';
  if (pct >= 80) return 'bg-blue-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

/** Attainment % → recharts bar hex (matches badge tone). */
export function attainmentHex(pct: number): string {
  if (pct >= 100) return '#10b981';
  if (pct >= 80) return '#3b82f6';
  if (pct >= 50) return '#f59e0b';
  return '#f43f5e';
}

export function AttainmentBadge({ pct }: { pct: number }) {
  return <Badge variant={attainmentVariant(pct)}>{Math.round(pct || 0)}%</Badge>;
}

/** A thin progress bar visualising attainment %, clamped to 100% width. */
export function AttainmentBar({ pct, className }: { pct: number; className?: string }) {
  const width = Math.max(0, Math.min(100, Math.round(pct || 0)));
  return (
    <div className={classNames('h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800', className)}>
      <div className={classNames('h-full rounded-full transition-all', attainmentBarClass(pct))} style={{ width: `${width}%` }} />
    </div>
  );
}

export type PerfTone = 'indigo' | 'blue' | 'rose' | 'amber' | 'emerald' | 'violet';

const TONE_STYLES: Record<PerfTone, string> = {
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300',
};

/** Headline KPI card — big value, label, optional sub-line + icon. */
export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: PerfTone;
}) {
  return (
    <Card className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{value}</p>
          {sub != null && <p className="mt-1 text-xs font-medium text-gray-400 dark:text-gray-500">{sub}</p>}
        </div>
        <div className={classNames('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', TONE_STYLES[tone])}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}

/** Section heading with an icon chip. */
export function SectionHeader({
  icon: Icon,
  title,
  tone = 'indigo',
  action,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  tone?: PerfTone;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className={classNames('flex h-9 w-9 items-center justify-center rounded-xl', TONE_STYLES[tone])}>
          <Icon size={18} />
        </span>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {action}
    </div>
  );
}

/** Format a YYYY-MM period string into "Mon YYYY"; falls back to raw value. */
export function formatPeriod(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period || '');
  if (!m) return period || '';
  const date = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
}
