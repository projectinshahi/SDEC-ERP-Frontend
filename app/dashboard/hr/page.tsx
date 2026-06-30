'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Briefcase,
  Banknote,
  Star,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';

// KPI Card
import { KPIStatCard } from '@/components/hr/KPIStatCard';

// Row 2 widgets
import { AttendanceOverview } from '@/components/hr/dashboard/AttendanceOverview';
import { HRActivityFeed } from '@/components/hr/dashboard/HRActivityFeed';
import { PendingAlerts } from '@/components/hr/dashboard/PendingAlerts';

// Row 3 widgets
import { RecruitmentPipelineCard } from '@/components/hr/dashboard/RecruitmentPipelineCard';
import { PayrollSnapshot } from '@/components/hr/dashboard/PayrollSnapshot';
import { PerformanceSummary } from '@/components/hr/dashboard/PerformanceSummary';

// Row 4 widgets
import { DocumentsOverview } from '@/components/hr/dashboard/DocumentsOverview';
import { BirthdaysAnniversaries } from '@/components/hr/dashboard/BirthdaysAnniversaries';
import { QuickActionsCompact } from '@/components/hr/dashboard/QuickActionsCompact';

// API helpers
import {
  fetchHRDashboardStats,
  fetchPerformanceStats,
  fetchRecruitmentStats,
  fetchHRActivityFeed,
  fetchHRAlerts,
  type HRDashboardKPIs,
  type AttendanceSummaryItem,
  type PerformanceStats,
  type RecruitmentStats,
  type ActivityFeedItem,
  type DashboardAlertItem,
} from '@/lib/api/hrDashboard';

/* ── Types ────────────────────────────────────────────────────────── */

interface DashboardState {
  kpis: HRDashboardKPIs | null;
  attendanceSummary: AttendanceSummaryItem[];
  performanceStats: PerformanceStats | null;
  recruitmentStats: RecruitmentStats | null;
  activityFeed: ActivityFeedItem[];
  alerts: DashboardAlertItem[];
  loading: boolean;
  error: string | null;
  lastRefreshed: Date | null;
}

/* ── Color helpers for attendance chart ─────────────────────────── */
const ATTENDANCE_COLORS: Record<string, string> = {
  Present: '#10b981',
  Late: '#f97316',
  Leave: '#3b82f6',
  Absent: '#ef4444',
};

/* ── Component ───────────────────────────────────────────────────── */

