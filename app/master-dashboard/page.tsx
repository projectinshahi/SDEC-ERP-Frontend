'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@/components/Card';
import {
  Briefcase, AlertTriangle, Target, TrendingUp, Activity, Bell, DollarSign, Users,
  Loader2, CheckCircle2, CalendarDays, Bug, Layers, UserPlus, RefreshCw, Award,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { fetchMasterAnalytics, MasterDashboardAnalytics, MasterDashboardActivity } from '@/lib/api/masterDashboard';
import { formatINR } from '@/lib/utils/currency';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, AreaChart, Area, CartesianGrid,
} from 'recharts';

// Enterprise chart palette — consistent across every widget on the dashboard.
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function MasterDashboardPage() {
  const [data, setData] = useState<MasterDashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
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
          onClick={loadData}
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            SuperAdmin Control Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Organization-wide executive visibility &amp; analytics — live across every module.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold border border-emerald-200 dark:border-emerald-800/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Data
          </span>
        </div>
      </header>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPICard title="Total Revenue" value={formatINR(stats.sales.revenue)} sub={`${stats.sales.wonDeals} deals won`} icon={DollarSign} color="bg-blue-500" bgGradient="from-blue-500/10 to-transparent" />
        <KPICard title="Active Projects" value={String(stats.projects.active)} sub={`${stats.projects.total} total`} icon={Briefcase} color="bg-indigo-500" bgGradient="from-indigo-500/10 to-transparent" />
        <KPICard title="Open Tickets" value={String(stats.tickets.open)} sub={`${stats.tickets.critical} critical`} icon={AlertTriangle} color="bg-rose-500" bgGradient="from-rose-500/10 to-transparent" />
        <KPICard title="Sales Pipeline" value={formatINR(stats.sales.pipelineValue)} sub={`${stats.sales.openDeals} open deals`} icon={TrendingUp} color="bg-emerald-500" bgGradient="from-emerald-500/10 to-transparent" />
      </div>

      {/* Secondary stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MiniStat label="Total Leads" value={stats.sales.totalLeads} icon={Target} tone="indigo" />
        <MiniStat label="Conversion" value={`${stats.sales.conversionRate}%`} icon={Award} tone="emerald" />
        <MiniStat label="Opportunities" value={stats.sales.totalOpportunities} icon={Layers} tone="blue" />
        <MiniStat label="Open Bugs" value={stats.bugs.open} icon={Bug} tone="rose" />
        <MiniStat label="Meetings" value={stats.meetings.total} icon={CalendarDays} tone="amber" />
        <MiniStat label="Team Members" value={stats.users.total} icon={Users} tone="violet" />
      </div>

      {/* Department Summary */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" /> Department Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <DepartmentCard name="Projects" metric={`${stats.projects.active} active · ${stats.projects.completed} done`} progress={projectCompletionPct} caption="Completion rate" color="indigo" />
          <DepartmentCard name="Sales" metric={formatINR(stats.sales.revenue)} progress={stats.sales.conversionRate} caption="Lead conversion" color="emerald" />
          <DepartmentCard name="Tickets" metric={`${stats.tickets.open} open · ${stats.tickets.resolved} resolved`} progress={ticketResolutionPct} caption="Resolution rate" color="rose" />
          <DepartmentCard name="Meetings" metric={`${stats.meetings.upcoming} upcoming`} progress={meetingCompletionPct} caption="Completion rate" color="blue" />
        </div>
      </section>

      {/* Analytics */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" /> Organization Analytics
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue trend spans 2 cols on large screens */}
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

          <ChartCard title="Project Status" subtitle="Distribution across all projects">
            <DonutChart data={charts.projectStatus} />
          </ChartCard>

          <ChartCard title="Deal Pipeline" subtitle="Deals by stage">
            <CategoryBars data={charts.dealStage} />
          </ChartCard>

          <ChartCard title="Ticket Severity" subtitle="Incidents by severity">
            <DonutChart data={charts.ticketSeverity} />
          </ChartCard>

          <ChartCard title="Lead Sources" subtitle="Where leads originate">
            <CategoryBars data={charts.leadSource} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Meeting Status" subtitle="Across the organization">
            <DonutChart data={charts.meetingStatus} />
          </ChartCard>
          <ChartCard title="Bug Priority" subtitle="Open + resolved bugs by priority">
            <CategoryBars data={charts.bugPriority} />
          </ChartCard>
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
    </div>
  );
}

/* ──────────────────────────── Subcomponents ──────────────────────────────── */

function KPICard({ title, value, sub, icon: Icon, color, bgGradient }: any) {
  return (
    <Card className={classNames('relative overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group bg-gradient-to-br', bgGradient)}>
      <CardBody className="p-6">
        <div className="flex justify-between items-start">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white truncate">{value}</h3>
          </div>
          <div className={classNames('w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition-transform duration-300 shrink-0', color)}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">{sub}</p>
      </CardBody>
    </Card>
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

function DepartmentCard({ name, metric, progress, caption, color }: any) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500', blue: 'bg-blue-500', emerald: 'bg-emerald-500', rose: 'bg-rose-500',
  };
  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 transition-colors">
      <CardBody className="p-5">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-slate-800 dark:text-slate-100">{name}</h4>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">{progress}%</span>
        </div>
        <p className="text-sm text-slate-500 mb-4 truncate">{metric}</p>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
          <div className={classNames('h-2 rounded-full transition-all', colorMap[color])} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        <p className="text-xs text-slate-400 mt-2">{caption}</p>
      </CardBody>
    </Card>
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
