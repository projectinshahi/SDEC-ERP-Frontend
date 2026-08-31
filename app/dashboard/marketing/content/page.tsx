'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Plus, Search, SlidersHorizontal, ChevronDown, ChevronUp, Loader2,
  Calendar, Target, User as UserIcon, AlertTriangle,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { fetchUsers, type UserDbResponse } from '@/lib/api/users';
import {
  fetchContents, moveContentStage,
  CONTENT_STAGES, BLOCKED_STAGE, CONTENT_PRIORITIES, CONTENT_PLATFORMS, CONTENT_OBJECTIVES,
  type MarketingContent, type ContentFilters,
} from '@/lib/api/marketingContent';
import { ContentFormModal } from '@/components/marketing/ContentFormModal';

/* ── Column theming — cool→warm across the workflow, distinct rose/amber park
 *    for Blocked (kept visually separate from active production stages). ────── */
const STAGE_THEMES: Record<string, { dot: string; border: string }> = {
  idea: { dot: 'bg-slate-400', border: 'border-t-slate-400' },
  strategy: { dot: 'bg-sky-500', border: 'border-t-sky-500' },
  script: { dot: 'bg-blue-500', border: 'border-t-blue-500' },
  design: { dot: 'bg-indigo-500', border: 'border-t-indigo-500' },
  production: { dot: 'bg-violet-500', border: 'border-t-violet-500' },
  editing: { dot: 'bg-purple-500', border: 'border-t-purple-500' },
  review: { dot: 'bg-amber-500', border: 'border-t-amber-500' },
  scheduled: { dot: 'bg-teal-500', border: 'border-t-teal-500' },
  published: { dot: 'bg-emerald-500', border: 'border-t-emerald-500' },
  analytics: { dot: 'bg-cyan-500', border: 'border-t-cyan-500' },
  blocked: { dot: 'bg-rose-500', border: 'border-t-rose-500' },
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
};

const cap = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const todayYmd = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};
const prettyDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

