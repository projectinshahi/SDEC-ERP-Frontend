'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Briefcase, FolderOpen, Target, CheckCircle2, Archive, AlertTriangle, XCircle,
  TrendingUp, AlertCircle, PauseCircle, ClipboardList,
  Search, Calendar, MoreVertical, ExternalLink, Eye, ArrowUpRight, ChevronRight, Users,
} from 'lucide-react';
import { fetchMasterProjects, MasterProject } from '@/lib/api/masterModules';
import {
  useMasterResource, ModuleStateScreen, ModuleHeader, StatCard, ChartCard,
  CategoryBars, ActivityFeed, EmptyState,
} from '@/components/master/MasterKit';
import { Card, CardBody } from '@/components/Card';
import { classNames } from '@/lib/utils';

// ── Status vocabularies (mirror the backend, case-insensitive) ──────────────
const ACTIVE = ['active', 'in_progress', 'in-progress', 'ongoing'];
const COMPLETED = ['completed', 'complete', 'done', 'closed'];
const ONHOLD = ['on-hold', 'on_hold', 'onhold', 'paused', 'hold'];
const CANCELLED = ['cancelled', 'canceled'];
const PLANNING = ['planning', 'planned', 'new', 'draft', 'not started', 'not_started', 'todo', 'backlog'];

// ── Badge tone palette (shared by Status + Category badges) ─────────────────
const TONES: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  slate: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  violet: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
};