export default function HRDashboard() {
  const [state, setState] = useState<DashboardState>({
    kpis: null,
    attendanceSummary: [],
    performanceStats: null,
    recruitmentStats: null,
    activityFeed: [],
    alerts: [],
    loading: true,
    error: null,
    lastRefreshed: null,
  });

  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const loadDashboard = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [dashData, perfStats, recruStats, feed, alertsData] = await Promise.all([
        fetchHRDashboardStats(),
        fetchPerformanceStats(),
        fetchRecruitmentStats(),
        fetchHRActivityFeed(),
        fetchHRAlerts(),
      ]);

      // Enrich attendance summary with chart colors
      const coloredSummary = dashData.attendanceSummary.map((item) => ({
        ...item,
        color: ATTENDANCE_COLORS[item.name] ?? '#9ca3af',
      }));

      setState({
        kpis: dashData.kpis,
        attendanceSummary: coloredSummary,
        performanceStats: perfStats,
        recruitmentStats: recruStats,
        activityFeed: feed,
        alerts: alertsData,
        loading: false,
        error: null,
        lastRefreshed: new Date(),
      });
    } catch (err) {
      console.error('[HR Dashboard] Load error:', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data.',
      }));
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const {
    kpis,
    attendanceSummary,
    performanceStats,
    recruitmentStats,
    activityFeed,
    alerts,
    loading,
    error,
    lastRefreshed,
  } = state;

  /* ── Format helpers ───────────────────────────────────────────── */
  function formatINR(n: number): string {
    if (n === 0) return '₹0';
    return '₹' + n.toLocaleString('en-IN');
  }

  function formatLastRefreshed(d: Date | null): string {
    if (!d) return '';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  /* ── Computed KPI display values ─────────────────────────────── */

  // Absent/Late: clamp to [0, totalEmployees]
  const absentLateCount = kpis
    ? Math.max(0, kpis.totalEmployees - kpis.presentToday - kpis.onLeave - kpis.lateToday)
    : 0;

  const kpiCards = [
    {
      id: 'total-employees',
      label: 'Total Employees',
      value: loading ? '—' : String(kpis?.totalEmployees ?? 0),
      subtitle: 'Active headcount',
      icon: Users,
      variant: 'indigo' as const,
    },
    {
      id: 'present-today',
      label: 'Present Today',
      value: loading ? '—' : String(kpis?.presentToday ?? 0),
      subtitle: kpis && kpis.totalEmployees > 0
        ? `${Math.round((kpis.presentToday / kpis.totalEmployees) * 100)}% of total`
        : 'Live count',
      icon: UserCheck,
      variant: 'emerald' as const,
    },
    {
      id: 'absent-today',
      label: 'Absent Today',
      value: loading ? '—' : String(absentLateCount),
      subtitle: `${kpis?.lateToday ?? 0} late · ${kpis?.onLeave ?? 0} on leave`,
      icon: UserX,
      variant: 'rose' as const,
    },
    {
      id: 'active-candidates',
      label: 'Active Candidates',
      value: loading ? '—' : String(
        recruitmentStats
          ? (recruitmentStats.Applied + recruitmentStats.Screening + recruitmentStats.Interview + recruitmentStats.Offer)
          : 0
      ),
      subtitle: `${recruitmentStats?.Hired ?? 0} hired this cycle`,
      icon: Briefcase,
      variant: 'blue' as const,
    },
    {
      id: 'pending-payroll',
      label: 'Pending Payroll',
      value: loading ? '—' : formatINR(kpis?.payrollPendingAmount ?? 0),
      subtitle: `${kpis?.payrollPending ?? 0} records pending`,
      icon: Banknote,
      variant: 'amber' as const,
    },
    {
      id: 'pending-reviews',
      label: 'Pending Reviews',
      value: loading ? '—' : String(
        (performanceStats?.self_pending ?? 0) + (performanceStats?.manager_pending ?? 0)
      ),
      subtitle: `${performanceStats?.manager_pending ?? 0} manager · ${performanceStats?.self_pending ?? 0} self`,
      icon: Star,
      variant: 'violet' as const,
    },
  ];

  /* ── Export functions ─────────────────────────────────────────── */

  const exportCSV = () => {
    if (!kpis) return;
    const rows = [
      ['KPI Label', 'Value', 'Details / Context'],
      ['Total Employees', kpis.totalEmployees, 'Active headcount'],
      ['Present Today', kpis.presentToday, `${kpis.totalEmployees > 0 ? Math.round((kpis.presentToday / kpis.totalEmployees) * 100) : 0}% of total`],
      ['Absent Today', absentLateCount, `${kpis.lateToday} late, ${kpis.onLeave} on leave`],
      ['Active Candidates', kpiCards[3].value, `${recruitmentStats?.Hired ?? 0} hired`],
      ['Pending Payroll', kpis.payrollPendingAmount, `${kpis.payrollPending} records pending`],
      ['Pending Reviews', kpiCards[5].value, `${performanceStats?.manager_pending ?? 0} manager, ${performanceStats?.self_pending ?? 0} self`],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + rows.map(e => e.map(val => `"${val}"`).join(',')).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HR_Dashboard_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportDropdown(false);
  };

  const exportPDF = () => {
    window.print();
    setShowExportDropdown(false);
  };

  return (
    <div className="space-y-7 print:p-8 print:bg-white print:text-black">

      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-[10.5px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300 mb-3 uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/40">
            Human Resource Management
          </div>
          <h1 className="text-2xl md:text-[28px] font-black tracking-tight text-gray-900 dark:text-white leading-none">
            HR Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
            Welcome back, HR Admin! Here&apos;s what&apos;s happening today.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative">
          {/* Last refreshed */}
          {lastRefreshed && (
            <span className="text-[11px] text-gray-400 dark:text-gray-600 font-medium">
              Updated {formatLastRefreshed(lastRefreshed)}
            </span>
          )}

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <Download size={13} />
              Export
            </button>

            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-40 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg z-50 overflow-hidden">
                <button
                  onClick={exportCSV}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition"
                >
                  <FileSpreadsheet size={13} className="text-emerald-500" />
                  Export as CSV
                </button>
                <button
                  onClick={exportPDF}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition"
                >
                  <FileText size={13} className="text-rose-500" />
                  Print / Save PDF
                </button>
              </div>
            )}
          </div>

          <button
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Print header display */}
      <div className="hidden print:block border-b border-gray-300 pb-4 mb-4">
        <h1 className="text-3xl font-black">SKPC Solutions - HR Dashboard Report</h1>
        <p className="text-sm text-gray-600 mt-1">Generated on {new Date().toLocaleString('en-IN')}</p>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-sm font-semibold text-rose-600 dark:text-rose-400 print:hidden">
          {error}
        </div>
      )}

      {/* ── Row 1: 6 KPI Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 print:grid-cols-3 print:gap-3">
        {kpiCards.map((card) => (
          <KPIStatCard
            key={card.id}
            label={card.label}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            variant={card.variant}
            loading={loading}
          />
        ))}
      </div>

      {/* ── Row 2: Attendance · Activity · Alerts ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 print:grid-cols-3 print:gap-3" style={{ minHeight: 320 }}>
        <AttendanceOverview
          data={attendanceSummary.length > 0 ? (attendanceSummary as any) : undefined}
          loading={loading}
        />
        <HRActivityFeed items={activityFeed} loading={loading} />
        <PendingAlerts items={alerts} loading={loading} />
      </div>

      {/* ── Row 3: Recruitment · Payroll · Performance ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 print:grid-cols-3 print:gap-3" style={{ minHeight: 320 }}>
        <RecruitmentPipelineCard stats={recruitmentStats ?? undefined} loading={loading} />
        <PayrollSnapshot
          totalInCycle={kpis?.payrollMonthCount}
          paid={kpis?.payrollPaid}
          pending={kpis?.payrollPending}
          totalAmount={kpis?.payrollPendingAmount}
          period={kpis?.currentMonth}
          loading={loading}
        />
        <PerformanceSummary stats={performanceStats ?? undefined} loading={loading} />
      </div>

      {/* ── Row 4: Documents · Anniversaries · Quick Actions ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 print:hidden" style={{ minHeight: 280 }}>
        <DocumentsOverview loading={loading} />
        <BirthdaysAnniversaries loading={loading} />
        <QuickActionsCompact />
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="pt-4 border-t border-gray-200 dark:border-gray-800 print:mt-10 print:border-gray-300">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400 dark:text-gray-600 print:text-black">
          <p>© 2026 SKPC Solutions Pvt Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4 print:hidden">
            <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Privacy Policy</a>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}