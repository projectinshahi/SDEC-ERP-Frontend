'use client';

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';
import { exportDashboardPdf, captureRechartsImages, type DashboardReport } from '@/lib/pdf/dashboardPdf';

interface ExportPdfButtonProps {
  /**
   * Builds the report from data the dashboard ALREADY has in memory (KPIs,
   * tables, filters, names) — no extra API calls. Charts are auto-captured from
   * the live recharts SVGs unless `autoCaptureCharts` is false.
   */
  build: () => DashboardReport | Promise<DashboardReport>;
  /** Auto-capture rendered recharts charts as images (default true). */
  autoCaptureCharts?: boolean;
  /** Override the default (consistent) button styling if a page needs it. */
  className?: string;
  label?: string;
}

const DEFAULT_CLASS =
  'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed';

/**
 * Standardised "Export PDF" action shared by every Founder dashboard (Projects,
 * Sales, Developers, HR) — one component, one design, one workflow. Generates a
 * branded SHAHI SOLUTIONS report from the current (filtered) dashboard data +
 * live charts and triggers the print/Save-as-PDF dialog. Role-based access is
 * unchanged: the button only renders on dashboards the user can already open.
 */
export function ExportPdfButton({ build, autoCaptureCharts = true, className, label = 'Export PDF' }: ExportPdfButtonProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    try {
      setBusy(true);
      const report = await build();
      if (autoCaptureCharts) {
        const captured = await captureRechartsImages(document);
        report.charts = [...(report.charts ?? []), ...captured];
      }
      await exportDashboardPdf(report);
    } catch (err) {
      console.error('Dashboard PDF export failed:', err);
      toast('Failed to export PDF. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title="Export this dashboard as a PDF report"
      aria-label="Export dashboard as PDF"
      className={className ?? DEFAULT_CLASS}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      {busy ? 'Preparing…' : label}
    </button>
  );
}
