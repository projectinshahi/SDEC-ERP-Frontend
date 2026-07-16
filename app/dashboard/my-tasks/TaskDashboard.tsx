'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  ListTodo, Activity, Circle, PlayCircle, PauseCircle, CheckCircle2, BadgeCheck,
  AlertTriangle, CalendarClock, RefreshCw, X, Users, BarChart3, Building2, Crown, Clock,
} from 'lucide-react';
import {
  useMasterResource, ModuleLoading, StatCard, ChartCard, DonutChart, LineTrend,
  CategoryBars, ChartEmpty, CHART_COLORS,
} from '@/components/master/MasterKit';
import {
  fetchMyTaskDashboard,
  type MyTaskDashboardData, type MyTaskDashboardEmployee, type MyTaskBottleneckRow,
} from '@/lib/api/myTasks';
import { classNames } from '@/lib/utils';

/**
 * Global Task Dashboard (Phase 1) — org-wide analytics for the My Tasks module.
 *
 * Reuses, rather than re-creates: MasterKit's useMasterResource (fetch lifecycle +
 * loading/error/forbidden states + polling), StatCard / ChartCard / DonutChart /
 * LineTrend / CategoryBars (recharts) and CHART_COLORS. Data comes from the single
 * GET /my-tasks/dashboard aggregation endpoint (no duplicate calculations client-side).
 *
 * LIVE DATA: the existing `mytask_changed` socket only fans out to each affected
 * user's PERSONAL room, so it cannot push other people's task changes to a Founder.
 * Org-wide freshness therefore comes from useMasterResource polling; the socket is
 * additionally used as an instant nudge for tasks the viewer is part of.
 */

const SORTS = [
  { key: 'completion_desc', label: 'Highest Completion %' },
  { key: 'completion_asc', label: 'Lowest Completion %' },
  { key: 'pending_desc', label: 'Highest Pending' },
  { key: 'delayed_desc', label: 'Highest Delayed' },
  { key: 'active_desc', label: 'Most Active' },
  { key: 'active_asc', label: 'Least Active' },
] as const;
type SortKey = typeof SORTS[number]['key'];

const PRIORITIES = ['urgent', 'high', 'medium', 'low'];

const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'employees', label: 'Employees', icon: Users },
  { key: 'departments', label: 'Departments', icon: Building2 },
  { key: 'executive', label: 'Executive', icon: Crown },
] as const;
type TabKey = typeof TABS[number]['key'];

