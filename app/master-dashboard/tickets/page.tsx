'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Siren, Download, AlertTriangle, ShieldAlert, Flame, CheckCircle2,
  CheckCheck, Loader, MessageSquare, ArrowUp, ArrowDown, Search, ChevronLeft,
  ChevronRight, ArrowRight, ArrowUpDown, Users,
} from 'lucide-react';
import { fetchMasterTickets, MasterTicket, AgentPerformance } from '@/lib/api/masterModules';
import {
  useMasterResource, ModuleStateScreen, ModuleHeader, ChartCard, DonutChart,
  CategoryBars, LineTrend, GroupedTrend, ActivityFeed, EmptyState,
} from '@/components/master/MasterKit';
import { ExportPdfButton } from '@/components/master/ExportPdfButton';
import type { DashboardReport } from '@/lib/pdf/dashboardPdf';
import { useAuth } from '@/lib/hooks/useAuth';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Card } from '@/components/Card';
import { classNames } from '@/lib/utils';

// ── Vocabularies (mirror the backend) ───────────────────────────────────────
const PRIO_CRIT = ['critical', 'urgent', 'blocker', 'p0', 'p1', 'sev1'];
const PRIO_HIGH = ['high', 'major', 'p2', 'sev2'];
const PRIO_MED = ['medium', 'normal', 'moderate', 'p3', 'sev3'];
const PRIO_LOW = ['low', 'minor', 'trivial', 'p4', 'sev4'];
const RESOLVED = ['resolved', 'done', 'fixed'];
const CLOSED = ['closed', 'completed'];
const PENDING = ['pending', 'waiting', 'awaiting', 'awaiting_response', 'awaiting-response', 'awaiting response', 'need_info', 'needs_info', 'needs info', 'on_hold', 'on-hold', 'on hold', 'blocked', 'customer'];

const PRIORITY_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

