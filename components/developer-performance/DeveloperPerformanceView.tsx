'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Users, Rocket, ShieldCheck, Clock, Zap, Search, Download,
  Calendar, Loader2, AlertCircle, Trophy, Award, Medal, ChevronDown, MoreVertical,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  fetchDeveloperPerformance, DeveloperPerformance, DeveloperRow,
} from '@/lib/api/developerPerformance';
import { ExportPdfButton } from '@/components/master/ExportPdfButton';
import type { DashboardReport } from '@/lib/pdf/dashboardPdf';
import { useAuth } from '@/lib/hooks/useAuth';
import { classNames } from '@/lib/utils';

/**
 * Shared Developer Performance analytics view — live data from
 * `GET /projects/global/developer-performance` (developer-role users only,
 * org-wide for SuperAdmin). Rendered by BOTH the Development module page
 * (/dashboard/developer-performance) and the Master Dashboard page
 * (/master-dashboard/developer-performance) so the UI + API are never duplicated.
 */

/* ------------------------------------------------------------------ helpers */

function relativeTime(iso: string | null): string {
  if (!iso) return 'No activity';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'No activity';
  const diff = Date.now() - then;
  if (diff < 0) return 'Just now';
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Local YYYY-MM-DD (date filtering is day-granular). */
function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

const DATE_PRESETS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisQuarter', label: 'This Quarter' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

/**
 * Resolve a preset to a [start,end] YYYY-MM-DD window (null = all time).
 * Called from event handlers only (keeps new Date() out of render).
 */
function presetRange(preset: string): { start: string; end: string } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shift = (days: number) => { const d = new Date(today); d.setDate(today.getDate() + days); return d; };
  switch (preset) {
    case 'today': return { start: fmtDate(today), end: fmtDate(today) };
    case 'yesterday': return { start: fmtDate(shift(-1)), end: fmtDate(shift(-1)) };
    case 'last7': return { start: fmtDate(shift(-6)), end: fmtDate(today) };
    case 'last30': return { start: fmtDate(shift(-29)), end: fmtDate(today) };
    case 'thisMonth': return { start: fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
    case 'lastMonth': return { start: fmtDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)), end: fmtDate(new Date(now.getFullYear(), now.getMonth(), 0)) };
    case 'thisQuarter': { const q = Math.floor(now.getMonth() / 3); return { start: fmtDate(new Date(now.getFullYear(), q * 3, 1)), end: fmtDate(new Date(now.getFullYear(), q * 3 + 3, 0)) }; }
    case 'thisYear': return { start: fmtDate(new Date(now.getFullYear(), 0, 1)), end: fmtDate(new Date(now.getFullYear(), 11, 31)) };
    default: return null; // 'all'
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

const AVATAR_TONES = [
  'bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700', 'bg-fuchsia-100 text-fuchsia-700',
];
const avatarTone = (id: number) => AVATAR_TONES[id % AVATAR_TONES.length];

type BarTone = 'indigo' | 'emerald' | 'amber' | 'sky' | 'rose';
const BAR_BG: Record<BarTone, string> = {
  indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500',
  sky: 'bg-sky-500', rose: 'bg-rose-500',
};

function MiniBar({ pct, tone }: { pct: number; tone: BarTone }) {
  return (
    <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
      <div
        className={classNames('h-1.5 rounded-full transition-all', BAR_BG[tone])}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

/* --------------------------------------------------------------- metric card */

interface Metric {
  label: string;
  value: string;
  sub?: string;
  bar?: { pct: number; tone: BarTone };
}

function MetricCard({
  title, icon, tone, metrics,
}: {
  title: string;
  icon: React.ReactNode;
  tone: string;
  metrics: Metric[];
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <div className={classNames('flex h-9 w-9 items-center justify-center rounded-lg', tone)}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{m.label}</p>
            <p className="mt-0.5 text-lg font-bold text-gray-900">
              {m.value}
              {m.sub && <span className="ml-1 text-xs font-medium text-gray-400">{m.sub}</span>}
            </p>
            {m.bar && <MiniBar pct={m.bar.pct} tone={m.bar.tone} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- the view */

// Palette cycles for an unlimited number of Kanban columns.
const DONUT_COLORS = ['#94a3b8', '#6366f1', '#f59e0b', '#a855f7', '#10b981', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#0ea5e9'];
const donutColor = (i: number) => DONUT_COLORS[i % DONUT_COLORS.length];

export function DeveloperPerformanceView() {
  const { user } = useAuth();
  const [data, setData] = useState<DeveloperPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'all' | 'active' | 'busy'>('all');

  // Date filter — preset + resolved [start,end] window (null = all time).
  const [preset, setPreset] = useState('all');
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const onPresetChange = (value: string) => {
    setPreset(value);
    if (value === 'custom') { setShowCustom(true); return; }
    setShowCustom(false);
    setRange(presetRange(value));
  };
  const applyCustom = () => {
    if (customStart && customEnd && customStart <= customEnd) setRange({ start: customStart, end: customEnd });
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetchDeveloperPerformance(range?.start, range?.end);
        if (alive) setData(res);
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [range]);

  const filteredDevs = useMemo<DeveloperRow[]>(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.developers.filter((d) => {
      if (view === 'active' && d.devStatus !== 'Active') return false;
      if (view === 'busy' && d.devStatus !== 'Busy') return false;
      if (q && !d.name.toLowerCase().includes(q) && !d.role.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, view]);

  const exportCsv = () => {
    if (!data) return;
    const isPeriod = !!range;
    const headers = [
      'Developer', 'Role', 'Active Projects', 'Assigned Points', 'Completed Points',
      isPeriod ? 'Period Pts' : 'Today Pts', 'Completion %', 'Tasks Pending', 'Bugs', 'Utilization %', 'Status',
    ];
    const rows = filteredDevs.map((d) => [
      d.name, d.role, d.activeProjects, d.assignedPoints, d.completedPoints,
      d.todayPoints, d.completionRate, d.tasksPending, d.bugs, d.utilization, d.devStatus,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'developer-performance.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isPeriod = !!range;

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Developer Performance</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track developer productivity, points, quality, and delivery performance.
            </p>
          </div>
        </div>
        {loading ? (
          <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-gray-400">
            <AlertCircle size={36} />
            <p className="text-sm font-semibold">Failed to load developer performance.</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  const { capacity, delivery, quality, timeline, daily, taskStatus, taskStatusColumns, topPerformers, capacityForecast, velocityTrend } = data;

  // When a date range is active but the period has no activity, show an explicit
  // empty state instead of a wall of zeros.
  const noPeriodData = !!range &&
    delivery.totalAssigned === 0 && delivery.totalCompleted === 0 &&
    taskStatus.total === 0 && quality.bugsRaised === 0 && daily.pointsToday === 0;

  // Leaderboard ranks by today's points for All Time, else by points completed in
  // the selected window — so the card label must reflect the active period.
  const periodLabel = !range
    ? 'Today'
    : preset === 'custom'
      ? `${range.start} → ${range.end}`
      : (DATE_PRESETS.find((p) => p.value === preset)?.label ?? 'Selected Range');

  // Full-scale for the velocity mini-bar = the busiest week in the trend, so the
  // bar reflects the headline relative to recent peak (not an arbitrary /3 = 300pts).
  const maxWeekly = Math.max(1, ...velocityTrend.map((w) => Math.max(w.assigned, w.completed)));

  // Task Status Overview is fully DYNAMIC — one slice per live Kanban column
  // (name + count aggregated across all projects), straight from the backend.
  // No hardcoded statuses: new/renamed/deleted/reordered columns flow through
  // automatically. Total + percentages derive from these same counts.
  const donutData = (taskStatusColumns ?? []).map((c) => ({ name: c.label, value: c.count }));
  const donutTotal = donutData.reduce((sum, d) => sum + d.value, 0);

  const cards: { title: string; icon: React.ReactNode; tone: string; metrics: Metric[] }[] = [
    {
      title: 'Team Capacity',
      icon: <Users className="h-5 w-5 text-indigo-600" />,
      tone: 'bg-indigo-50',
      metrics: [
        { label: 'Total Developers', value: String(capacity.totalDevelopers) },
        { label: 'Active Developers', value: String(capacity.activeDevelopers) },
        { label: 'Available', value: String(capacity.availableDevelopers) },
        { label: 'Utilization', value: `${capacity.utilization}%`, bar: { pct: capacity.utilization, tone: 'indigo' } },
      ],
    },
    {
      title: 'Delivery Performance',
      icon: <Rocket className="h-5 w-5 text-emerald-600" />,
      tone: 'bg-emerald-50',
      metrics: [
        { label: 'Points Assigned', value: delivery.totalAssigned.toLocaleString(), sub: 'pts' },
        { label: 'Points Completed', value: delivery.totalCompleted.toLocaleString(), sub: 'pts' },
        { label: 'Completion %', value: `${delivery.completionRate}%`, bar: { pct: delivery.completionRate, tone: 'emerald' } },
        { label: 'Velocity', value: String(delivery.velocityPerWeek), sub: 'pts/wk', bar: { pct: Math.min(100, Math.round((delivery.velocityPerWeek / maxWeekly) * 100)), tone: 'emerald' } },
      ],
    },
    {
      title: 'Quality Metrics',
      icon: <ShieldCheck className="h-5 w-5 text-teal-600" />,
      tone: 'bg-teal-50',
      metrics: [
        { label: 'Bugs Raised', value: String(quality.bugsRaised) },
        { label: 'Bugs Fixed', value: String(quality.bugsFixed) },
        { label: 'Reopen Rate', value: `${quality.reopenRate}%`, bar: { pct: quality.reopenRate, tone: 'amber' } },
        { label: 'QA Pass %', value: `${quality.qaPassRate}%`, bar: { pct: quality.qaPassRate, tone: 'emerald' } },
      ],
    },
    {
      title: 'Timeline Metrics',
      icon: <Clock className="h-5 w-5 text-sky-600" />,
      tone: 'bg-sky-50',
      metrics: [
        { label: 'Tasks Delayed', value: String(timeline.tasksDelayed) },
        { label: 'Tasks On Time', value: String(timeline.tasksOnTime) },
        { label: 'Avg Delay', value: String(timeline.avgDelayDays), sub: 'days', bar: { pct: Math.min(100, timeline.avgDelayDays * 20), tone: 'rose' } },
        { label: 'SLA %', value: `${timeline.slaPercent}%`, bar: { pct: timeline.slaPercent, tone: 'sky' } },
      ],
    },
    {
      title: isPeriod ? 'Period Productivity' : 'Daily Productivity',
      icon: <Zap className="h-5 w-5 text-amber-600" />,
      tone: 'bg-amber-50',
      metrics: [
        { label: isPeriod ? 'Points (Period)' : 'Points Today', value: String(daily?.pointsToday || 0) },
        { label: isPeriod ? 'Active (Period)' : 'Active Today', value: String(daily?.activeToday || 0) },
        { label: 'Avg Pts / Dev', value: String(daily?.avgPointsPerDev || 0) },
        { label: 'Top Contributor', value: daily?.topContributor?.name?.split(' ')[0] || '—', sub: daily?.topContributor ? `(${daily.topContributor.points})` : undefined },
      ],
    },
  ];

  const medalIcon = (i: number) => {
    if (i === 0) return <Trophy className="h-4 w-4 text-amber-500" />;
    if (i === 1) return <Medal className="h-4 w-4 text-gray-400" />;
    if (i === 2) return <Award className="h-4 w-4 text-orange-400" />;
    return <span className="text-xs font-semibold text-gray-400">{i + 1}</span>;
  };

  // PDF report — built from the live, already-loaded data and the CURRENT
  // filters (date range / view / search). Charts (Velocity Trend, Task Status)
  // are auto-captured by ExportPdfButton.
  const buildReport = (): DashboardReport => ({
    dashboardName: 'Developer Performance',
    fileBase: 'Developers_Dashboard',
    generatedBy: user?.name || user?.email || 'Founder / Admin',
    filters: [
      { label: 'Period', value: periodLabel },
      { label: 'View', value: view === 'all' ? 'All Developers' : view === 'active' ? 'Active' : 'Busy' },
      { label: 'Search', value: search.trim() || 'None' },
    ],
    kpis: cards.flatMap((c) => c.metrics.map((m) => ({ label: m.label, value: m.sub ? `${m.value} ${m.sub}` : m.value }))),
    tables: [
      {
        title: `Developers (${filteredDevs.length} shown)`,
        columns: ['Developer', 'Role', 'Projects', 'Assigned', 'Completed', isPeriod ? 'Period Pts' : 'Today Pts', 'Completion %', 'Pending', 'Bugs', 'Utilization %', 'Status'],
        rows: filteredDevs.map((d) => [
          d.name, d.role, d.activeProjects, d.assignedPoints, d.completedPoints,
          d.todayPoints, `${d.completionRate}%`, d.tasksPending, d.bugs, `${d.utilization}%`, d.devStatus,
        ]),
      },
      {
        title: `Top Performers · ${periodLabel}`,
        columns: ['#', 'Developer', 'Points'],
        rows: topPerformers.map((p, i) => [i + 1, p.name, p.points]),
      },
      {
        title: 'Capacity Forecast',
        columns: ['Developer', 'Current Load %', 'Available %'],
        rows: capacityForecast.map((c) => [c.name, `${c.currentLoad}%`, `${c.availableCapacity}%`]),
      },
    ],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Developer Performance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track developer productivity, points, quality, and delivery performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportPdfButton build={buildReport} />
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <select
              value={preset}
              onChange={(e) => onPresetChange(e.target.value)}
              aria-label="Date range"
              className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-8 text-sm font-medium text-gray-600 focus:border-indigo-400 focus:outline-none"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          {showCustom && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={customStart}
                max={customEnd || undefined}
                onChange={(e) => setCustomStart(e.target.value)}
                aria-label="Start date"
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-600 focus:border-indigo-400 focus:outline-none"
              />
              <span className="text-sm text-gray-400">to</span>
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                onChange={(e) => setCustomEnd(e.target.value)}
                aria-label="End date"
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-600 focus:border-indigo-400 focus:outline-none"
              />
              <button
                onClick={applyCustom}
                disabled={!customStart || !customEnd || customStart > customEnd}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={classNames("space-y-6 transition-opacity", loading && "opacity-50 pointer-events-none")}>
          {noPeriodData ? (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white text-gray-400">
          <Calendar size={36} />
          <p className="text-sm font-semibold text-gray-500">No performance data available for the selected date range.</p>
          <p className="text-xs">Try a different range or preset.</p>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map((c) => (
              <MetricCard key={c.title} title={c.title} icon={c.icon} tone={c.tone} metrics={c.metrics} />
            ))}
          </div>

          {/* Developers list */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-gray-800">Developers List</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={view}
                    onChange={(e) => setView(e.target.value as 'all' | 'active' | 'busy')}
                    className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-600 focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="all">All Developers</option>
                    <option value="active">Active</option>
                    <option value="busy">Busy</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search developers…"
                    className="w-48 rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={exportCsv}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3 min-w-[200px]">Developer</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-center">Projects</th>
                    <th className="px-4 py-3 text-center">Assigned</th>
                    <th className="px-4 py-3 text-center">Completed</th>
                    <th className="px-4 py-3 text-center min-w-[80px]">{isPeriod ? 'Period' : 'Today'}</th>
                    <th className="px-4 py-3 min-w-[140px]">Completion</th>
                    <th className="px-4 py-3 text-center">Pending</th>
                    <th className="px-4 py-3 text-center">Bugs</th>
                    <th className="px-4 py-3 min-w-[120px]">Last Activity</th>
                    <th className="px-4 py-3 min-w-[140px]">Utilization</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredDevs.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-10 text-center text-sm text-gray-400">
                        {data.developers.length === 0
                          ? 'No developer data available yet.'
                          : 'No developers match your filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredDevs.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className={classNames('flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold', avatarTone(d.id))}>
                                {initials(d.name)}
                              </div>
                              <span
                                className={classNames(
                                  'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white',
                                  d.online ? 'bg-emerald-500' : 'bg-gray-300',
                                )}
                              />
                            </div>
                            <span className="font-medium text-gray-800">{d.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{d.role}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{d.activeProjects}</td>
                        <td className="px-4 py-3 text-center font-medium text-gray-700">{d.assignedPoints}</td>
                        <td className="px-4 py-3 text-center font-medium text-emerald-600">{d.completedPoints}</td>
                        <td className="px-4 py-3 text-center text-gray-700">
                          {d.todayPoints > 0
                            ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">+{d.todayPoints}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-nowrap items-center gap-2">
                            <div className="h-1.5 w-16 shrink-0 rounded-full bg-gray-100">
                              <div
                                className={classNames('h-1.5 rounded-full', d.completionRate >= 65 ? 'bg-emerald-500' : 'bg-amber-500')}
                                style={{ width: `${Math.min(100, d.completionRate)}%` }}
                              />
                            </div>
                            <span className="shrink-0 text-xs font-medium text-gray-500">{d.completionRate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{d.tasksPending}</td>
                        <td className="px-4 py-3 text-center">
                          {d.bugs > 0
                            ? <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-600">{d.bugs}</span>
                            : <span className="text-gray-300">0</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-500">{relativeTime(d.lastActivity)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-nowrap items-center gap-2">
                            <div className="h-1.5 w-16 shrink-0 rounded-full bg-gray-100">
                              <div
                                className={classNames(
                                  'h-1.5 rounded-full',
                                  d.utilization >= 85 ? 'bg-rose-500' : d.utilization >= 70 ? 'bg-amber-500' : 'bg-indigo-500',
                                )}
                                style={{ width: `${Math.min(100, d.utilization)}%` }}
                              />
                            </div>
                            <span className="shrink-0 text-xs font-medium text-gray-500">{d.utilization}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={classNames(
                              'rounded-full px-2.5 py-1 text-xs font-semibold',
                              d.devStatus === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                            )}
                          >
                            {d.devStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          <MoreVertical className="h-4 w-4" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom panels */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Top performers today */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-800">
                {range ? `Top Performers · ${periodLabel}` : 'Top Performers Today'}
              </h3>
              {topPerformers.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  {range ? 'No points completed in this period.' : 'No points completed yet today.'}
                </p>
              ) : (
                <ul className="space-y-3">
                  {topPerformers.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center">{medalIcon(i)}</div>
                      <div className={classNames('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold', avatarTone(i + 3))}>
                        {initials(p.name)}
                      </div>
                      <span className="flex-1 font-medium text-gray-800">{p.name}</span>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        {p.points} pts
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Capacity forecast */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-800">Capacity Forecast</h3>
              {capacityForecast.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No capacity data available.</p>
              ) : (
                <ul className="space-y-3.5">
                  {capacityForecast.map((c) => (
                    <li key={c.id}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{c.name}</span>
                        <span className="text-xs text-gray-400">{c.availableCapacity}% free</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div
                          className={classNames(
                            'h-2 rounded-full',
                            c.currentLoad >= 85 ? 'bg-rose-500' : c.currentLoad >= 70 ? 'bg-amber-500' : 'bg-emerald-500',
                          )}
                          style={{ width: `${Math.min(100, c.currentLoad)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Weekly velocity trend */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-800">Weekly Velocity Trend</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={velocityTrend} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="assigned" name="Assigned" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Task status overview — dynamic Kanban columns */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-800">Task Status Overview</h3>
              {donutData.length === 0 || donutTotal === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  {donutData.length === 0 ? 'No Kanban columns found yet.' : 'No tasks in any column yet.'}
                </p>
              ) : (
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="relative h-[200px] w-[200px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={88}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {donutData.map((_, i) => (
                            <Cell key={i} fill={donutColor(i)} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-gray-900">{donutTotal}</span>
                      <span className="text-xs text-gray-400">Total Tasks</span>
                    </div>
                  </div>
                  <ul className="flex-1 space-y-2 max-h-[220px] overflow-y-auto">
                    {donutData.map((s, i) => (
                      <li key={s.name} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: donutColor(i) }} />
                        <span className="flex-1 text-gray-600 truncate" title={s.name}>{s.name}</span>
                        <span className="font-semibold text-gray-800">{s.value}</span>
                        <span className="w-10 text-right text-xs text-gray-400">
                          {donutTotal > 0 ? Math.round(((s.value || 0) / donutTotal) * 100) : 0}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
    </div>
  );
}
