'use client';

/**
 * SE-039.2 / SE-039.3 — Export Center.
 *
 * A single hub to export any sales report as Excel or CSV for the selected date
 * range (SE-039.1). PDF is intentionally not offered here — it is produced via
 * the browser's Print → Save as PDF on each report page (noted in the UI).
 */

import { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Activity,
  IndianRupee,
  Target,
  Layers,
  Trophy,
  XCircle,
  Megaphone,
  Info,
} from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { exportReport, type ReportWindow } from '@/lib/api/salesReports';
import type { ReportExportType, ReportExportFormat } from '@/lib/types/salesReports';
import {
  DateRangeSelector,
  defaultRangeWindow,
} from '@/components/sales-reports/DateRangeSelector';

interface ExportDef {
  type: ReportExportType;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: string;
}

const EXPORTS: ExportDef[] = [
  {
    type: 'activity',
    title: 'Activity Report',
    description: 'Calls, meetings, emails & follow-ups per BDE.',
    icon: Activity,
    tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  {
    type: 'revenue',
    title: 'Revenue & Closed Deals',
    description: 'Closed-won revenue and deal counts.',
    icon: IndianRupee,
    tone: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
  },
  {
    type: 'forecast',
    title: 'Forecast vs Actual',
    description: 'Forecasted vs actual revenue with variance.',
    icon: Target,
    tone: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300',
  },
  {
    type: 'pipeline',
    title: 'Pipeline',
    description: 'Open pipeline value, stages & weighted forecast.',
    icon: Layers,
    tone: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300',
  },
  {
    type: 'win-rate',
    title: 'Win Rate',
    description: 'Won vs lost ratios by owner, team & product.',
    icon: Trophy,
    tone: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
  },
  {
    type: 'lost-deals',
    title: 'Lost Deals',
    description: 'Loss reasons, competitors & lost-value trend.',
    icon: XCircle,
    tone: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
  },
  {
    type: 'lead-source',
    title: 'Lead Source',
    description: 'Lead volume & conversion by source.',
    icon: Megaphone,
    tone: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300',
  },
];

export default function ExportCenterPage() {
  const { toast } = useToast();
  const [reportWindow, setReportWindow] = useState<ReportWindow>(defaultRangeWindow);
  // Tracks the in-flight export keyed by `${type}:${format}`.
  const [busy, setBusy] = useState<string | null>(null);

  const runExport = async (def: ExportDef, format: ReportExportFormat) => {
    const key = `${def.type}:${format}`;
    try {
      setBusy(key);
      await exportReport(def.type, format, reportWindow);
      toast(`${def.title} exported as ${format.toUpperCase()}`, 'success');
    } catch {
      toast(`Failed to export ${def.title} (${format.toUpperCase()})`, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Export Center</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Download any sales report as Excel or CSV for the selected date range.
            </p>
          </div>
          <DateRangeSelector value={reportWindow} onChange={setReportWindow} />
        </div>

        {/* PDF note */}
        <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold">PDF export:</span> open the report page and use
            Print&nbsp;→&nbsp;Save as PDF.
          </p>
        </div>

        {/* Export cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {EXPORTS.map((def) => {
            const Icon = def.icon;
            const xlsxBusy = busy === `${def.type}:xlsx`;
            const csvBusy = busy === `${def.type}:csv`;
            return (
              <Card
                key={def.type}
                className="flex flex-col gap-4 p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${def.tone}`}>
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{def.title}</h3>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{def.description}</p>
                  </div>
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => runExport(def, 'xlsx')}
                    isLoading={xlsxBusy}
                    disabled={busy !== null}
                  >
                    <FileSpreadsheet size={15} />
                    Excel
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => runExport(def, 'csv')}
                    isLoading={csvBusy}
                    disabled={busy !== null}
                  >
                    <Download size={15} />
                    CSV
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </PermissionPageGuard>
  );
}
