'use client';

/**
 * Shared helpers for the Sales Reports pages (SE-034 Pipeline Summary, SE-035
 * Win Rate). Self-contained — owns the period-window logic, the export/print
 * toolbar and a small percentage formatter that respects the `null` = N/A
 * contract used by the win-rate report.
 */

import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/ui/SelectField';
import type { ReportWindow, exportReport } from '@/lib/api/salesReports';
import type { ReportExportType } from '@/lib/types/salesReports';

// ── Period filter ────────────────────────────────────────────────────────────

export type PeriodChoice = 'month' | 'quarter' | 'year' | 'all';

const PERIOD_OPTIONS: { value: PeriodChoice; label: string }[] = [
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

/** Map a period choice to the API `ReportWindow` (undefined = all time). */
export function windowForChoice(choice: PeriodChoice): ReportWindow | undefined {
  const now = new Date();
  const year = now.getFullYear();
  switch (choice) {
    case 'month': {
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return { period: `${year}-${month}`, periodType: 'monthly' };
    }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) + 1;
      return { period: `${year}-Q${q}`, periodType: 'quarterly' };
    }
    case 'year':
      return { period: `${year}`, periodType: 'yearly' };
    case 'all':
    default:
      return undefined;
  }
}

/** Human label for the active period — used in report sub-headings. */
export function labelForChoice(choice: PeriodChoice): string {
  return PERIOD_OPTIONS.find((o) => o.value === choice)?.label ?? 'All Time';
}

export function PeriodFilter({
  value,
  onChange,
  disabled,
}: {
  value: PeriodChoice;
  onChange: (choice: PeriodChoice) => void;
  disabled?: boolean;
}) {
  return (
    <div className="w-44 print:hidden">
      <SelectField
        id="report-period"
        label="Period"
        options={PERIOD_OPTIONS}
        value={value}
        onChange={(v) => onChange(v as PeriodChoice)}
        disabled={disabled}
      />
    </div>
  );
}

// ── Export / print toolbar ───────────────────────────────────────────────────

export function ExportBar({
  type,
  reportWindow,
  onError,
  disabled,
}: {
  type: ReportExportType;
  reportWindow: ReportWindow | undefined;
  /** Called with a user-facing message when an export fails. */
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState<'xlsx' | 'csv' | null>(null);

  // Lazy import keeps this helper free of a hard dependency on the api module
  // at module-eval time; resolved on first click.
  const runExport = async (format: 'xlsx' | 'csv') => {
    try {
      setBusy(format);
      const { exportReport: doExport } = (await import('@/lib/api/salesReports')) as {
        exportReport: typeof exportReport;
      };
      await doExport(type, format, reportWindow);
    } catch {
      onError(`Failed to export ${format.toUpperCase()}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => runExport('xlsx')}
        isLoading={busy === 'xlsx'}
        disabled={disabled || busy !== null}
      >
        <FileSpreadsheet size={15} />
        Excel
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => runExport('csv')}
        isLoading={busy === 'csv'}
        disabled={disabled || busy !== null}
      >
        <Download size={15} />
        CSV
      </Button>
      <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={disabled}>
        <Printer size={15} />
        Print / PDF
      </Button>
    </div>
  );
}

// ── Formatting ────────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** INR with no decimals (₹1,23,456). */
export function formatINR(n: number | null | undefined): string {
  return inrFormatter.format(n || 0);
}

/**
 * Win-rate percentage. Honours the contract: `null` means N/A (no closed
 * deals) and must render as "N/A" — never as a number, never divided.
 */
export function formatRate(rate: number | null | undefined): string {
  if (rate == null) return 'N/A';
  return `${Math.round(rate)}%`;
}

/** Period-window state hook shared by both report pages. */
export function useReportPeriod(initial: PeriodChoice = 'month') {
  const [choice, setChoice] = useState<PeriodChoice>(initial);
  const reportWindow = useMemo(() => windowForChoice(choice), [choice]);
  return { choice, setChoice, reportWindow, label: labelForChoice(choice) };
}
