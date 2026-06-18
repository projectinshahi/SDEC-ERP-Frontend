'use client';

/**
 * Self-contained helpers for the SE-044.2 Team Target Dashboard and the
 * Executive Analytics Dashboard. R/Y/G band rendering (driven by the server
 * `status` field — NEVER recompute bands here), an INR formatter and a shared
 * Export / Print toolbar.
 */

import { useState, type ReactNode } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { Button } from '@/components/Button';
import { classNames } from '@/lib/utils';
import type { TargetBand, ReportExportType, ReportExportFormat } from '@/lib/types/salesReports';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Format a number as INR with no decimals (₹1,23,456). */
export function formatINR(n: number | null | undefined): string {
  return inrFormatter.format(n || 0);
}

/** Format a YYYY-MM period string into "Month YYYY"; falls back to raw value. */
export function formatPeriod(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period || '');
  if (!m) return period || '';
  const date = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

// ── R/Y/G band visuals — driven purely by the server `status` ────────────────

export const BAND_LABEL: Record<TargetBand, string> = {
  green: 'Target Achieved',
  yellow: 'Near Target',
  red: 'Behind',
  neutral: 'No Target',
};

/** Solid dot colour per band. */
export const BAND_DOT: Record<TargetBand, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-rose-500',
  neutral: 'bg-gray-400',
};

/** Badge chip styling per band (light + dark). */
const BAND_BADGE: Record<TargetBand, string> = {
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  yellow: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  red: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

/** Progress-bar fill colour per band. */
const BAND_BAR: Record<TargetBand, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-rose-500',
  neutral: 'bg-gray-400',
};

/** recharts bar hex per band. */
export const BAND_HEX: Record<TargetBand, string> = {
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#f43f5e',
  neutral: '#9ca3af',
};

/** Colored status badge with a dot — uses the server-supplied band only. */
export function StatusBadge({ status }: { status: TargetBand }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        BAND_BADGE[status],
      )}
    >
      <span className={classNames('h-1.5 w-1.5 rounded-full', BAND_DOT[status])} />
      {BAND_LABEL[status]}
    </span>
  );
}

/** Thin progress bar coloured by band, clamped to 100% width. */
export function BandBar({ pct, status, className }: { pct: number; status: TargetBand; className?: string }) {
  const width = Math.max(0, Math.min(100, Math.round(pct || 0)));
  return (
    <div className={classNames('h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800', className)}>
      <div className={classNames('h-full rounded-full transition-all', BAND_BAR[status])} style={{ width: `${width}%` }} />
    </div>
  );
}

// ── KPI / section presentational helpers ─────────────────────────────────────

export type Tone = 'indigo' | 'blue' | 'rose' | 'amber' | 'emerald' | 'violet';

const TONE_STYLES: Record<Tone, string> = {
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
  tone: Tone;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
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
    </div>
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
  tone?: Tone;
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

// ── Export / Print toolbar ───────────────────────────────────────────────────

/**
 * Excel / CSV export buttons (server-side) plus a Print/PDF button
 * (window.print()). `onExport` should call the salesReports.exportReport API.
 */
export function ExportToolbar({
  type,
  onExport,
}: {
  type: ReportExportType;
  onExport: (type: ReportExportType, format: ReportExportFormat) => Promise<void>;
}) {
  const [busy, setBusy] = useState<ReportExportFormat | null>(null);

  const run = async (format: ReportExportFormat) => {
    try {
      setBusy(format);
      await onExport(type, format);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button variant="secondary" size="sm" onClick={() => run('xlsx')} isLoading={busy === 'xlsx'} disabled={busy !== null}>
        <FileSpreadsheet size={15} />
        Excel
      </Button>
      <Button variant="secondary" size="sm" onClick={() => run('csv')} isLoading={busy === 'csv'} disabled={busy !== null}>
        <Download size={15} />
        CSV
      </Button>
      <Button variant="secondary" size="sm" onClick={() => window.print()}>
        <Printer size={15} />
        Print / PDF
      </Button>
    </div>
  );
}
