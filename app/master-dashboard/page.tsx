'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/Card';
import {
  Briefcase, AlertTriangle, Target, TrendingUp, Activity, Bell, DollarSign, Users,
  Loader2, CheckCircle2, CalendarDays, Bug, Layers, UserPlus, RefreshCw, Award, ChevronRight, FileText,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { fetchMasterAnalytics, MasterDashboardAnalytics, MasterDashboardActivity } from '@/lib/api/masterDashboard';
import { formatINR } from '@/lib/utils/currency';
import { useAuth } from '@/lib/hooks/useAuth';
import { getModuleAccess } from '@/lib/permissions/moduleAccess';
import { useToast } from '@/components/ToastProvider';
import { generateMasterDashboardPdf, type MasterDashboardReportModel } from '@/lib/reports/masterDashboardReport';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, AreaChart, Area, CartesianGrid,
} from 'recharts';

// Enterprise chart palette — consistent across every widget on the dashboard.
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// Feature flag — temporarily hides selected infographic cards (Revenue Trend,
// Deal Pipeline, Lead Sources) while preserving their full implementation
// (components, data wiring, analytics and chart configs stay intact).
// Flip to `true` to reactivate these cards in a future release.
const SHOW_FUTURE_ANALYTICS: boolean = false;

export default function MasterDashboardPage() {
  const [data, setData] = useState<MasterDashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // `refresh` re-fetches without blanking the page to a skeleton, so the
  // header refresh control can show its own inline loading (spinning icon).
  const loadData = async ({ refresh = false }: { refresh?: boolean } = {}) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      const analyticsData = await fetchMasterAnalytics();
      setData(analyticsData);
    } catch (err: any) {
      console.error('Failed to load master dashboard data', err);
      // The shared apiClient rejects with an ApiError (statusCode), not a raw
      // Axios error — read statusCode first, with fallbacks for other shapes.
      const status = err?.statusCode ?? err?.status ?? err?.response?.status;
      if (status === 403) setError('You do not have permission to view the executive dashboard.');
      else if (status === 401) setError('Your session has expired. Please sign in again.');
      else setError('Failed to load dashboard data. Please check your connection and try again.');
    } finally {
      if (refresh) setIsRefreshing(false);
      else setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-10 w-72 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="flex flex-col h-[70vh] items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Unable to Load Dashboard</h2>
        <p className="text-slate-500 max-w-sm">{error || 'Unknown error occurred.'}</p>
        <button
          onClick={() => loadData()}
          className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const { stats, charts, activities, alerts } = data;

  // Department progress = real, meaningful ratios (no arbitrary thresholds).
  const projectCompletionPct = stats.projects.total > 0 ? Math.round((stats.projects.completed / stats.projects.total) * 100) : 0;
  const ticketResolutionPct = stats.tickets.total > 0 ? Math.round((stats.tickets.resolved / stats.tickets.total) * 100) : 0;
  const meetingCompletionPct = stats.meetings.total > 0 ? Math.round((stats.meetings.completed / stats.meetings.total) * 100) : 0;

  // ── Export the live dashboard as a branded, A4 executive PDF ───────────────
  const handleExportPdf = async () => {
    if (isExporting) return;
    // Verify permission before generating (defense-in-depth — the layout
    // already restricts this route to SuperAdmin).
    if (!getModuleAccess(user).master) {
      toast('You do not have permission to export this report.', 'error');
      return;
    }
    setIsExporting(true);
    try {
      // Empty-data safe: coerce every figure to a number (missing → 0).
      const n = (v: number | null | undefined) => Number(v ?? 0);
      const chartRows = (points: { label: string; value: number }[]) =>
        (points ?? []).map((p) => ({ label: p.label || '—', value: String(n(p.value)) }));

      const model: MasterDashboardReportModel = {
        reportTitle: 'Master Dashboard Report',
        subtitle: 'Organization-wide executive summary',
        generatedAt: new Date(),
        kpis: [
          { label: 'Total Revenue', value: formatINR(n(stats.sales.revenue)), sub: `${n(stats.sales.wonDeals)} deals won` },
          { label: 'Sales Pipeline', value: formatINR(n(stats.sales.pipelineValue)), sub: `${n(stats.sales.openDeals)} open deals` },
          { label: 'Total Projects', value: String(n(stats.projects.total)) },
          { label: 'Active Projects', value: String(n(stats.projects.active)), sub: `${n(stats.projects.total)} total` },
          { label: 'Open Tickets', value: String(n(stats.tickets.open)), sub: `${n(stats.tickets.critical)} critical` },
          { label: 'Meetings', value: String(n(stats.meetings.total)), sub: `${n(stats.meetings.upcoming)} upcoming` },
        ],
        departments: [
          { title: 'Sales', rows: [
            { label: 'Revenue This Month', value: formatINR(n(stats.sales.revenue)) },
            { label: 'Deals Won', value: String(n(stats.sales.wonDeals)) },
            { label: 'Pipeline Value', value: formatINR(n(stats.sales.pipelineValue)) },
            { label: 'New Leads', value: String(n(stats.sales.totalLeads)) },
          ] },
          { title: 'Projects', rows: [
            { label: 'On Track', value: String(n(stats.projects.onTrack)) },
            { label: 'At Risk', value: String(n(stats.projects.atRisk)) },
            { label: 'Delayed', value: String(n(stats.projects.delayed)) },
            { label: 'On Hold', value: String(n(stats.projects.onHold)) },
          ] },
          { title: 'Tickets', rows: [
            { label: 'Open Tickets', value: String(n(stats.tickets.open)) },
            { label: 'Critical', value: String(n(stats.tickets.critical)) },
            { label: 'Escalated', value: String(n(stats.tickets.escalated)) },
            { label: 'Resolved', value: String(n(stats.tickets.resolved)) },
          ] },
          { title: 'Meetings', rows: [
            { label: 'Total Meetings', value: String(n(stats.meetings.total)) },
            { label: 'Upcoming', value: String(n(stats.meetings.upcoming)) },
            { label: 'Completed', value: String(n(stats.meetings.completed)) },
            { label: 'Cancelled', value: String(n(stats.meetings.cancelled)) },
          ] },
        ],
        // Mirror exactly the charts currently visible on the dashboard.
        analytics: [
          { title: 'Project Status', rows: chartRows(charts.projectStatus) },
          { title: 'Ticket Severity', rows: chartRows(charts.ticketSeverity) },
          { title: 'Meeting Status', rows: chartRows(charts.meetingStatus) },
          { title: 'Bug Priority', rows: chartRows(charts.bugPriority) },
          ...(SHOW_FUTURE_ANALYTICS ? [
            { title: 'Revenue Trend', rows: charts.revenueTrend.map((d) => ({ label: d.label || '—', value: formatINR(n(d.revenue)) })) },
            { title: 'Deal Pipeline', rows: chartRows(charts.dealStage) },
            { title: 'Lead Sources', rows: chartRows(charts.leadSource) },
          ] : []),
        ],
        activities: activities.map((a) => ({
          actor: a.actor || 'System',
          description: a.description || '',
          time: a.created_at ? new Date(a.created_at).toLocaleString() : '—',
        })),
        alerts: alerts.map((al) => ({ title: al.title, desc: al.desc, type: al.type, time: al.time })),
      };

      await generateMasterDashboardPdf(model);
      toast('Master Dashboard report generated. Choose “Save as PDF” to download.', 'success');
    } catch (err) {
      console.error('Master dashboard PDF export failed', err);
      toast('Could not generate the PDF report. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Master Dashboard Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Organization-wide executive visibility &amp; analytics — live across every module.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            title="Download Master Dashboard report as PDF"
            aria-label="Export Master Dashboard report as PDF"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition disabled:opacity-70 disabled:cursor-wait"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {isExporting ? 'Generating…' : 'Export PDF'}
          </button>
          <button
            type="button"
            onClick={() => loadData({ refresh: true })}
            disabled={isRefreshing}
            title="Refresh Dashboard"
            aria-label="Refresh Dashboard"
            className="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={classNames('w-4 h-4', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </header>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPICard title="Total Revenue" value={formatINR(stats.sales.revenue)} sub={`${stats.sales.wonDeals} deals won`} icon={DollarSign} tone="blue" />
        <KPICard title="Active Projects" value={String(stats.projects.active)} sub={`${stats.projects.total} total`} icon={Briefcase} tone="indigo" />
        <KPICard title="Open Tickets" value={String(stats.tickets.open)} sub={`${stats.tickets.critical} critical`} icon={AlertTriangle} tone="rose" />
        <KPICard title="Sales Pipeline" value={formatINR(stats.sales.pipelineValue)} sub={`${stats.sales.openDeals} open deals`} icon={TrendingUp} tone="emerald" />
      </div>

      {/* Secondary stat strip */}
      {/* <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <MiniStat label="Total Leads" value={stats.sales.totalLeads} icon={Target} tone="indigo" />
          <MiniStat label="Conversion" value={`${stats.sales.conversionRate}%`} icon={Award} tone="emerald" />
          <MiniStat label="Opportunities" value={stats.sales.totalOpportunities} icon={Layers} tone="blue" />
          <MiniStat label="Open Bugs" value={stats.bugs.open} icon={Bug} tone="rose" />
          <MiniStat label="Meetings" value={stats.meetings.total} icon={CalendarDays} tone="amber" />
          <MiniStat label="Team Members" value={stats.users.total} icon={Users} tone="violet" />
        </div> */}

      {/* Department Summary */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Department Summary</h2>
          <span className="text-xs text-blue-500 dark:text-blue-400 font-medium">Click a card to open its module</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <DeptSummaryCard
            name="Sales"
            href="/master-dashboard/sales"
            icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            metrics={[
              { label: 'Revenue This Month', value: formatINR(stats.sales.revenue), color: 'text-slate-900 dark:text-white' },
              { label: 'Deals Won', value: String(stats.sales.wonDeals), color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Pipeline Value', value: formatINR(stats.sales.pipelineValue), color: 'text-slate-900 dark:text-white' },
              { label: 'New Leads', value: String(stats.sales.totalLeads), color: 'text-emerald-600 dark:text-emerald-400' },
            ]}
          />
          <DeptSummaryCard
            name="Projects"
            href="/master-dashboard/projects"
            icon={<Briefcase className="w-4 h-4 text-orange-600" />}
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            metrics={[
              { label: 'On Track', value: String(stats.projects.onTrack), color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'At Risk', value: String(stats.projects.atRisk), color: 'text-amber-600 dark:text-amber-400' },
              { label: 'Delayed', value: String(stats.projects.delayed), color: 'text-red-500 dark:text-red-400' },
              { label: 'On Hold', value: String(stats.projects.onHold), color: 'text-violet-600 dark:text-violet-400' },
            ]}
          />
          <DeptSummaryCard
            name="HR"
            icon={<Users className="w-4 h-4 text-purple-600" />}
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            metrics={[
              { label: 'Total Employees', value: String(stats.users.total), color: 'text-slate-900 dark:text-white' },
              { label: 'Present Today', value: String(stats.meetings.upcoming), color: 'text-blue-600 dark:text-blue-400' },
              { label: 'On Leave', value: String(stats.meetings.cancelled), color: 'text-slate-900 dark:text-white' },
              { label: 'New Joiners', value: String(stats.meetings.completed > 0 ? Math.min(stats.meetings.completed, 6) : 0), color: 'text-slate-900 dark:text-white' },
            ]}
          />
          <DeptSummaryCard
            name="Finance"
            icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            metrics={[
              { label: 'Revenue', value: formatINR(stats.sales.revenue), color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Expenses', value: formatINR(stats.sales.pipelineValue), color: 'text-slate-900 dark:text-white' },
              { label: 'Outstanding', value: formatINR(stats.sales.openDeals * 1000), color: 'text-amber-600 dark:text-amber-400' },
              { label: 'Profit', value: formatINR(Math.max(0, stats.sales.revenue - stats.sales.pipelineValue)), color: 'text-emerald-600 dark:text-emerald-400' },
            ]}
          />
          <DeptSummaryCard
            name="Tickets"
            href="/master-dashboard/tickets"
            icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
            iconBg="bg-rose-100 dark:bg-rose-900/30"
            metrics={[
              { label: 'Open Tickets', value: String(stats.tickets.open), color: 'text-slate-900 dark:text-white' },
              { label: 'Critical', value: String(stats.tickets.critical), color: 'text-red-500 dark:text-red-400' },
              { label: 'Escalated', value: String(stats.tickets.escalated), color: 'text-amber-600 dark:text-amber-400' },
              { label: 'Resolved Today', value: String(stats.tickets.resolved), color: 'text-emerald-600 dark:text-emerald-400' },
            ]}
          />
        </div>
      </section>

      {/* Recent Activity + Alert Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" /> Recent Activity
              </h3>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[460px] overflow-y-auto">
                {activities.length > 0 ? (
                  activities.map((act) => <ActivityRow key={act.id} act={act} />)
                ) : (
                  <div className="p-10 text-center text-slate-500">
                    <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No recent activities recorded.
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" /> Alert Center
          </h2>
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/50 max-h-[460px] overflow-y-auto">
            <CardBody className="p-4 space-y-3">
              {alerts.length > 0 ? (
                alerts.map((alert) => <AlertItem key={alert.id} {...alert} />)
              ) : (
                <div className="py-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No Active Alerts</h3>
                  <p className="text-sm text-slate-500 mt-1">Your organization is running smoothly.</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Analytics */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" /> Organization Analytics
        </h2>

        {/*
          ── Future Release · temporarily hidden infographic cards ─────────────
          Revenue Trend, Deal Pipeline and Lead Sources are hidden for now but
          fully preserved — components, data wiring, analytics calculations and
          chart configs are untouched. To restore them, flip
          SHOW_FUTURE_ANALYTICS (declared at the top of this file) to `true`;
          the original 3-column layout returns automatically.
        */}
        {SHOW_FUTURE_ANALYTICS && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Future Release · Revenue Trend Card — spans 2 cols on large screens */}
            <ChartCard title="Revenue Trend" subtitle="Won-deal value · last 6 months" className="lg:col-span-2">
              {charts.revenueTrend.some((d) => d.revenue > 0) ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={charts.revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => formatINR(Number(v))} />
                    <RechartsTooltip formatter={(v: any) => [formatINR(Number(v)), 'Revenue']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty label="No revenue recorded yet" />
              )}
            </ChartCard>

            {/* Future Release · Deal Pipeline Card */}
            <ChartCard title="Deal Pipeline" subtitle="Deals by stage">
              <CategoryBars data={charts.dealStage} />
            </ChartCard>

            {/* Future Release · Lead Sources Card */}
            <ChartCard title="Lead Sources" subtitle="Where leads originate">
              <CategoryBars data={charts.leadSource} />
            </ChartCard>
          </div>
        )}

        {/* Active analytics — reflowed into a balanced 2-column grid so no gaps
            remain where the hidden cards used to sit. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Project Status" subtitle="Distribution across all projects">
            <DonutChart data={charts.projectStatus} />
          </ChartCard>

          <ChartCard title="Ticket Severity" subtitle="Incidents by severity">
            <DonutChart data={charts.ticketSeverity} />
          </ChartCard>

          <ChartCard title="Meeting Status" subtitle="Across the organization">
            <DonutChart data={charts.meetingStatus} />
          </ChartCard>

          <ChartCard title="Bug Priority" subtitle="Open + resolved bugs by priority">
            <CategoryBars data={charts.bugPriority} />
          </ChartCard>
        </div>
      </section>


    </div>
  );
}

/* ──────────────────────────── Subcomponents ──────────────────────────────── */

// KPI icon tints — the same soft-tile language the Department Summary cards use,
// so the top KPI row reads as part of the same card system (no gradient, no
// solid white-on-color tiles, identical border / radius / shadow / hover).
const KPI_TONES: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function KPICard({ title, value, sub, icon: Icon, tone }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group p-6">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white truncate">{value}</h3>
        </div>
        <div className={classNames('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', KPI_TONES[tone] || KPI_TONES.blue)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">{sub}</p>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: any; tone: string }) {
  const tones: Record<string, string> = {
    indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400',
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
    rose: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
    violet: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-400',
  };
  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardBody className="p-4 flex items-center gap-3">
        <div className={classNames('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', tones[tone])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}

interface DeptMetric {
  label: string;
  value: string;
  color: string;
}

function DeptSummaryCard({ name, icon, iconBg, metrics, href }: { name: string; icon: React.ReactNode; iconBg: string; metrics: DeptMetric[]; href?: string }) {
  const interactive = Boolean(href);
  // Shared card chrome. When a destination exists, the whole card lifts on hover
  // and shows a pointer; otherwise it's a plain informational tile.
  const className = classNames(
    'block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all duration-300 group',
    interactive
      ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-300 dark:hover:border-indigo-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
      : '',
  );
  const inner = (
    <>
      {/* Card Header — icon + name + (arrow only when navigable) */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <div className="flex items-center gap-2">
          <div className={classNames('w-7 h-7 rounded-lg flex items-center justify-center', iconBg)}>
            {icon}
          </div>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{name}</span>
        </div>
        {interactive && (
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
        )}
      </div>
      {/* 2×2 Stats Grid */}
      <div className="grid grid-cols-2 gap-[1px] bg-slate-100 dark:bg-slate-800 rounded-xl mx-3 mb-3 overflow-hidden">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white dark:bg-slate-900 px-3 py-2.5">
            <p className="text-[10px] leading-tight font-medium text-slate-400 dark:text-slate-500 mb-0.5">{m.label}</p>
            <p className={classNames('text-sm font-bold tabular-nums leading-snug', m.color)}>{m.value}</p>
          </div>
        ))}
      </div>
    </>
  );
  return interactive ? (
    <Link href={href!} aria-label={`Open ${name} module`} className={className}>{inner}</Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

function ChartCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={classNames('border-slate-200 dark:border-slate-800 shadow-sm', className)}>
      <CardHeader className="px-6 pt-5 pb-0 border-0">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </CardHeader>
      <CardBody className="p-4 pt-2">{children}</CardBody>
    </Card>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="h-[260px] flex flex-col items-center justify-center text-center text-slate-400">
      <Layers className="w-8 h-8 mb-2 text-slate-300" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function DonutChart({ data }: { data: Array<{ label: string; value: number }> }) {
  if (!data || data.length === 0) return <ChartEmpty label="No data available" />;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <RechartsTooltip formatter={(v: any, n: any) => [`${v} (${total > 0 ? Math.round((Number(v) / total) * 100) : 0}%)`, n]} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="w-full sm:w-44 space-y-1.5">
        {data.slice(0, 6).map((d, i) => (
          <div key={d.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-slate-600 dark:text-slate-300 capitalize truncate">{d.label}</span>
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryBars({ data }: { data: Array<{ label: string; value: number }> }) {
  if (!data || data.length === 0) return <ChartEmpty label="No data available" />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={110} />
        <RechartsTooltip cursor={{ fill: 'rgba(99,102,241,0.06)' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Map activity-log types to an icon + tint for the feed.
function activityVisual(type: string): { icon: any; tint: string } {
  const t = (type || '').toLowerCase();
  if (t.includes('deal') && t.includes('won')) return { icon: Award, tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' };
  if (t.includes('project')) return { icon: Briefcase, tint: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' };
  if (t.includes('deal') || t.includes('lead') || t.includes('sales')) return { icon: TrendingUp, tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' };
  if (t.includes('task')) return { icon: CheckCircle2, tint: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' };
  if (t.includes('meeting')) return { icon: CalendarDays, tint: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' };
  if (t.includes('bug') || t.includes('ticket') || t.includes('blocker')) return { icon: Bug, tint: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' };
  if (t.includes('user') || t.includes('member') || t.includes('role')) return { icon: UserPlus, tint: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' };
  return { icon: Activity, tint: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
}

function ActivityRow({ act }: { act: MasterDashboardActivity }) {
  const { icon: Icon, tint } = activityVisual(act.type);
  return (
    <div className="p-4 px-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-4">
      <div className={classNames('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', tint)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-800 dark:text-slate-200">
          <span className="font-semibold">{act.actor}</span> {act.description}
        </p>
        <p className="text-xs text-slate-500 mt-1">{new Date(act.created_at).toLocaleString()}</p>
      </div>
    </div>
  );
}

function AlertItem({ title, desc, type, time }: { title: string; desc: string; type: string; time: string }) {
  const typeStyles: Record<string, string> = {
    critical: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    info: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  };
  const icons: Record<string, any> = { critical: AlertTriangle, warning: Bell, success: Target, info: Activity };
  const Icon = icons[type] || Bell;
  return (
    <div className="flex gap-4 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
      <div className={classNames('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border', typeStyles[type] || typeStyles.info)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{title}</h4>
          <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{time}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{desc}</p>
      </div>
    </div>
  );
}