function priorityMeta(severity: string) {
  const s = (severity || '').toLowerCase();
  if (PRIO_CRIT.includes(s)) return { label: 'Critical', rank: 4, cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' };
  if (PRIO_HIGH.includes(s)) return { label: 'High', rank: 3, cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' };
  if (PRIO_MED.includes(s)) return { label: 'Medium', rank: 2, cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' };
  if (PRIO_LOW.includes(s)) return { label: 'Low', rank: 1, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' };
  return { label: severity || '—', rank: 0, cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
}

function statusCls(status: string) {
  const s = (status || '').toLowerCase();
  if (RESOLVED.includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
  if (CLOSED.includes(s)) return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  if (PENDING.includes(s)) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
  return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function fmtHours(h: number | null) {
  if (h == null) return 'N/A';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h}h`;
  return `${(h / 24).toFixed(1)}d`;
}

const PAGE_SIZE = 10;
type SortKey = 'created' | 'updated' | 'priority';

export default function MasterTicketsPage() {
  const { user } = useAuth();
  // Live sync stays always-on (60s background poll). The manual Auto/Refresh
  // controls were removed from the header, but the real-time refresh continues.
  const { data, status, errorMsg, reload } = useMasterResource(fetchMasterTickets, { pollMs: 60000 });

  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'created', dir: 'desc' });
  const [page, setPage] = useState(1);

  const tickets = useMemo(() => data?.tickets ?? [], [data]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.category).filter(Boolean))).sort(),
    [tickets],
  );
  const assigneeOptions = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.assignee?.name).filter(Boolean))).sort() as string[],
    [tickets],
  );

  const filteredSorted = useMemo(() => {
    const now = Date.now();
    const dayMs = 86400000;
    let rows = tickets.filter((t) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || t.title.toLowerCase().includes(q) || `tkt-${t.id}`.includes(q) || String(t.id).includes(q);
      const matchesPriority = priorityFilter === 'all' || priorityMeta(t.severity).label === priorityFilter;
      const s = (t.status || '').toLowerCase();
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'open' && !RESOLVED.includes(s) && !CLOSED.includes(s)) ||
        (statusFilter === 'resolved' && RESOLVED.includes(s)) ||
        (statusFilter === 'closed' && CLOSED.includes(s)) ||
        (statusFilter === 'pending' && PENDING.includes(s)) ||
        (statusFilter === 'escalated' && !!t.escalationLevel && t.escalationLevel.toLowerCase() !== 'none');
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      const matchesAssignee = assigneeFilter === 'all' || t.assignee?.name === assigneeFilter;
      const created = t.createdAt ? new Date(t.createdAt).getTime() : 0;
      const matchesDate =
        dateFilter === 'all' ||
        (dateFilter === 'today' && created >= now - dayMs) ||
        (dateFilter === '7d' && created >= now - 7 * dayMs) ||
        (dateFilter === '30d' && created >= now - 30 * dayMs);
      return matchesSearch && matchesPriority && matchesStatus && matchesCategory && matchesAssignee && matchesDate;
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      let cmp: number;
      if (sort.key === 'priority') cmp = priorityMeta(a.severity).rank - priorityMeta(b.severity).rank;
      else {
        const av = new Date((sort.key === 'created' ? a.createdAt : a.updatedAt) || 0).getTime();
        const bv = new Date((sort.key === 'created' ? b.createdAt : b.updatedAt) || 0).getTime();
        cmp = av - bv;
      }
      if (cmp === 0) cmp = a.id - b.id; // stable tiebreaker
      return cmp * dir;
    });
    return rows;
  }, [tickets, search, priorityFilter, statusFilter, categoryFilter, assigneeFilter, dateFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const resetPage = () => setPage(1);

  // Keep page state clamped to the valid range when the dataset shrinks (e.g. a
  // silent auto-refresh) — without yanking a browsing user back to page 1.
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [safePage, page]);

  if (status !== 'ready' || !data) {
    return <ModuleStateScreen status={status} errorMsg={errorMsg} onRetry={reload} />;
  }

  const { stats, indicators, charts, agents, workload, topReporters, activities, slaHours } = data;
  const trendData = charts.resolutionTrend.slice(-range);
  const activeCount = Math.max(stats.total - stats.resolved - stats.closed, 0);
  const pctOf = (p: number, w: number) => (w > 0 ? Math.round((p / w) * 100) : 0);

  const exportCsv = () => {
    const headers = ['Ticket ID', 'Subject', 'Reporter', 'Project', 'Category', 'Priority', 'Status', 'Assignee', 'Created Date', 'Updated Date'];
    const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = [headers.join(',')];
    for (const t of filteredSorted) {
      lines.push([
        `TKT-${t.id}`, t.title, t.reporter?.name || '', t.project?.name || '', t.category,
        priorityMeta(t.severity).label, t.status || '', t.assignee?.name || 'Unassigned',
        t.createdAt ? new Date(t.createdAt).toLocaleString() : '',
        t.updatedAt ? new Date(t.updatedAt).toLocaleString() : '',
      ].map((v) => cell(String(v))).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'support-tickets.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));

  // PDF report — a proper branded document (NOT a page screenshot) built from the
  // already-loaded, currently-FILTERED ticket data. KPIs + charts + the ENTIRE
  // filtered ticket list are exported; the shared template paginates long tables
  // across pages automatically. Charts are auto-captured from the live recharts.
  const buildReport = (): DashboardReport => {
    const filters: { label: string; value: string }[] = [];
    if (search.trim()) filters.push({ label: 'Search', value: search.trim() });
    if (statusFilter !== 'all') filters.push({ label: 'Status', value: statusFilter });
    if (priorityFilter !== 'all') filters.push({ label: 'Priority', value: priorityFilter });
    if (categoryFilter !== 'all') filters.push({ label: 'Category', value: categoryFilter });
    if (assigneeFilter !== 'all') filters.push({ label: 'Assignee', value: assigneeFilter });
    if (dateFilter !== 'all') {
      const dl: Record<string, string> = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days' };
      filters.push({ label: 'Date', value: dl[dateFilter] ?? dateFilter });
    }
    // Always note the Resolution-Trends window — it's baked into the captured
    // trend chart, so the reader needs it to interpret that chart's time scope.
    filters.push({ label: 'Trend window', value: `Last ${range} days` });
    return {
      dashboardName: 'Tickets Report',
      fileBase: 'Tickets_Report',
      generatedBy: user?.name || user?.email || 'Founder / Admin',
      filters,
      kpis: [
        { label: 'Total Tickets', value: stats.total },
        { label: 'Open', value: stats.open },
        { label: 'In Progress', value: stats.inProgress },
        { label: 'Resolved', value: stats.resolved },
        { label: 'Closed', value: stats.closed },
        { label: 'Pending Reply', value: stats.pendingReply },
        { label: 'Critical', value: stats.critical },
        { label: 'Escalated', value: stats.escalated },
      ],
      tables: [
        {
          title: `All Tickets (${filteredSorted.length})`,
          note: 'Complete filtered ticket list — every matching ticket is included.',
          columns: ['Ticket ID', 'Subject', 'Reporter', 'Project', 'Category', 'Priority', 'Status', 'Assignee', 'Created', 'Updated'],
          rows: filteredSorted.map((t) => [
            `TKT-${t.id}`,
            t.title,
            t.reporter?.name || '—',
            t.project?.name || '—',
            t.category || '—',
            priorityMeta(t.severity).label,
            t.status || 'unknown',
            t.assignee?.name || 'Unassigned',
            fmtDate(t.createdAt),
            fmtDate(t.updatedAt),
          ]),
        },
        {
          title: `Agent Performance (${agents.length})`,
          columns: ['Agent', 'Assigned', 'Resolved', 'Escalated', 'Avg Resolution', 'CSAT', 'Resolution Rate'],
          rows: agents.map((a) => [
            a.name, a.assigned, a.resolved, a.escalated,
            fmtHours(a.avgResolutionHours), a.csat == null ? 'N/A' : a.csat, `${a.resolutionRate}%`,
          ]),
        },
      ],
    };
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ModuleHeader
        icon={Siren}
        title="Support Ticket Dashboard"
        subtitle="Monitor, manage, and resolve all customer support tickets in real time."
        accent="bg-rose-600"
        shadow="shadow-rose-500/20"
        actions={
          <>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <ExportPdfButton build={buildReport} />
          </>
        }
      />

      {/* KPI CARDS — 7 */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard label="Open" value={stats.open} icon={AlertTriangle} tone="amber"
          description="Awaiting action"
          trend={indicators.openNetToday !== 0 ? { text: `${Math.abs(indicators.openNetToday)} net today`, dir: indicators.openNetToday > 0 ? 'up' : 'down', good: indicators.openNetToday < 0 } : undefined}
          badge={indicators.openNetToday === 0 ? { text: `${stats.newToday} new today`, tone: 'slate' } : undefined} />
        <KpiCard label="In Progress" value={stats.inProgress} icon={Loader} tone="blue"
          description="Being worked on" badge={{ text: `${pctOf(stats.inProgress, activeCount)}% of active`, tone: 'blue' }} />
        <KpiCard label="Resolved" value={stats.resolved} icon={CheckCircle2} tone="emerald"
          description="This week trend"
          trend={{ text: `${Math.abs(indicators.resolvedWeekVsLastPct)}%`, dir: indicators.resolvedWeekVsLastPct >= 0 ? 'up' : 'down', good: indicators.resolvedWeekVsLastPct >= 0 }} />
        <KpiCard label="Closed" value={stats.closed} icon={CheckCheck} tone="slate"
          description="Completed" badge={{ text: `${pctOf(stats.closed, stats.total)}% of all`, tone: 'slate' }} />
        <KpiCard label="Pending Reply" value={stats.pendingReply} icon={MessageSquare} tone="indigo"
          description="Awaiting reply" badge={{ text: `${indicators.pendingPctOfActive}% of active`, tone: 'indigo' }} />
        <KpiCard label="Critical" value={stats.critical} icon={Flame} tone="rose"
          description="Urgent / open" badge={{ text: `${indicators.criticalPctOfActive}% of active`, tone: 'rose' }} />
        <KpiCard label="Escalated" value={stats.escalated} icon={ShieldAlert} tone="rose"
          description="Needs attention" badge={{ text: `${indicators.escalatedPctOfActive}% of active`, tone: 'rose' }} />
      </div>

      {/* ANALYTICS ROW 1 — SLA + trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Weekly Resolution vs SLA" subtitle={`Resolved vs resolved-within-${slaHours}h · last 6 weeks`}>
          <GroupedTrend
            data={charts.weeklySla}
            series={[
              { key: 'resolved', name: 'Resolved', color: '#6366f1' },
              { key: 'withinSla', name: 'Within SLA', color: '#10b981' },
            ]}
            height={260}
          />
        </ChartCard>
        <ChartCard
          title="Resolution Trends"
          subtitle="Opened · Resolved · Escalated"
          action={
            <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              {([7, 30, 90] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)}
                  className={classNames('px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
                    range === r ? 'bg-white dark:bg-slate-800 shadow-sm text-rose-600 dark:text-rose-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}>
                  {r}D
                </button>
              ))}
            </div>
          }
        >
          <LineTrend data={trendData} series={[
            { key: 'opened', name: 'Opened', color: '#6366f1' },
            { key: 'resolved', name: 'Resolved', color: '#10b981' },
            { key: 'escalated', name: 'Escalated', color: '#ef4444' },
          ]} height={260} />
        </ChartCard>
      </div>

      {/* ANALYTICS ROW 2 — distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Status Distribution" subtitle="Tickets by workflow state">
          <DonutChart data={charts.statusDistribution} />
        </ChartCard>
        <ChartCard title="Priority Distribution" subtitle="Tickets by severity">
          <DonutChart data={charts.priorityDistribution} colors={PRIORITY_COLORS} />
        </ChartCard>
        <ChartCard title="Category Distribution" subtitle="By tag (top categories)">
          <CategoryBars data={charts.categoryDistribution} />
        </ChartCard>
      </div>

      {/* AGENT PERFORMANCE */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-rose-500" /> Agent Performance
        </h2>
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
          {agents.length === 0 ? (
            <EmptyState icon={Users} title="No assigned agents" message="No tickets are currently assigned to any agent." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Agent</th>
                    <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Assigned</th>
                    <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Resolved</th>
                    <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Escalated</th>
                    <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Avg Resolution</th>
                    <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">CSAT</th>
                    <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Resolution Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {agents.map((a) => <AgentRow key={a.id} a={a} />)}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Agent Workload" subtitle="Assigned tickets per agent">
          <CategoryBars data={workload} />
        </ChartCard>
        <ChartCard title="Most Active Reporters" subtitle="Top ticket creators">
          <CategoryBars data={topReporters} />
        </ChartCard>
        <ChartCard title="Most Reported Categories" subtitle="By tag volume">
          <CategoryBars data={charts.categoryDistribution.slice(0, 6)} />
        </ChartCard>
      </div>

      {/* TICKET LIST */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Siren className="w-5 h-5 text-rose-500" /> All Tickets
              <span className="text-sm font-medium text-slate-400">({filteredSorted.length})</span>
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} placeholder="Search by subject or ID..."
                className="w-full lg:w-72 pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); resetPage(); }} options={[
              ['all', 'All Statuses'], ['open', 'Open'], ['escalated', 'Escalated'], ['pending', 'Pending'], ['resolved', 'Resolved'], ['closed', 'Closed'],
            ]} />
            <FilterSelect value={priorityFilter} onChange={(v) => { setPriorityFilter(v); resetPage(); }} options={[
              ['all', 'All Priorities'], ['Critical', 'Critical'], ['High', 'High'], ['Medium', 'Medium'], ['Low', 'Low'],
            ]} />
            <FilterSelect value={categoryFilter} onChange={(v) => { setCategoryFilter(v); resetPage(); }} options={[
              ['all', 'All Categories'], ...categoryOptions.map((c) => [c, c] as [string, string]),
            ]} />
            <FilterSelect value={assigneeFilter} onChange={(v) => { setAssigneeFilter(v); resetPage(); }} options={[
              ['all', 'All Assignees'], ...assigneeOptions.map((a) => [a, a] as [string, string]),
            ]} />
            <FilterSelect value={dateFilter} onChange={(v) => { setDateFilter(v); resetPage(); }} options={[
              ['all', 'Any Date'], ['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'],
            ]} />
          </div>
        </div>

        {filteredSorted.length === 0 ? (
          <EmptyState icon={CheckCircle2}
            title={tickets.length === 0 ? 'No tickets yet' : 'No matching tickets'}
            message={tickets.length === 0 ? 'No support tickets exist in the organization yet.' : 'Try adjusting your search or filters.'} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                    <Th>Ticket ID</Th>
                    <Th>Subject</Th>
                    <Th>Reporter</Th>
                    <Th>Project</Th>
                    <Th>Category</Th>
                    <Th sortable active={sort.key === 'priority'} dir={sort.dir} onClick={() => toggleSort('priority')}>Priority</Th>
                    <Th>Status</Th>
                    <Th>Assignee</Th>
                    <Th sortable active={sort.key === 'created'} dir={sort.dir} onClick={() => toggleSort('created')}>Created Date</Th>
                    <Th sortable active={sort.key === 'updated'} dir={sort.dir} onClick={() => toggleSort('updated')}>Updated Date</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pageRows.map((t) => <TicketRow key={t.id} t={t} />)}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 text-sm">
              <span className="text-slate-500">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredSorted.length)} of {filteredSorted.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 font-semibold text-slate-700 dark:text-slate-200">{safePage} / {totalPages}</span>
                <button onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages}
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* RECENT TICKET ACTIVITY */}
      <ActivityFeed activities={activities} title="Recent Ticket Activity"
        emptyLabel="No recent ticket activity recorded." maxHeight="max-h-[420px]" />
    </div>
  );
}

/* ───────────────────────────── subcomponents ──────────────────────────────── */

const TONE: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};
const BADGE_TONE: Record<string, string> = {
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
};

function KpiCard({ label, value, icon: Icon, tone, description, trend, badge }: {
  label: string; value: number; icon: any; tone: string; description: string;
  trend?: { text: string; dir: 'up' | 'down'; good: boolean }; badge?: { text: string; tone: string };
}) {
  return (
    <Card className="p-4 shadow-sm rounded-2xl border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 truncate">{label}</p>
          <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            <AnimatedCounter value={value ?? 0} />
          </h4>
        </div>
        <div className={classNames('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', TONE[tone])}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {trend ? (
          <span className={classNames('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold',
            trend.good ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400')}>
            {trend.dir === 'up' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{trend.text}
          </span>
        ) : badge ? (
          <span className={classNames('inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold', BADGE_TONE[badge.tone])}>{badge.text}</span>
        ) : null}
        <span className="text-[11px] text-slate-400 truncate">{description}</span>
      </div>
    </Card>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 max-w-[180px]">
      {options.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
    </select>
  );
}

function Th({ children, className, sortable, active, dir, onClick }: {
  children: React.ReactNode; className?: string; sortable?: boolean; active?: boolean; dir?: 'asc' | 'desc'; onClick?: () => void;
}) {
  return (
    <th className={classNames('py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap', className)}>
      {sortable ? (
        <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
          {children}
          <ArrowUpDown size={12} className={classNames(active ? 'text-rose-500' : 'text-slate-400')} />
          {active && <span className="sr-only">{dir}</span>}
        </button>
      ) : children}
    </th>
  );
}

function TicketRow({ t }: { t: MasterTicket }) {
  const prio = priorityMeta(t.severity);
  const escalated = !!t.escalationLevel && t.escalationLevel.toLowerCase() !== 'none';
  const assignee = t.assignee?.name || 'Unassigned';
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="py-3.5 px-5 whitespace-nowrap"><span className="text-xs font-bold text-slate-500 dark:text-slate-400">TKT-{t.id}</span></td>
      <td className="py-3.5 px-5"><p className="text-sm font-semibold text-slate-900 dark:text-white max-w-[220px] truncate">{t.title}</p></td>
      <td className="py-3.5 px-5"><span className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[140px] inline-block">{t.reporter?.name || '—'}</span></td>
      <td className="py-3.5 px-5"><span className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[140px] inline-block">{t.project?.name || '—'}</span></td>
      <td className="py-3.5 px-5"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 capitalize truncate max-w-[120px]">{t.category}</span></td>
      <td className="py-3.5 px-5"><span className={classNames('inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border', prio.cls)}>{prio.label}</span></td>
      <td className="py-3.5 px-5">
        <span className="inline-flex items-center gap-1.5">
          <span className={classNames('inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border capitalize', statusCls(t.status))}>{t.status || 'unknown'}</span>
          {escalated && <ShieldAlert size={14} className="text-rose-500" />}
        </span>
      </td>
      <td className="py-3.5 px-5 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 text-xs font-bold">
            {assignee.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-400">{assignee}</span>
        </div>
      </td>
      <td className="py-3.5 px-5 whitespace-nowrap text-sm text-slate-500">{fmtDate(t.createdAt)}</td>
      <td className="py-3.5 px-5 whitespace-nowrap text-sm text-slate-500">{fmtDate(t.updatedAt)}</td>
      <td className="py-3.5 px-5 text-right">
        <Link href={`/master-dashboard/tickets/${t.id}`}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white text-xs font-bold transition-colors">
          View <ArrowRight size={13} />
        </Link>
      </td>
    </tr>
  );
}

function AgentRow({ a }: { a: AgentPerformance }) {
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="py-3.5 px-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-700 dark:text-rose-400 text-xs font-bold shrink-0">
            {a.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[160px]">{a.name}</span>
        </div>
      </td>
      <td className="py-3.5 px-5 text-center text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{a.assigned}</td>
      <td className="py-3.5 px-5 text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{a.resolved}</td>
      <td className="py-3.5 px-5 text-center text-sm font-semibold text-rose-600 dark:text-rose-400 tabular-nums">{a.escalated}</td>
      <td className="py-3.5 px-5 text-center text-sm text-slate-600 dark:text-slate-300 tabular-nums">{fmtHours(a.avgResolutionHours)}</td>
      <td className="py-3.5 px-5 text-center text-sm text-slate-400">{a.csat == null ? 'N/A' : a.csat}</td>
      <td className="py-3.5 px-5">
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2">
            <div className={classNames('h-2 rounded-full', a.resolutionRate >= 70 ? 'bg-emerald-500' : a.resolutionRate >= 40 ? 'bg-amber-500' : 'bg-rose-500')}
              style={{ width: `${Math.min(a.resolutionRate, 100)}%` }} />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums w-9 text-right">{a.resolutionRate}%</span>
        </div>
      </td>
    </tr>
  );
}
