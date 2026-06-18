'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase, FolderOpen, Target, CheckCircle2, PauseCircle, AlertTriangle, XCircle,
  Search, LayoutGrid as GridIcon, List as ListIcon, Users, Calendar, CalendarPlus,
  ListChecks, ArrowRight, CircleDot,
} from 'lucide-react';
import { fetchMasterProjects, MasterProject } from '@/lib/api/masterModules';
import {
  useMasterResource, ModuleStateScreen, ModuleHeader, StatCard, ChartCard,
  CategoryBars, ActivityFeed, EmptyState,
} from '@/components/master/MasterKit';
import { Card, CardBody } from '@/components/Card';
import { classNames } from '@/lib/utils';

type ViewMode = 'grid' | 'list';

// ── Status vocabularies (mirror the backend, case-insensitive) ──────────────
const ACTIVE = ['active', 'in_progress', 'in-progress', 'ongoing'];
const COMPLETED = ['completed', 'complete', 'done', 'closed'];
const ONHOLD = ['on-hold', 'on_hold', 'onhold', 'paused', 'hold'];
const CANCELLED = ['cancelled', 'canceled'];
const PLANNING = ['planning', 'planned', 'new', 'draft', 'not started', 'not_started', 'todo', 'backlog'];

interface StatusMeta { label: string; badge: string; dot: string }