// Category → tone key (looked up in TONES). Honest placeholder ("—") until a
// category value exists; colors apply automatically once it does.
const CATEGORY_TONES: Record<string, string> = {
  erp: 'indigo', crm: 'blue', internal: 'slate', website: 'emerald',
  'web app': 'emerald', 'mobile app': 'violet', mobile: 'violet', sales: 'amber',
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : null;

const progressColor = (p: number) =>
  p >= 100 ? 'bg-emerald-500' : p >= 60 ? 'bg-indigo-500' : p >= 30 ? 'bg-blue-500' : 'bg-amber-500';

// Story points carry up to one decimal (e.g. 0.5); render whole numbers cleanly.
const fmtPts = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * Stable, human-readable code derived from real project data — `PRJ-<year>-<seq>`
 * (year from createdAt, seq from the id's numeric suffix). Never `PRJ-PRJ-…`
 * because we extract digits only, never the raw `prj-` prefix.
 */
function projectCode(id: string, createdAt: string | null): string {
  const parsedYear = createdAt ? new Date(createdAt).getFullYear() : NaN;
  const year = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();
  const digits = String(id ?? '').replace(/\D/g, '');
  const seq = (digits.slice(-3) || '0').padStart(3, '0');
  return `PRJ-${year}-${seq}`;
}

/**
 * Whole days until `endDate` (sprint-derived due date); null when no date.
 * Uses UTC calendar parts so this matches the backend exactly — the KPI tally
 * (daysToEnd) and the `overdue` flag are both UTC, and the sprint endDate is a
 * UTC timestamp. Mixing in local parts here would let a row's At Risk/Delayed
 * badge disagree with its KPI card by a day on a non-UTC server.
 */
function daysUntil(endDate: string | null): number | null {
  if (!endDate) return null;
  const d = new Date(endDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const a = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const b = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((b - a) / 86400000);
}

interface DerivedStatus { key: string; label: string; tone: string }

/**
 * Health-oriented status shown in the table — derived live from the raw status,
 * archive flag, and the sprint-derived due date (never a stored display value).
 */
function derivedStatus(p: MasterProject): DerivedStatus {
  const s = (p.status || '').toLowerCase();
  if (p.isArchived) return { key: 'archived', label: 'Archived', tone: 'slate' };
  if (COMPLETED.includes(s)) return { key: 'completed', label: 'Completed', tone: 'emerald' };
  if (CANCELLED.includes(s)) return { key: 'cancelled', label: 'Cancelled', tone: 'rose' };
  if (ONHOLD.includes(s)) return { key: 'on-hold', label: 'On Hold', tone: 'violet' };
  if (p.overdue) return { key: 'delayed', label: 'Delayed', tone: 'rose' };
  const days = daysUntil(p.endDate);
  if (days !== null && days <= 7) return { key: 'at-risk', label: 'At Risk', tone: 'amber' };
  if (PLANNING.includes(s)) return { key: 'planning', label: 'Planning', tone: 'indigo' };
  return { key: 'on-track', label: 'On Track', tone: 'emerald' };
}

/** Status-filter predicate. Archived rows are hidden unless explicitly filtered. */
function matchesStatusFilter(p: MasterProject, filter: string): boolean {
  if (filter === 'archived') return p.isArchived;
  if (p.isArchived) return false;
  if (filter === 'all') return true;
  if (filter === 'in-progress') return ACTIVE.includes((p.status || '').toLowerCase());
  return derivedStatus(p).key === filter; // on-track | at-risk | completed
}

export default function MasterProjectsPage() {
  // Poll every 60s so KPIs and project progress update live without a manual
  // refresh (silent background refresh — keeps current data on screen).
  const { data, status, errorMsg, reload, refresh, isRefreshing } = useMasterResource(fetchMasterProjects, { pollMs: 60000 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filtered = useMemo(() => {
    const projects = data?.projects ?? [];
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        projectCode(p.id, p.createdAt).toLowerCase().includes(q) ||
        (p.client || '').toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'all' || (p.category || '') === categoryFilter;
      return matchesSearch && matchesStatusFilter(p, statusFilter) && matchesCategory;
    });
  }, [data, searchQuery, statusFilter, categoryFilter]);

  if (status !== 'ready' || !data) {
    return <ModuleStateScreen status={status} errorMsg={errorMsg} onRetry={reload} />;
  }

  const { stats, charts, activities } = data;
  const listCapped = data.projects.length < stats.total;

  // Category options drawn from the projects in view (live, honest — only
  // categories you can actually filter the list to).
  const categoryOptions = Array.from(
    new Set((data.projects || []).map((p) => (p.category || '').trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  // Stat-card filtering. Cards and the dropdown share `statusFilter`, so they
  // stay in sync and compose with the search box. Clicking the active card
  // again (or the Total card) clears back to "all".
  const selectStatus = (value: string) =>
    setStatusFilter((cur) => (cur === value && value !== 'all' ? 'all' : value));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* SuperAdmin Projects is monitoring/management only — no project creation
          (creation lives in the Development ERP module). */}
      <ModuleHeader
        icon={Briefcase}
        title="Project Dashboard"
        subtitle="Organization-wide view of every enterprise project, health metric, and resource allocation — live."
        onRefresh={refresh}
        refreshIconOnly
        hideLivePill
        isRefreshing={isRefreshing}
      />

      {/* PROJECT STATUS — 10 live KPI cards (5 per row on desktop, 3 on tablet,
          2 on mobile). Counts come from the backend tally that mirrors the
          per-row status badges, so cards and badges always agree. Each card is
          a live filter: clicking it filters the list below (and the dropdown)
          to that status; the active card is highlighted. */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total" value={stats.total} icon={FolderOpen} tone="blue" active={statusFilter === 'all'} onClick={() => selectStatus('all')} />
        <StatCard label="Active" value={stats.active} icon={Target} tone="blue" active={statusFilter === 'in-progress'} onClick={() => selectStatus('in-progress')} />
        <StatCard label="On Track" value={stats.onTrack} icon={TrendingUp} tone="emerald" active={statusFilter === 'on-track'} onClick={() => selectStatus('on-track')} />
        <StatCard label="At Risk" value={stats.atRisk} icon={AlertCircle} tone="amber" alert={stats.atRisk > 0} active={statusFilter === 'at-risk'} onClick={() => selectStatus('at-risk')} />
        <StatCard label="Delayed" value={stats.delayed} icon={AlertTriangle} tone="rose" alert={stats.delayed > 0} active={statusFilter === 'delayed'} onClick={() => selectStatus('delayed')} />
        <StatCard label="On Hold" value={stats.onHold} icon={PauseCircle} tone="violet" active={statusFilter === 'on-hold'} onClick={() => selectStatus('on-hold')} />
        <StatCard label="Planning" value={stats.planning} icon={ClipboardList} tone="indigo" active={statusFilter === 'planning'} onClick={() => selectStatus('planning')} />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} tone="emerald" active={statusFilter === 'completed'} onClick={() => selectStatus('completed')} />
        <StatCard label="Archived" value={stats.archived} icon={Archive} tone="slate" active={statusFilter === 'archived'} onClick={() => selectStatus('archived')} />
        <StatCard label="Cancelled" value={stats.cancelled} icon={XCircle} tone="rose" active={statusFilter === 'cancelled'} onClick={() => selectStatus('cancelled')} />
      </div>

      {/* TOOLBAR — search + status filter + shown/archived count */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code, or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="in-progress">Active</option>
            <option value="on-track">On Track</option>
            <option value="at-risk">At Risk</option>
            <option value="delayed">Delayed</option>
            <option value="on-hold">On Hold</option>
            <option value="planning">Planning</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-right">
          {filtered.length} shown{stats.archived > 0 ? ` · ${stats.archived} archived` : ''}
        </span>
      </div>

      {listCapped && (
        <p className="text-xs text-slate-500 dark:text-slate-400 px-1 -mt-2">
          Showing the {data.projects.length} most recent of {stats.total} projects · KPIs and analytics reflect all projects.
        </p>
      )}

      {/* PROJECT LIST — enterprise table on desktop (≥1024px), touch-friendly
          cards on tablet/mobile (<1024px). The table is display:none below lg so
          it never renders or horizontally scrolls on small screens. */}
      {filtered.length === 0 ? (
        <Card className="border-dashed border-slate-200 dark:border-slate-800">
          <CardBody>
            <EmptyState
              icon={FolderOpen}
              title="No projects found"
              message={
                stats.total === 0
                  ? 'No projects exist in the organization yet.'
                  : 'Try adjusting your search or status filter.'
              }
            />
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="hidden lg:block">
            <ProjectsTable projects={filtered} />
          </div>
          <div className="lg:hidden space-y-3">
            {filtered.map((p, i) => <ProjectMobileCard key={p.id} p={p} index={i} />)}
          </div>
        </>
      )}

      {/* ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        <div className="space-y-6">
          <ChartCard title="Projects by Owner" subtitle="Top owners by project count">
            <CategoryBars data={charts.pmWorkload} dense />
          </ChartCard>
          <ChartCard title="Projects by Category" subtitle="Distribution across project types">
            <CategoryBars data={charts.categoryDistribution} dense />
          </ChartCard>
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed
            activities={activities}
            title="Recent Project Activity"
            emptyLabel="No recent project activity recorded."
            maxHeight="max-h-[360px]"
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ Table ═════════════════════════════════════ */

function ProjectsTable({ projects }: { projects: MasterProject[] }) {
  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
      {/* Single scroll container → horizontal scroll on narrow screens AND a
          sticky header on vertical scroll. The row action menu is portalled to
          <body> so this container never clips it. */}
      <div className="overflow-auto max-h-[72vh]">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <Th className="w-10 text-center">#</Th>
              <Th>Project</Th>
              <Th>Client</Th>
              <Th>Category</Th>
              <Th className="min-w-[150px]">Progress</Th>
              <Th>Status</Th>
              <Th>Team</Th>
              <Th>Start Date</Th>
              <Th>Due Date</Th>
              <Th>Countdown</Th>
              <Th>Owner</Th>
              <Th className="w-10 text-right pr-3" />
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => <ProjectTableRow key={p.id} p={p} index={i} />)}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ═══════════════════════ Mobile / tablet card (<1024px) ════════════════════ */

function ProjectMobileCard({ p, index }: { p: MasterProject; index: number }) {
  const router = useRouter();
  // `from=master` lets the (shared) project details page render Master-Dashboard
  // breadcrumbs/back-navigation instead of the Development hierarchy.
  const open = () => router.push(`/dashboard/projects/${p.id}?from=master`);
  const ds = derivedStatus(p);
  const due = fmtDate(p.endDate);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
      className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all p-3.5 space-y-2.5"
    >
      {/* Top — index + identity + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="mt-0.5 w-6 h-6 shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center tabular-nums">{index + 1}</span>
          <div className="w-9 h-9 shrink-0 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Briefcase size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{p.name}</h3>
            <p className="text-[11px] font-medium text-slate-400 tracking-wide mt-0.5">{projectCode(p.id, p.createdAt)}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-slate-600 dark:text-slate-300">{p.client || '-'}</span>
              <CategoryBadge value={p.category} />
            </div>
          </div>
        </div>
        <span className={classNames('shrink-0 inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap border', TONES[ds.tone])}>
          {ds.label}
        </span>
      </div>

      {/* Progress (left) + due date & countdown (right) — one compact row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 max-w-[58%]">
          <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{p.progress}%</span>
          <div className="mt-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
            <div className={classNames('h-2 rounded-full transition-all duration-500', progressColor(p.progress))} style={{ width: `${Math.min(p.progress, 100)}%` }} />
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-400 tabular-nums">{fmtPts(p.completedPoints)} / {fmtPts(p.totalPoints)} Points</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1 text-right">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">{due ?? 'No Due Date'}</span>
          <Countdown endDate={p.endDate} />
        </div>
      </div>

      {/* Bottom — members + owner + chevron */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Users size={14} className="text-slate-400" /> {p.memberCount} {p.memberCount === 1 ? 'Member' : 'Members'}
        </span>
        <div className="flex items-center gap-2 min-w-0">
          <OwnerCell owner={p.owner} />
          <ChevronRight size={18} className="shrink-0 text-slate-400 group-hover:text-indigo-500 transition-colors" />
        </div>
      </div>
    </div>
  );
}

function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={classNames('sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-2.5 px-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap', className)}>
      {children}
    </th>
  );
}

function Td({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) {
  return <td onClick={onClick} className={classNames('py-2.5 px-3 align-middle border-b border-slate-100 dark:border-slate-800/70', className)}>{children}</td>;
}

function ProjectTableRow({ p, index }: { p: MasterProject; index: number }) {
  const router = useRouter();
  // `from=master` lets the (shared) project details page render Master-Dashboard
  // breadcrumbs/back-navigation instead of the Development hierarchy.
  const open = () => router.push(`/dashboard/projects/${p.id}?from=master`);
  const ds = derivedStatus(p);
  return (
    <tr
      onClick={open}
      className="group cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
    >
      <Td className="text-center text-xs font-semibold text-slate-400 tabular-nums">{index + 1}</Td>

      {/* Project name (wraps) + generated code below */}
      <Td>
        <div className="min-w-0 max-w-[190px]">
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {p.name}
          </p>
          <p className="text-[11px] font-medium text-slate-400 tracking-wide mt-0.5">{projectCode(p.id, p.createdAt)}</p>
        </div>
      </Td>

      {/* Client — icon + name (placeholder until a client field exists) */}
      <Td><ClientCell client={p.client} /></Td>

      {/* Category badge */}
      <Td><CategoryBadge value={p.category} /></Td>

      {/* Progress bar + % with point completion beneath (self-contained) */}
      <Td><ProgressCell value={p.progress} completed={p.completedPoints} total={p.totalPoints} /></Td>

      {/* Status badge (derived) */}
      <Td>
        <span className={classNames('inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap border', TONES[ds.tone])}>
          {ds.label}
        </span>
      </Td>

      {/* Team — avatar stack with member count beneath */}
      <Td><MemberAvatars names={p.members} count={p.memberCount} /></Td>

      {/* Start date */}
      <Td className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{fmtDate(p.startDate) ?? '—'}</Td>

      {/* Due date (latest sprint end) */}
      <Td className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{fmtDate(p.endDate) ?? '—'}</Td>

      {/* Countdown — dedicated column */}
      <Td><Countdown endDate={p.endDate} /></Td>

      {/* Project owner */}
      <Td><OwnerCell owner={p.owner} /></Td>

      {/* Actions menu — stop row navigation when interacting */}
      <Td className="text-right pr-3" onClick={(e) => e.stopPropagation()}>
        <RowActions id={p.id} />
      </Td>
    </tr>
  );
}

/* ─────────────────────────────── cells ────────────────────────────────────── */

function ClientCell({ client }: { client: string | null }) {
  if (!client) return <span className="text-xs text-slate-400">-</span>;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center text-[11px] font-bold shrink-0">
        {client.charAt(0).toUpperCase()}
      </span>
      <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{client}</span>
    </div>
  );
}

function CategoryBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-xs text-slate-400">—</span>;
  const tone = CATEGORY_TONES[value.toLowerCase()] || 'slate';
  return (
    <span className={classNames('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border', TONES[tone])}>
      {value}
    </span>
  );
}

function ProgressCell({ value, completed, total }: { value: number; completed: number; total: number }) {
  return (
    <div className="min-w-[140px] space-y-1">
      {/* Row 1 — bar + percentage */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 min-w-[60px]">
          <div
            className={classNames('h-2 rounded-full transition-all duration-500', progressColor(value))}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums w-9 text-right">{value}%</span>
      </div>
      {/* Row 2 — point completion (smaller, muted; no extra row height) */}
      <p
        className="text-[11px] leading-tight text-slate-400 dark:text-slate-500 tabular-nums"
        title={`${fmtPts(Math.max(total - completed, 0))} remaining`}
      >
        {fmtPts(completed)} / {fmtPts(total)} Points
      </p>
    </div>
  );
}

function MemberAvatars({ names, count }: { names: string[]; count: number }) {
  if (count === 0) return <span className="text-xs text-slate-400">No members</span>;
  const shown = names.slice(0, 3);
  const extra = count - shown.length;
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex -space-x-2">
        {shown.map((n, i) => (
          <span
            key={i}
            title={n}
            className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center text-[11px] font-bold"
          >
            {n.charAt(0).toUpperCase()}
          </span>
        ))}
        {extra > 0 && (
          <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center text-[10px] font-bold">
            +{extra}
          </span>
        )}
      </div>
      <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {count} {count === 1 ? 'Member' : 'Members'}
      </span>
    </div>
  );
}

function Countdown({ endDate }: { endDate: string | null }) {
  // daysRemaining = Due Date − Today (recomputed every render → updates daily).
  const days = daysUntil(endDate);
  if (days === null) return <span className="text-xs text-slate-400">—</span>;
  // Future (> 0) → green · Due today (0) → orange · Overdue (< 0) → red.
  const tone = days > 0 ? TONES.emerald : days === 0 ? TONES.amber : TONES.rose;
  const unit = Math.abs(days) === 1 ? 'Day' : 'Days';
  const title =
    days < 0 ? `Overdue by ${Math.abs(days)} ${unit.toLowerCase()}`
      : days === 0 ? 'Due today'
        : `${days} ${unit.toLowerCase()} remaining`;
  return (
    <span
      title={title}
      className={classNames('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap border tabular-nums', tone)}
    >
      <Calendar size={11} /> {days} {unit}
    </span>
  );
}

function OwnerCell({ owner }: { owner: MasterProject['owner'] }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={classNames(
        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
        owner ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-700',
      )}>
        {owner?.name?.charAt(0).toUpperCase() || '?'}
      </div>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{owner?.name || 'Unassigned'}</span>
    </div>
  );
}

/* ─────────────────────────── row action menu ──────────────────────────────── */

function RowActions({ id }: { id: string }) {
  const router = useRouter();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = 200;
    setMenu({ top: r.bottom + 6, left: Math.max(8, r.right - width) });
  };
  const go = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenu(null);
    router.push(`/dashboard/projects/${id}?from=master`);
  };

  // Close on any scroll (capture catches the table container) or viewport change.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Project actions"
        aria-haspopup="menu"
        onClick={openMenu}
        className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <MoreVertical size={16} />
      </button>
      {menu && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenu(null); }} />
          <div
            role="menu"
            style={{ top: menu.top, left: menu.left }}
            className="fixed z-50 w-[200px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1 text-sm animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem icon={ExternalLink} onClick={go}>Open Project</MenuItem>
            <MenuItem icon={Eye} onClick={go}>View Details</MenuItem>
            <MenuItem icon={ArrowUpRight} onClick={go}>Open Development App</MenuItem>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

function MenuItem({ icon: Icon, onClick, children }: { icon: typeof Eye; onClick: (e: React.MouseEvent) => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
    >
      <Icon size={14} className="text-slate-400" /> {children}
    </button>
  );
}