/* ── Compact Kanban card ─────────────────────────────────────────────────────── */
function ContentCard({ item, draggable, isDragging, onDragStart, onDragEnd, onOpen }: {
  item: MarketingContent; draggable: boolean; isDragging: boolean;
  onDragStart: (id: number) => void; onDragEnd: () => void; onOpen: () => void;
}) {
  const overdue = !!item.deadline && item.deadline < todayYmd() && !['published', 'analytics'].includes(item.stage);
  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(item.id); }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
      className={classNames(
        'cursor-pointer rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5 text-left shadow-sm transition hover:border-cyan-300 hover:shadow',
        isDragging && 'opacity-50',
      )}
    >
      <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200" title={item.title}>
        {item.format ? `${cap(item.format)} | ` : ''}{item.title}
      </p>
      <div className="mt-1.5 space-y-0.5 text-[11px] text-gray-500 dark:text-gray-400">
        <p className="flex items-center gap-1 truncate">
          <UserIcon className="h-3 w-3 shrink-0 text-gray-400" />
          <span className="truncate">Owner: <b className="font-medium text-gray-700 dark:text-gray-300">{item.ownerName ?? 'Unassigned'}</b></span>
        </p>
        <p className="truncate">
          D: {item.designerName ?? '—'} · V: {item.videographerName ?? '—'} · E: {item.editorName ?? '—'}
        </p>
        {item.objective && (
          <p className="flex items-center gap-1 truncate"><Target className="h-3 w-3 shrink-0 text-gray-400" /> {item.objective}</p>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className={classNames('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.medium)}>
          {cap(item.priority)}
        </span>
        {item.platform && (
          <span className="inline-flex items-center rounded-md border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-700">
            {cap(item.platform)}
          </span>
        )}
        {item.deadline && (
          <span className={classNames('ml-auto inline-flex items-center gap-1 text-[10px] font-medium', overdue ? 'text-rose-600' : 'text-gray-500')}>
            <Calendar className="h-3 w-3" /> {prettyDate(item.deadline)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Board page ──────────────────────────────────────────────────────────────── */
export default function ContentProductionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('marketing.content.create');
  // Backend accepts move OR edit for stage moves; mirror that for the drag affordance.
  const canMove = hasPermission('marketing.content.move') || hasPermission('marketing.content.edit');

  const [contents, setContents] = useState<MarketingContent[]>([]);
  const [users, setUsers] = useState<UserDbResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Filters — server-side (the board never fetches unrelated records).
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [f, setF] = useState({ ownerId: 'all', designerId: 'all', videographerId: 'all', editorId: 'all', platform: 'all', priority: 'all', objective: 'all', deadlineFrom: '', deadlineTo: '' });
  const setFilter = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));
  const filtersDirty = Object.entries(f).some(([, v]) => v !== 'all' && v !== '') || appliedSearch !== '';

  // Debounce search → appliedSearch.
  useEffect(() => {
    const t = setTimeout(() => setAppliedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const filters: ContentFilters = { search: appliedSearch || undefined, ...f };
      const rows = await fetchContents(filters);
      setContents(rows);
    } catch (err: any) {
      setError(err?.message || 'Failed to load content items.');
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, f]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchUsers('marketing').then(setUsers).catch(() => setUsers([])); }, []);

  const byStage = useMemo(() => {
    const map: Record<string, MarketingContent[]> = {};
    for (const s of [...CONTENT_STAGES, BLOCKED_STAGE]) map[s.key] = [];
    for (const c of contents) (map[c.stage] ?? (map[c.stage] = [])).push(c);
    return map;
  }, [contents]);

  // ── Native HTML5 drag-and-drop (same approach as the Lead Pipeline board) ──
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const handleDrop = async (stageKey: string) => {
    const id = draggedId;
    setDraggedId(null);
    setDragOverStage(null);
    if (id == null) return;
    const item = contents.find((c) => c.id === id);
    if (!item || item.stage === stageKey) return;
    const prevStage = item.stage;
    // Optimistic move; PERSISTED via the API — reverted if the backend rejects it.
    setContents((prev) => prev.map((c) => (c.id === id ? { ...c, stage: stageKey } : c)));
    try {
      await moveContentStage(id, stageKey);
    } catch (err: any) {
      setContents((prev) => prev.map((c) => (c.id === id ? { ...c, stage: prevStage } : c)));
      toast(err?.details?.error || 'Could not move content — change was not saved.', 'error');
    }
  };

  const renderColumn = (stage: { key: string; label: string }, blocked = false) => {
    const theme = STAGE_THEMES[stage.key];
    const items = byStage[stage.key] ?? [];
    const isOver = dragOverStage === stage.key;
    return (
      <div
        key={stage.key}
        onDragOver={(e) => { if (!canMove) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
        onDragEnter={(e) => { if (!canMove) return; e.preventDefault(); setDragOverStage(stage.key); }}
        onDragLeave={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          if (e.clientX < r.left || e.clientX >= r.right || e.clientY < r.top || e.clientY >= r.bottom) {
            setDragOverStage((s) => (s === stage.key ? null : s));
          }
        }}
        onDrop={(e) => { if (!canMove) return; e.preventDefault(); handleDrop(stage.key); }}
        className={classNames(
          'flex max-h-[74vh] w-[280px] shrink-0 flex-col rounded-xl border border-t-4 p-2.5 transition-all',
          theme.border,
          blocked
            ? 'border-rose-200/80 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/10 [border-top-style:solid] border-dashed'
            : 'border-gray-200/60 dark:border-gray-800/80 bg-gray-50/80 dark:bg-gray-900/40',
          isOver && 'ring-2 ring-cyan-500/30 bg-cyan-50/30 dark:bg-cyan-950/10',
        )}
      >
        <div className="mb-2 flex items-center gap-2 px-1">
          <span className={classNames('h-2.5 w-2.5 rounded-full', theme.dot)} />
          <h2 className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200" title={stage.label}>{stage.label}</h2>
          <span className="rounded-full bg-gray-200/80 dark:bg-gray-800 px-2 py-0.5 text-xs font-bold leading-none text-gray-600 dark:text-gray-400">
            {items.length}
          </span>
          {blocked && <AlertTriangle className="ml-auto h-3.5 w-3.5 text-rose-400" />}
        </div>
        <div className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {items.length ? (
            items.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                draggable={canMove}
                isDragging={draggedId === item.id}
                onDragStart={setDraggedId}
                onDragEnd={() => { setDraggedId(null); setDragOverStage(null); }}
                onOpen={() => router.push(`/dashboard/marketing/content/${item.id}`)}
              />
            ))
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800 px-2 py-8 text-center text-xs text-gray-400 dark:text-gray-600">
              {blocked ? 'Nothing blocked' : `No content in ${stage.label}`}
            </div>
          )}
        </div>
      </div>
    );
  };

  const selectCls = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Content Production</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Idea → strategy → production → publishing → performance, on one board.</p>
          </div>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 self-start rounded-lg bg-cyan-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
          >
            <Plus className="h-4 w-4" /> Create Content
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div className="space-y-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search content title or description…"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1.5 pl-8 pr-3 text-xs text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={classNames(
              'inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition',
              filtersOpen || filtersDirty
                ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50',
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            {filtersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
        {filtersOpen && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <select value={f.ownerId} onChange={setFilter('ownerId')} className={selectCls}>
              <option value="all">Owner: All</option>
              {users.map((u) => <option key={u.id} value={u.id}>Owner: {u.name}</option>)}
            </select>
            <select value={f.designerId} onChange={setFilter('designerId')} className={selectCls}>
              <option value="all">Designer: All</option>
              {users.map((u) => <option key={u.id} value={u.id}>Designer: {u.name}</option>)}
            </select>
            <select value={f.videographerId} onChange={setFilter('videographerId')} className={selectCls}>
              <option value="all">Videographer: All</option>
              {users.map((u) => <option key={u.id} value={u.id}>Videographer: {u.name}</option>)}
            </select>
            <select value={f.editorId} onChange={setFilter('editorId')} className={selectCls}>
              <option value="all">Editor: All</option>
              {users.map((u) => <option key={u.id} value={u.id}>Editor: {u.name}</option>)}
            </select>
            <select value={f.platform} onChange={setFilter('platform')} className={selectCls}>
              <option value="all">Platform: All</option>
              {CONTENT_PLATFORMS.map((p) => <option key={p} value={p}>Platform: {cap(p)}</option>)}
            </select>
            <select value={f.priority} onChange={setFilter('priority')} className={selectCls}>
              <option value="all">Priority: All</option>
              {CONTENT_PRIORITIES.map((p) => <option key={p} value={p}>Priority: {cap(p)}</option>)}
            </select>
            <select value={f.objective} onChange={setFilter('objective')} className={selectCls}>
              <option value="all">Objective: All</option>
              {CONTENT_OBJECTIVES.map((o) => <option key={o} value={o}>Objective: {o}</option>)}
            </select>
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              Deadline
              <input type="date" value={f.deadlineFrom} onChange={setFilter('deadlineFrom')} className={selectCls} />
              –
              <input type="date" value={f.deadlineTo} onChange={setFilter('deadlineTo')} className={selectCls} />
            </span>
            {filtersDirty && (
              <button
                type="button"
                onClick={() => { setF({ ownerId: 'all', designerId: 'all', videographerId: 'all', editorId: 'all', platform: 'all', priority: 'all', objective: 'all', deadlineFrom: '', deadlineTo: '' }); setSearch(''); }}
                className="rounded-full px-2 py-1 text-[11px] font-semibold text-cyan-600 hover:bg-cyan-50"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-300"><Loader2 className="h-7 w-7 animate-spin" /></div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-12 text-center">
          <p className="text-sm text-rose-600">{error}</p>
          <button onClick={() => { setLoading(true); load(); }} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700">Retry</button>
        </div>
      ) : (
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-4">
          {CONTENT_STAGES.map((s) => renderColumn(s))}
          {/* Blocked / Waiting — separated from the active workflow by a divider
              and its own dashed rose styling, never mixed into production stages. */}
          <div className="w-px shrink-0 self-stretch bg-gray-300 dark:bg-gray-700" aria-hidden />
          {renderColumn(BLOCKED_STAGE, true)}
        </div>
      )}

      <ContentFormModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        users={users}
        onCreated={() => { toast('Content created.', 'success'); load(); }}
      />
    </div>
  );
}
