'use client';

import { useState } from 'react';
import { FileSpreadsheet, Download, ChevronDown } from 'lucide-react';
import { Button } from '@/components/Button';
import { useToast } from '@/lib/hooks/useToast';
import { ExportPdfButton } from '@/components/master/ExportPdfButton';
import type { DashboardReport } from '@/lib/pdf/dashboardPdf';
import {
  exportAttendanceAnalytics,
  type AnalyticsBaseFilters,
  type ExportTableType,
} from '@/lib/api/hrAnalytics';

/** The Employee-Report query state lifted from the table so exports match the view. */
export interface ReportQuery {
  sort: string;
  order: 'asc' | 'desc';
  search: string;
}

const CSV_TABLES: { type: Exclude<ExportTableType, 'workbook'>; label: string }[] = [
  { type: 'summary', label: 'Summary' },
  { type: 'departments', label: 'Department Analytics' },
  { type: 'employees', label: 'Employee Report' },
  { type: 'leaves', label: 'Leave Breakdown' },
];

/**
 * Excel (full workbook) + CSV (per-table) export for the Attendance Analytics tab.
 * Reuses the shared Button, the toast system and the app's dropdown idiom; all
 * active filters (+ the live report sort/order/search) are forwarded to the server.
 */
export function AttendanceExportBar({
  filters,
  reportQuery,
  buildPdfReport,
}: {
  filters: AnalyticsBaseFilters;
  reportQuery: ReportQuery;
  /** Client-side dashboard PDF (reuses ExportPdfButton + dashboardPdf). Omitted
   *  while the dashboard data hasn't loaded, so the PDF is never empty. May be
   *  async (it fetches the full employee report across all pages). */
  buildPdfReport?: () => DashboardReport | Promise<DashboardReport>;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<null | 'xlsx' | ExportTableType>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const run = async (
    format: 'xlsx' | 'csv',
    type: ExportTableType,
    key: 'xlsx' | ExportTableType,
  ) => {
    if (busy) return;
    setMenuOpen(false);
    setBusy(key);
    try {
      await exportAttendanceAnalytics({
        ...filters,
        format,
        type,
        sort: reportQuery.sort,
        order: reportQuery.order,
        search: reportQuery.search || undefined,
        threshold: 90,
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Export failed. Please try again.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        isLoading={busy === 'xlsx'}
        disabled={busy !== null}
        onClick={() => run('xlsx', 'workbook', 'xlsx')}
        title="Export the full analytics workbook (Excel)"
      >
        <FileSpreadsheet size={15} /> Excel
      </Button>

      <div className="relative">
        <Button
          variant="secondary"
          size="sm"
          disabled={busy !== null}
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Export a single table as CSV"
        >
          <Download size={15} /> CSV <ChevronDown size={14} />
        </Button>

        {menuOpen && (
          <>
            {/* Click-away backdrop (same idiom as StageColumnMenu) */}
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
            <div
              role="menu"
              className="absolute right-0 top-10 z-20 w-52 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 text-sm"
            >
              {CSV_TABLES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  role="menuitem"
                  disabled={busy !== null}
                  onClick={() => run('csv', t.type, t.type)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-700/60"
                >
                  <Download size={14} />
                  {t.label}
                  {busy === t.type && <span className="ml-auto text-xs text-gray-400">…</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Client-side PDF — reuses the shared ExportPdfButton (auto-captures charts). */}
      {buildPdfReport && <ExportPdfButton build={buildPdfReport} label="PDF" />}
    </div>
  );
}