function initials(name: string) {
  return (name || '?').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

/** Completion badge — mirrors the ERP badge language used elsewhere. */
function perfBadge(pct: number, total: number) {
  if (!total) return { label: 'No tasks', tone: 'bg-slate-100 text-slate-500 border-slate-200' };
  if (pct >= 80) return { label: 'Excellent', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (pct >= 50) return { label: 'On Track', tone: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (pct >= 25) return { label: 'At Risk', tone: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Needs Attention', tone: 'bg-rose-50 text-rose-700 border-rose-200' };
}

function Bar({ pct }: { pct: number }) {
  const tone = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : pct >= 25 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full min-w-[60px] overflow-hidden rounded-full bg-slate-100">
        <div className={classNames('h-full rounded-full transition-all', tone)} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-bold text-slate-600">{pct}%</span>
    </div>
  );
}

/** Ranked people list used by the executive Bottlenecks cards. */
function BottleneckList({ rows, metric }: { rows: MyTaskBottleneckRow[]; metric: 'pending' | 'delayed' }) {
  if (!rows.length) return <ChartEmpty label={metric === 'delayed' ? 'Nothing overdue' : 'No open work'} />;
  const max = Math.max(...rows.map((r) => r[metric]), 1);
  return (
    <ul className="space-y-2.5 py-1">
      {rows.map((r) => (
        <li key={r.userId} className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
            {initials(r.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-semibold text-slate-700">{r.name}</span>
              <span className={classNames('shrink-0 text-sm font-bold', metric === 'delayed' ? 'text-rose-600' : 'text-slate-700')}>
                {r[metric]}
              </span>
            </span>
            <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <span
                className={classNames('block h-full rounded-full', metric === 'delayed' ? 'bg-rose-500' : 'bg-indigo-500')}
                style={{ width: `${Math.round((r[metric] / max) * 100)}%` }}
              />
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-slate-400">{r.department}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Select({
  label, value, onChange, children,
}: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
      >
        {children}
      </select>
    </label>
  );
}

export function TaskDashboard() {
  // Filters — kept as PRIMITIVES so the fetcher useCallback stays stable and only
  // re-runs when a filter genuinely changes (useMasterResource re-fetches on identity).
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [inChargeId, setInChargeId] = useState('');
  const [sort, setSort] = useState<SortKey>('completion_desc');
  const [tab, setTab] = useState<TabKey>('overview');

  const fetcher = useCallback(
    () => fetchMyTaskDashboard({
      employeeId: employeeId ? Number(employeeId) : null,
      department: department || null,
      projectId: projectId || null,
      startDate: startDate || null,
      endDate: endDate || null,
      status: status || null,
      priority: priority || null,
      inChargeId: inChargeId ? Number(inChargeId) : null,
    }),
    [employeeId, department, projectId, startDate, endDate, status, priority, inChargeId],
  );

  const res = useMasterResource<MyTaskDashboardData>(fetcher, { pollMs: 30_000 });

  // Instant nudge for tasks the viewer is part of (org-wide freshness = polling).
  const refreshRef = useRef(res.refresh);
  refreshRef.current = res.refresh;
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socketUrl = apiUrl.endsWith('/api') ? apiUrl.replace('/api', '') : apiUrl;
    const socket = io(socketUrl, { auth: { token }, withCredentials: true });
    let t: any = null;
    socket.on('mytask_changed', () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => refreshRef.current(), 400);
    });
    return () => { if (t) clearTimeout(t); socket.disconnect(); };
  }, []);

  const data = res.data;
  const opts = data?.filterOptions;

  const filtersDirty = !!(employeeId || department || projectId || startDate || endDate || status || priority || inChargeId);
  const clearFilters = () => {
    setEmployeeId(''); setDepartment(''); setProjectId(''); setStartDate('');
    setEndDate(''); setStatus(''); setPriority(''); setInChargeId('');
  };

  const employees = useMemo(() => {
    const rows: MyTaskDashboardEmployee[] = [...(data?.employees || [])];
    switch (sort) {
      case 'completion_asc': return rows.sort((a, b) => a.completionPct - b.completionPct);
      case 'pending_desc': return rows.sort((a, b) => b.pending - a.pending);
      case 'delayed_desc': return rows.sort((a, b) => b.delayed - a.delayed);
      case 'active_desc': return rows.sort((a, b) => b.total - a.total);
      case 'active_asc': return rows.sort((a, b) => a.total - b.total);
      default: return rows.sort((a, b) => b.completionPct - a.completionPct);
    }
  }, [data?.employees, sort]);

  // Only blank the screen on the very first load — filter changes keep prior data
  // on screen (no skeleton flash) while the new payload arrives.
  if (res.isLoading && !data) return <ModuleLoading />;
  if (res.status === 'forbidden') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-12 text-center">
        <p className="font-semibold text-amber-800">You do not have access to the Task Dashboard.</p>
        <p className="mt-1 text-sm text-amber-700">This view requires the “View Task Dashboard” permission.</p>
      </div>
    );
  }
  if (res.status === 'error' || (!data && !res.isLoading)) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
        <p className="font-semibold text-rose-700">{res.errorMsg || 'Failed to load the Task Dashboard.'}</p>
        <button type="button" onClick={res.reload} className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700">
          Retry
        </button>
      </div>
    );
  }
  if (!data) return null;

  const s = data.summary;
  const cards: Array<{ label: string; value: number; icon: any; tone: string; statusKey?: string }> = [
    { label: 'Total Tasks', value: s.total, icon: ListTodo, tone: 'slate' },
    { label: 'Active Tasks', value: s.active, icon: Activity, tone: 'indigo' },
    { label: 'To Do', value: s.todo, icon: Circle, tone: 'slate', statusKey: 'todo' },
    { label: 'In Progress', value: s.inProgress, icon: PlayCircle, tone: 'blue', statusKey: 'in_progress' },
    { label: 'Waiting', value: s.waiting, icon: PauseCircle, tone: 'amber', statusKey: 'waiting' },
    { label: 'Done', value: s.done, icon: CheckCircle2, tone: 'violet', statusKey: 'done' },
    { label: 'Approved', value: s.approved, icon: BadgeCheck, tone: 'emerald', statusKey: 'approved' },
    { label: 'Delayed', value: s.delayed, icon: AlertTriangle, tone: 'rose' },
    { label: 'Due Today', value: s.dueToday, icon: CalendarClock, tone: 'amber' },
  ];

  return (
    <div className="space-y-5">
      {/* ── Global filters ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          <Select label="Employee" value={employeeId} onChange={setEmployeeId}>
            <option value="">All</option>
            {(opts?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
          <Select label="Department" value={department} onChange={setDepartment}>
            <option value="">All</option>
            {(opts?.departments || []).map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select label="Project" value={projectId} onChange={setProjectId}>
            <option value="">All</option>
            {(opts?.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="In-Charge" value={inChargeId} onChange={setInChargeId}>
            <option value="">Any</option>
            {(opts?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
          <Select label="Status" value={status} onChange={setStatus}>
            <option value="">All</option>
            {(opts?.statuses || []).map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
          </Select>
          <Select label="Priority" value={priority} onChange={setPriority}>
            <option value="">All</option>
            {PRIORITIES.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
          </Select>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">From</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30" />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">To</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30" />
          </label>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5">
          <p className="text-[11px] text-slate-400">
            Live · auto-refreshes every 30s
            {res.lastUpdated && <> · updated {res.lastUpdated.toLocaleTimeString()}</>}
            {res.isRefreshing && <span className="ml-1 text-indigo-500">· refreshing…</span>}
          </p>
          <div className="flex items-center gap-1.5">
            {filtersDirty && (
              <button type="button" onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50">
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
            <button type="button" onClick={res.refresh} title="Refresh now"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600">
              <RefreshCw className={classNames('h-3.5 w-3.5', res.isRefreshing && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary cards (status cards are click-to-filter) ───────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <StatCard
            key={c.label}
            label={c.label}
            value={c.value}
            icon={c.icon}
            tone={c.tone}
            alert={c.label === 'Delayed' && c.value > 0}
            active={!!c.statusKey && status === c.statusKey}
            onClick={c.statusKey ? () => setStatus((prev) => (prev === c.statusKey ? '' : c.statusKey!)) : undefined}
          />
        ))}
      </div>

      {/* ── Sub-tabs ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={classNames(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                active ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-white/60 hover:text-slate-700',
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Overview ───────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Status Distribution" subtitle="Across the filtered task set">
          <DonutChart data={data.statusDistribution} />
        </ChartCard>
        <ChartCard title="Priority Breakdown" subtitle="Tasks by priority">
          <CategoryBars data={data.priorityDistribution} />
        </ChartCard>
        <ChartCard title="Task Trend" subtitle="Created vs completed · last 30 days" className="lg:col-span-1">
          <LineTrend
            data={data.trend}
            height={240}
            series={[
              { key: 'created', name: 'Created', color: CHART_COLORS[0] },
              { key: 'completed', name: 'Completed', color: CHART_COLORS[1] },
            ]}
          />
        </ChartCard>
      </div>
      )}

      {tab === 'overview' && (
        <ChartCard title="Overdue Work" subtitle="Currently-overdue tasks, by the day they were due · last 30 days">
          <LineTrend
            data={data.delayedTrend}
            height={220}
            series={[{ key: 'delayed', name: 'Overdue', color: '#ef4444' }]}
          />
        </ChartCard>
      )}

      {/* ── Employee performance ───────────────────────────────────────────── */}
      {tab === 'employees' && (
      <ChartCard
        title="Employee Performance"
        subtitle={`${employees.length} ${employees.length === 1 ? 'person' : 'people'} with assigned tasks`}
        action={(
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            {SORTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        )}
      >
        {employees.length === 0 ? (
          <ChartEmpty label="No employees match these filters" />
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {['Employee', 'Department', 'Total', 'Completed', 'Pending', 'Waiting', 'Delayed', 'Completion', 'Avg Time', ''].map((h) => (
                    <th key={h} className="px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => {
                  const badge = perfBadge(e.completionPct, e.total);
                  return (
                    <tr key={e.userId} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                            {initials(e.name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800">{e.name}</span>
                            {e.designation && <span className="block truncate text-[11px] text-slate-400">{e.designation}</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                          {e.department}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-sm font-bold text-slate-700">{e.total}</td>
                      <td className="px-2 py-2.5 text-sm font-semibold text-emerald-600">{e.completed}</td>
                      <td className="px-2 py-2.5 text-sm font-semibold text-slate-600">{e.pending}</td>
                      <td className="px-2 py-2.5 text-sm font-semibold text-amber-600">{e.waiting}</td>
                      <td className={classNames('px-2 py-2.5 text-sm font-semibold', e.delayed > 0 ? 'text-rose-600' : 'text-slate-400')}>{e.delayed}</td>
                      <td className="px-2 py-2.5 min-w-[130px]"><Bar pct={e.completionPct} /></td>
                      <td className="px-2 py-2.5 text-xs font-medium text-slate-500">
                        {e.avgCompletionHours == null
                          ? <span className="text-slate-300">—</span>
                          : e.avgCompletionHours >= 24
                            ? `${(e.avgCompletionHours / 24).toFixed(1)}d`
                            : `${e.avgCompletionHours}h`}
                      </td>
                      <td className="px-2 py-2.5">
                        <span className={classNames('inline-flex whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', badge.tone)}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
      )}

      {/* ── Department performance ─────────────────────────────────────────── */}
      {tab === 'departments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Department Comparison" subtitle="Total tasks per department">
              <CategoryBars data={data.departments.map((d) => ({ label: d.department, value: d.total }))} />
            </ChartCard>
            <ChartCard title="Open Workload by Department" subtitle="Tasks not yet completed">
              <CategoryBars data={data.workload.byDepartment} />
            </ChartCard>
          </div>

          <ChartCard
            title="Department Performance"
            subtitle={`${data.departments.length} ${data.departments.length === 1 ? 'department' : 'departments'} · derived from employee records, never hardcoded`}
          >
            {data.departments.length === 0 ? (
              <ChartEmpty label="No department data for these filters" />
            ) : (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-left">
                      {['Department', 'People', 'Total', 'Completed', 'Pending', 'Waiting', 'Delayed', 'Completion'].map((h) => (
                        <th key={h} className="px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.departments.map((d) => (
                      <tr key={d.department} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60">
                        <td className="px-2 py-2.5">
                          <span className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                            <span className="text-sm font-semibold text-slate-800">{d.department}</span>
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-sm text-slate-500">{d.people}</td>
                        <td className="px-2 py-2.5 text-sm font-bold text-slate-700">{d.total}</td>
                        <td className="px-2 py-2.5 text-sm font-semibold text-emerald-600">{d.completed}</td>
                        <td className="px-2 py-2.5 text-sm font-semibold text-slate-600">{d.pending}</td>
                        <td className="px-2 py-2.5 text-sm font-semibold text-amber-600">{d.waiting}</td>
                        <td className={classNames('px-2 py-2.5 text-sm font-semibold', d.delayed > 0 ? 'text-rose-600' : 'text-slate-400')}>{d.delayed}</td>
                        <td className="min-w-[140px] px-2 py-2.5"><Bar pct={d.completionPct} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        </div>
      )}

      {/* ── Founder / CEO executive view ───────────────────────────────────── */}
      {tab === 'executive' && (
        <div className="space-y-4">
          <ChartCard
            title="Company Progress"
            subtitle={`${data.companyProgress.completed} of ${data.companyProgress.total} tasks completed · ${data.companyProgress.people} people involved`}
          >
            <div className="space-y-3 py-2">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-slate-500">Overall completion</span>
                  <span className="text-3xl font-bold text-slate-800">{data.companyProgress.completionPct}%</span>
                </div>
                <Bar pct={data.companyProgress.completionPct} />
              </div>
              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { label: 'Approved', value: data.companyProgress.approvedPct, tone: 'text-emerald-600' },
                  { label: 'Active', value: data.companyProgress.activePct, tone: 'text-blue-600' },
                  { label: 'Delayed', value: data.companyProgress.delayedPct, tone: 'text-rose-600' },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-center">
                    <p className={classNames('text-xl font-bold', m.tone)}>{m.value}%</p>
                    <p className="text-[11px] font-medium text-slate-500">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Bottlenecks · Highest Pending" subtitle="People carrying the most open work">
              <BottleneckList rows={data.bottlenecks.highestPending} metric="pending" />
            </ChartCard>
            <ChartCard title="Bottlenecks · Highest Delayed" subtitle="People with the most overdue work">
              <BottleneckList rows={data.bottlenecks.highestDelayed} metric="delayed" />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Workload · By Department" subtitle="Open tasks per department">
              <CategoryBars data={data.workload.byDepartment} dense />
            </ChartCard>
            <ChartCard title="Workload · By Employee" subtitle="Top 10 by open tasks">
              <CategoryBars data={data.workload.byEmployee} dense />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Recently Completed" subtitle="Latest finished work">
              {data.recentlyCompleted.length === 0 ? (
                <ChartEmpty label="Nothing completed yet" />
              ) : (
                <ul className="divide-y divide-slate-50">
                  {data.recentlyCompleted.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-700">{r.title}</span>
                          {r.completedBy && <span className="block text-[11px] text-slate-400">by {r.completedBy}</span>}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {new Date(r.completedAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ChartCard>

            <ChartCard title="Upcoming Deadlines" subtitle="Nearest open tasks by due date">
              {data.upcomingDeadlines.length === 0 ? (
                <ChartEmpty label="No upcoming deadlines" />
              ) : (
                <ul className="divide-y divide-slate-50">
                  {data.upcomingDeadlines.map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-700">{u.title}</span>
                          {u.inCharge && <span className="block text-[11px] text-slate-400">{u.inCharge}</span>}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                        {u.dueDate}{u.dueTime ? ` · ${u.dueTime}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ChartCard>
          </div>
        </div>
      )}

      <p className="flex items-center gap-1.5 px-1 text-[11px] text-slate-400">
        <Users className="h-3 w-3" />
        A task counts toward every assigned member. Average completion time is derived from the
        task activity timeline, so tasks completed before activity logging began show “—”.
      </p>
    </div>
  );
}
