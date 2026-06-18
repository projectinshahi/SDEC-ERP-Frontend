'use client';

/**
 * Shared, self-contained helpers for the Sales report analysis pages
 * (SE-036 Lost Deal Analysis & SE-033 Lead Source Report).
 *
 * Owned by the sales-reports-analysis task — do NOT use for other reports.
 */

import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/ui/SelectField';
import type { ReportWindow } from '@/lib/api/salesReports';
import type { ReportExportFormat, ReportExportType } from '@/lib/types/salesReports';

// ── Formatting ───────────────────────────────────────────────────────────────
const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(n: number | null | undefined): string {
  return inrFormatter.format(n || 0);
}

export function formatPct(n: number | null | undefined, digits = 1): string {
  return `${(n || 0).toFixed(digits)}%`;
}

// Chart palette — reused across donut / bar charts.
export const CHART_COLORS = [
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#64748b', // slate
];

// ── Period filter ──────────────────────────────────────────────────────────—
export type PeriodChoice = 'month' | 'quarter' | 'year' | 'all';

export const PERIOD_OPTIONS: { value: PeriodChoice; label: string }[] = [
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

/** Build the API ReportWindow from a period choice using the current date. */
export function buildWindow(choice: PeriodChoice): ReportWindow | undefined {
  const now = new Date();
  const year = now.getFullYear();
  switch (choice) {
    case 'month': {
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return { period: `${year}-${month}`, periodType: 'monthly' };
    }
    case 'quarter': {
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      return { period: `${year}-Q${quarter}`, periodType: 'quarterly' };
    }
    case 'year':
      return { period: `${year}`, periodType: 'yearly' };
    case 'all':
    default:
      return undefined;
  }
}

/** Hook owning the period selection + derived window. */
export function usePeriodWindow(initial: PeriodChoice = 'quarter') {
  const [period, setPeriod] = useState<PeriodChoice>(initial);
  const window = useMemo(() => buildWindow(period), [period]);
  return { period, setPeriod, window };
}

// ── Report toolbar (period + export + print) ─────────────────────────────────
interface ReportToolbarProps {
  period: PeriodChoice;
  onPeriodChange: (p: PeriodChoice) => void;
  onExport: (format: ReportExportFormat) => void;
  exporting: boolean;
  disabled?: boolean;
}

/** Period filter + Excel/CSV export + Print toolbar. `print:hidden` so it
 * is excluded from the printed PDF output. */
export function ReportToolbar({
  period,
  onPeriodChange,
  onExport,
  exporting,
  disabled = false,
}: ReportToolbarProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
      <div className="w-44">
        <SelectField
          id="report-period"
          label="Period"
          value={period}
          onChange={(v) => onPeriodChange(v as PeriodChoice)}
          options={PERIOD_OPTIONS}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onExport('xlsx')}
          disabled={disabled || exporting}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Excel
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onExport('csv')}
          disabled={disabled || exporting}
        >
          <Download className="w-4 h-4" />
          CSV
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.print()}
          disabled={disabled}
        >
          <Printer className="w-4 h-4" />
          Print / PDF
        </Button>
      </div>
    </div>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: string;
  sub?: string;
}

export function KpiCard({ label, value, icon, accent = 'text-indigo-600 dark:text-indigo-400', sub }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
        <span className={accent}>{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Section heading ──────────────────────────────────────────────────────────
export function SectionTitle({ icon, title, caption }: { icon: React.ReactNode; title: string; caption?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
        {icon}
      </span>
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
        {caption && <p className="text-xs text-gray-500 dark:text-gray-400">{caption}</p>}
      </div>
    </div>
  );
}

// ── Report page skeleton ─────────────────────────────────────────────────────
export function ReportSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between gap-3">
        <div className="h-10 w-44 rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-9 w-64 rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-72 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}