function statusMeta(status: string): StatusMeta {
  const s = (status || '').toLowerCase();
  if (ACTIVE.includes(s)) return { label: 'In Progress', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20', dot: 'bg-blue-500' };
  if (COMPLETED.includes(s)) return { label: 'Completed', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20', dot: 'bg-emerald-500' };
  if (ONHOLD.includes(s)) return { label: 'On Hold', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20', dot: 'bg-amber-500' };
  if (CANCELLED.includes(s)) return { label: 'Cancelled', badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20', dot: 'bg-rose-500' };
  if (PLANNING.includes(s)) return { label: 'Planning', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20', dot: 'bg-indigo-500' };
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  return { label, badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', dot: 'bg-slate-400' };
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : null;

const progressColor = (p: number) =>
  p >= 100 ? 'bg-emerald-500' : p >= 60 ? 'bg-indigo-500' : p >= 30 ? 'bg-blue-500' : 'bg-amber-500';

export default function MasterProjectsPage() {
  const { data, status, errorMsg, reload } = useMasterResource(fetchMasterProjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const filtered = useMemo(() => {
    const projects = data?.projects ?? [];
    return projects.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus && !p.isArchived;
    });
  }, [data, searchQuery, statusFilter]);

  if (status !== 'ready' || !data) {
    return <ModuleStateScreen status={status} errorMsg={errorMsg} onRetry={reload} />;
  }

  const { stats, charts, activities } = data;
  const listCapped = data.projects.length < stats.total;

  // Cancelled isn't a derived KPI on the backend — read it live from the
  // org-wide status distribution (never fabricated; 0 when absent).
  const sumStatus = (set: string[]) =>
    charts.statusDistribution
      .filter((d) => set.includes(d.label.toLowerCase()))
      .reduce((acc, d) => acc + d.value, 0);
  const cancelled = sumStatus(CANCELLED);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* SuperAdmin Projects is monitoring/management only — no project creation
          (creation lives in the Development ERP module). */}
      <ModuleHeader
        icon={Briefcase}
        title="Project Portfolio"
        subtitle="Organization-wide view of every enterprise project, health metric, and resource allocation — live."
        onRefresh={reload}
      />

      {/* PROJECTS BY STATUS — KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Projects" value={stats.total} icon={FolderOpen} tone="blue" />
        <StatCard label="In Progress" value={stats.active} icon={Target} tone="indigo" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Delayed" value={stats.delayed} icon={AlertTriangle} tone="rose" alert={stats.delayed > 0} />
        <StatCard label="On Hold" value={stats.onHold} icon={PauseCircle} tone="amber" />
        <StatCard label="Cancelled" value={cancelled} icon={XCircle} tone="slate" />
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
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
            <option value="active">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
          </select>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {filtered.length} shown{stats.archived > 0 ? ` · ${stats.archived} archived` : ''}
          </span>
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            {(['list', 'grid'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                aria-label={`${mode} view`}
                className={classNames(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === mode
                    ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
                )}
              >
                {mode === 'list' ? <ListIcon size={16} /> : <GridIcon size={16} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {listCapped && (
        <p className="text-xs text-slate-500 dark:text-slate-400 px-1 -mt-2">
          Showing the {data.projects.length} most recent of {stats.total} projects · KPIs and analytics reflect all projects.
        </p>
      )}

      {/* PROJECT LIST */}
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
      ) : viewMode === 'list' ? (
        <div className="flex flex-col gap-3">
          {filtered.map((p) => <ProjectRow key={p.id} project={p} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => <ProjectGridCard key={p.id} project={p} />)}
        </div>
      )}

      {/* ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        <ChartCard title="Projects by Owner" subtitle="Top owners by project count">
          <CategoryBars data={charts.pmWorkload} />
        </ChartCard>
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

/* ───────────────────────────── shared cell pieces ─────────────────────────── */

function projectCode(id: string) {
  return `PRJ-${id.slice(0, 4).toUpperCase()}`;
}

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <span className={classNames('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide border', meta.badge)}>
      <span className={classNames('w-1.5 h-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">{label}</p>
      {children}
    </div>
  );
}

function Progress({ value, done, total }: { value: number; done: number; total: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{value}%</span>
        <span className="text-[11px] text-slate-400">{done}/{total} tasks</span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
        <div className={classNames('h-2 rounded-full transition-all duration-500', progressColor(value))} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
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
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{owner?.name || 'Unassigned'}</span>
    </div>
  );
}

function MembersCell({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
      <Users size={14} className="text-slate-400" /> {count} {count === 1 ? 'Member' : 'Members'}
    </span>
  );
}

function DueBadge({ endDate, overdue }: { endDate: string | null; overdue: boolean }) {
  const due = fmtDate(endDate);
  if (!due) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        <Calendar size={13} /> No Due Date
      </span>
    );
  }
  return (
    <span className={classNames(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold border',
      overdue
        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
        : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    )}>
      <Calendar size={13} /> {overdue ? 'Overdue:' : 'Due:'} {due}
    </span>
  );
}

function ViewButton({ id }: { id: string }) {
  return (
    <Link
      href={`/dashboard/projects/${id}`}
      className="group/btn inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-600 dark:hover:text-white text-xs font-bold transition-colors"
    >
      View <ArrowRight size={14} className="transition-transform group-hover/btn:translate-x-0.5" />
    </Link>
  );
}

/* ───────────────────────────── list row ───────────────────────────────────── */

function ProjectRow({ project: p }: { project: MasterProject }) {
  const openTasks = Math.max(p.taskTotal - p.taskDone, 0);
  const created = fmtDate(p.createdAt);
  return (
    <div className="grid grid-cols-12 gap-x-4 gap-y-4 items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all p-4">
      {/* LEFT — identity */}
      <div className="col-span-12 xl:col-span-3 flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Briefcase size={20} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{projectCode(p.id)}</span>
            <StatusBadge status={p.status} />
          </div>
          <Link href={`/dashboard/projects/${p.id}`} className="block">
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              {p.name}
            </h3>
          </Link>
          {created && (
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <CalendarPlus size={11} /> Created {created}
            </p>
          )}
        </div>
      </div>

      {/* CENTER — progress + tasks */}
      <Field label="Progress" className="col-span-12 sm:col-span-7 xl:col-span-2">
        <Progress value={p.progress} done={p.taskDone} total={p.taskTotal} />
      </Field>
      <Field label="Open Tasks" className="col-span-6 sm:col-span-5 xl:col-span-1">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-200">
          <ListChecks size={14} className="text-slate-400" /> {openTasks}
        </span>
      </Field>

      {/* RIGHT — owner + members + due + actions */}
      <Field label="Project Owner" className="col-span-6 sm:col-span-4 xl:col-span-2">
        <OwnerCell owner={p.owner} />
      </Field>
      <Field label="Team" className="col-span-6 sm:col-span-3 xl:col-span-1">
        <MembersCell count={p.memberCount} />
      </Field>
      <Field label="Due Date" className="col-span-6 sm:col-span-3 xl:col-span-2">
        <DueBadge endDate={p.endDate} overdue={p.overdue} />
      </Field>
      <div className="col-span-6 sm:col-span-2 xl:col-span-1 flex xl:justify-end">
        <ViewButton id={p.id} />
      </div>
    </div>
  );
}

/* ───────────────────────────── grid card ──────────────────────────────────── */

function ProjectGridCard({ project: p }: { project: MasterProject }) {
  const openTasks = Math.max(p.taskTotal - p.taskDone, 0);
  const created = fmtDate(p.createdAt);
  return (
    <div className="group flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all">
      <div className="p-5 flex-1 flex flex-col">
        {/* header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Briefcase size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">{projectCode(p.id)}</span>
              <Link href={`/dashboard/projects/${p.id}`}>
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {p.name}
                </h3>
              </Link>
            </div>
          </div>
          <StatusBadge status={p.status} />
        </div>

        {/* progress */}
        <div className="mb-4">
          <Progress value={p.progress} done={p.taskDone} total={p.taskTotal} />
        </div>

        {/* meta grid */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <Field label="Open Tasks">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-200">
              <ListChecks size={14} className="text-slate-400" /> {openTasks}
            </span>
          </Field>
          <Field label="Team">
            <MembersCell count={p.memberCount} />
          </Field>
          <Field label="Due Date">
            <DueBadge endDate={p.endDate} overdue={p.overdue} />
          </Field>
          <Field label="Created">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <CircleDot size={12} className="text-slate-400" /> {created || '—'}
            </span>
          </Field>
        </div>
      </div>

      {/* footer */}
      <div className="border-t border-slate-100 dark:border-slate-800/60 p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Project Owner</p>
          <OwnerCell owner={p.owner} />
        </div>
        <ViewButton id={p.id} />
      </div>
    </div>
  );
}
