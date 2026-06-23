'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Users, Rocket, ShieldCheck, Clock, Zap, Search, Download, Filter,
  Calendar, Loader2, AlertCircle, Trophy, Award, Medal, ChevronDown, MoreVertical,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  fetchDeveloperPerformance, DeveloperPerformance, DeveloperRow,
} from '@/lib/api/developerPerformance';
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

function currentWeekLabel(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const monOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + monOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(start)} - ${fmt(end)}`;
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

const DONUT_COLORS = ['#94a3b8', '#6366f1', '#f59e0b', '#a855f7', '#10b981'];

export function DeveloperPerformanceView() {
  const [data, setData] = useState<DeveloperPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'all' | 'active' | 'busy'>('all');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetchDeveloperPerformance();
        if (alive) setData(res);
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

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
    const headers = [
      'Developer', 'Role', 'Active Projects', 'Assigned Points', 'Completed Points',
      'Today Pts', 'Completion %', 'Tasks Pending', 'Bugs', 'Utilization %', 'Status',
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

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
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
    );
  }

  const { capacity, delivery, quality, timeline, daily, taskStatus, topPerformers, capacityForecast, velocityTrend } = data;

  // Full-scale for the velocity mini-bar = the busiest week in the trend, so the
  // bar reflects the headline relative to recent peak (not an arbitrary /3 = 300pts).
  const maxWeekly = Math.max(1, ...velocityTrend.map((w) => Math.max(w.assigned, w.completed)));

  const donutData = [
    { name: 'To Do', value: taskStatus.todo },
    { name: 'In Progress', value: taskStatus.inProgress },
    { name: 'Review', value: taskStatus.review },
    { name: 'QA', value: taskStatus.qa },
    { name: 'Completed', value: taskStatus.completed },
  ];

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
      title: 'Daily Productivity',
      icon: <Zap className="h-5 w-5 text-amber-600" />,
      tone: 'bg-amber-50',
      metrics: [
        { label: 'Points Today', value: String(daily.pointsToday) },
        { label: 'Active Today', value: String(daily.activeToday) },
        { label: 'Avg Pts / Dev', value: String(daily.avgPointsPerDev) },
        { label: 'Top Contributor', value: daily.topContributor?.name?.split(' ')[0] || '—', sub: daily.topContributor ? `(${daily.topContributor.points})` : undefined },
      ],
    },
  ];

  const medalIcon = (i: number) => {
    if (i === 0) return <Trophy className="h-4 w-4 text-amber-500" />;
    if (i === 1) return <Medal className="h-4 w-4 text-gray-400" />;
    if (i === 2) return <Award className="h-4 w-4 text-orange-400" />;
    return <span className="text-xs font-semibold text-gray-400">{i + 1}</span>;
  };

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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400" />
            {currentWeekLabel()}
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

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
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3">Developer</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-center">Projects</th>
                <th className="px-4 py-3 text-center">Assigned</th>
                <th className="px-4 py-3 text-center">Completed</th>
                <th className="px-4 py-3 text-center">Today</th>
                <th className="px-4 py-3">Completion</th>
                <th className="px-4 py-3 text-center">Pending</th>
                <th className="px-4 py-3 text-center">Bugs</th>
                <th className="px-4 py-3">Last Activity</th>
                <th className="px-4 py-3">Utilization</th>
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
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-gray-100">
                          <div
                            className={classNames('h-1.5 rounded-full', d.completionRate >= 65 ? 'bg-emerald-500' : 'bg-amber-500')}
                            style={{ width: `${d.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-500">{d.completionRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{d.tasksPending}</td>
                    <td className="px-4 py-3 text-center">
                      {d.bugs > 0
                        ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">{d.bugs}</span>
                        : <span className="text-gray-300">0</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{relativeTime(d.lastActivity)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-gray-100">
                          <div
                            className={classNames(
                              'h-1.5 rounded-full',
                              d.utilization >= 85 ? 'bg-rose-500' : d.utilization >= 70 ? 'bg-amber-500' : 'bg-indigo-500',
                            )}
                            style={{ width: `${d.utilization}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-500">{d.utilization}%</span>
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
          <h3 className="mb-4 text-base font-semibold text-gray-800">Top Performers Today</h3>
          {topPerformers.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No points completed yet today.</p>
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
                      style={{ width: `${c.currentLoad}%` }}
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

        {/* Task status overview */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-800">Task Status Overview</h3>
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
                      <Cell key={i} fill={DONUT_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{taskStatus.total}</span>
                <span className="text-xs text-gray-400">Total Tasks</span>
              </div>
            </div>
            <ul className="flex-1 space-y-2">
              {donutData.map((s, i) => (
                <li key={s.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[i] }} />
                  <span className="flex-1 text-gray-600">{s.name}</span>
                  <span className="font-semibold text-gray-800">{s.value}</span>
                  <span className="w-10 text-right text-xs text-gray-400">
                    {taskStatus.total > 0 ? Math.round(((s.value || 0) / taskStatus.total) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
