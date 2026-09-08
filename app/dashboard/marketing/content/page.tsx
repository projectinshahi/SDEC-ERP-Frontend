'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Plus, Calendar, Target, User as UserIcon, AlertTriangle } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import { fetchUsers, type UserDbResponse } from '@/lib/api/users';
import {
  fetchContents, moveContentStage, fetchReferenceData,
  CONTENT_STAGES, BLOCKED_STAGE,
  isBackwardMove, REVIEW_STAGE_KEY,
  type MarketingContent, type ReferenceItem,
} from '@/lib/api/marketingContent';
import { ContentFormModal } from '@/components/marketing/ContentFormModal';
import { ContentFilterBar } from '@/components/marketing/ContentFilterBar';
import { ViewToggle } from '@/components/marketing/ViewToggle';
import { BoardSkeleton } from '@/components/marketing/ContentSkeletons';
import { StageBackReasonModal, type StageBackRequest } from '@/components/marketing/StageBackReasonModal';
import {
  EMPTY_FILTERS, hasActiveFilters, filtersFromParams, filtersToQuery, filtersToApiParams,
  sortCards, loadSortPreference, saveSortPreference, isOverdue,
  type BoardFilters, type BoardSort,
} from '@/lib/marketing/contentBoardFilters';

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

const TYPE_BADGE: Record<string, string> = {
  poster: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  carousel: 'bg-violet-50 text-violet-700 border-violet-200',
  reel: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  video: 'bg-teal-50 text-teal-700 border-teal-200',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
};

const cap = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

/** Message the shared api-client puts on a rejected request. */
const apiError = (e: unknown): string | undefined =>
  (e as { details?: { error?: string } } | null)?.details?.error;

/** Human stage name for toast copy — never a raw key. */
const stageName = (key: string) =>
  [...CONTENT_STAGES, BLOCKED_STAGE].find((s) => s.key === key)?.label ?? key;

const prettyDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

/* ── Compact Kanban card ─────────────────────────────────────────────────────── */
function ContentCard({ item, draggable, isDragging, onDragStart, onDragEnd, onOpen }: {
  item: MarketingContent; draggable: boolean; isDragging: boolean;
  onDragStart: (id: number) => void; onDragEnd: () => void; onOpen: () => void;
}) {
  // Nearest deadline is computed SERVER-side across every production date; a
  // Published card is never flagged overdue.
  const nearest = item.nearestDeadline ?? item.deadline ?? null;
  const overdue = isOverdue(nearest, item.stage);
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
      <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200" title={item.title}>{item.title}</p>
      <div className="mt-1.5 space-y-0.5 text-[11px] text-gray-500 dark:text-gray-400">
        <p className="flex items-center gap-1 truncate">
          <UserIcon className="h-3 w-3 shrink-0 text-gray-400" />
          <span className="truncate">Owner: <b className="font-medium text-gray-700 dark:text-gray-300">{item.ownerName ?? 'Unassigned'}</b></span>
        </p>
        <p className="truncate" title={`Designer: ${item.designerName ?? 'Unassigned'} · Videographer: ${item.videographerName ?? 'Unassigned'} · Editor: ${item.editorName ?? 'Unassigned'}`}>
          D: {item.designerName ?? 'Unassigned'} · V: {item.videographerName ?? 'Unassigned'} · E: {item.editorName ?? 'Unassigned'}
        </p>
        {!!item.platforms?.length && (
          <span className="flex flex-wrap gap-1 pt-0.5">
            {item.platforms.map((pl) => (
              <span key={pl} className="inline-flex rounded border border-cyan-200 bg-cyan-50 px-1 text-[9px] font-semibold text-cyan-700">{cap(pl)}</span>
            ))}
          </span>
        )}
        {item.objective && (
          <p className="flex items-center gap-1 truncate"><Target className="h-3 w-3 shrink-0 text-gray-400" /> {item.objective}</p>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {/* Content Type badge — same colour mapping as the Content Cards table. */}
        {item.format && (
          <span className={classNames('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', TYPE_BADGE[item.format] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
            {cap(item.format)}
          </span>
        )}
        <span className={classNames('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.medium)}>
          {cap(item.priority)}
        </span>
        {item.platform && (
          <span className="inline-flex items-center rounded-md border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-700">
            {cap(item.platform)}
          </span>
        )}
        {nearest && (
          <span className={classNames('ml-auto inline-flex items-center gap-1 text-[10px] font-medium', overdue ? 'text-rose-600' : 'text-gray-500')}>
            <Calendar className="h-3 w-3" /> {prettyDate(nearest)}{overdue && <span className="font-bold uppercase"> overdue</span>}
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
  const { user } = useAuth();
  // Auth exposes the user id as a string; card assignments are numeric ids.
  const currentUserId = user?.id != null ? Number(user.id) : null;
  /**
   * Stage 7 (Review / Approval) cards may only be advanced by the assigned
   * Approver, so they are not draggable for anyone else. This mirrors the
   * server rule — it is an affordance, never the enforcement point.
   */
  const canDragCard = (c: MarketingContent) =>
    canMove && (c.stage !== REVIEW_STAGE_KEY || (!!currentUserId && c.approverId === currentUserId));

  const [contents, setContents] = useState<MarketingContent[]>([]);
  const [users, setUsers] = useState<UserDbResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  /* ── Shared filter state ────────────────────────────────────────────────────
   * The URL query string IS the filter state, and it is the SAME serialisation
   * the List and Deadline views read. That makes the view toggle an ordinary
   * link: filters survive it because they were never held in component state.
   */
  const searchParams = useSearchParams();
  const filters = useMemo<BoardFilters>(
    () => filtersFromParams(new URLSearchParams(searchParams?.toString() ?? '')),
    [searchParams],
  );
  /* The box is a draft of `filters.search`. Rather than syncing it back with an
     effect, it re-derives itself during render whenever the URL's search value
     changes — no cascading render, and an external filter change (a chip, Clear
     All, the view toggle) is reflected immediately. */
  const [draft, setDraft] = useState({ value: filters.search, from: filters.search });
  const searchDraft = draft.from === filters.search ? draft.value : filters.search;
  if (draft.from !== filters.search) setDraft({ value: filters.search, from: filters.search });
  const setSearchDraft = (v: string) => setDraft({ value: v, from: filters.search });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [clients, setClients] = useState<ReferenceItem[]>([]);
  const [sort, setSort] = useState<BoardSort>('deadline');
  /** Shared helper — the empty-state wording must agree with the chips. */
  const anyFilterActive = hasActiveFilters(filters);

  // Session-scoped sort preference (never written to the database).
  useEffect(() => { setSort(loadSortPreference()); }, []);
  const applySort = (next: BoardSort) => { setSort(next); saveSortPreference(next); };

  const applyFilters = useCallback((next: BoardFilters) => {
    const qs = filtersToQuery(next);
    // scroll: false — changing a filter must not jump the board to the top.
    router.replace(qs ? `?${qs}` : '/dashboard/marketing/content', { scroll: false });
  }, [router]);

  // Debounce the search box into the shared filter state.
  useEffect(() => {
    if (searchDraft === filters.search) return;
    const t = setTimeout(() => applyFilters({ ...filters, search: searchDraft.trim() }), 350);
    return () => clearTimeout(t);
  }, [searchDraft, filters, applyFilters]);

  const load = useCallback(async () => {
    setError(null);
    try {
      // Server-side filtering through the SHARED param names.
      setContents(await fetchContents(filtersToApiParams(filters)));
    } catch (err) {
      setError((err as Error)?.message || 'Failed to load content items.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchUsers('marketing').then(setUsers).catch(() => setUsers([])); }, []);
  useEffect(() => { fetchReferenceData().then((d) => setClients(d.clients)).catch(() => setClients([])); }, []);

  const byStage = useMemo(() => {
    const map: Record<string, MarketingContent[]> = {};
    for (const s of [...CONTENT_STAGES, BLOCKED_STAGE]) map[s.key] = [];
    for (const c of contents) (map[c.stage] ?? (map[c.stage] = [])).push(c);
    // Column sort is applied to every column from ONE board-level preference,
    // using the shared comparators the List view also uses.
    for (const key of Object.keys(map)) map[key] = sortCards(map[key], sort);
    return map;
  }, [contents, sort]);

  // ── Native HTML5 drag-and-drop (same approach as the Lead Pipeline board) ──
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [stageBack, setStageBack] = useState<StageBackRequest | null>(null);

  const handleDrop = async (stageKey: string) => {
    const id = draggedId;
    setDraggedId(null);
    setDragOverStage(null);
    if (id == null) return;
    const item = contents.find((c) => c.id === id);
    if (!item || item.stage === stageKey) return;
    const prevStage = item.stage;

    // BACKWARD moves open the mandatory-reason modal FIRST. Nothing is moved
    // optimistically and nothing is persisted until the reason is supplied, so
    // cancelling leaves the card in its original column with no phantom state.
    if (isBackwardMove(prevStage, stageKey)) {
      setStageBack({ cardId: id, cardTitle: item.title, from: prevStage, to: stageKey });
      return;
    }
    /* A forward move can still be refused by a stage gate (Copy Ready, the
     * Stage 7 Approver rule, the Review entry conditions). commitMove reverts
     * the optimistic move and rethrows, so without this catch the rejection was
     * unhandled and the card snapped back with NO explanation. */
    try {
      await commitMove(id, prevStage, stageKey);
      toast(`Card moved to ${stageName(stageKey)}`, 'success');
    } catch (err) {
      toast(apiError(err) || `Unable to move the card to ${stageName(stageKey)}`, 'error');
    }
  };

  /** The one place a stage move is persisted from this board. */
  const commitMove = async (id: number, prevStage: string, stageKey: string, reason?: string) => {
    // Optimistic move; PERSISTED via the API — reverted if the backend rejects it.
    setContents((prev) => prev.map((c) => (c.id === id ? { ...c, stage: stageKey } : c)));
    try {
      await moveContentStage(id, stageKey, reason);
    } catch (err) {
      setContents((prev) => prev.map((c) => (c.id === id ? { ...c, stage: prevStage } : c)));
      throw err;
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
                draggable={canDragCard(item)}
                isDragging={draggedId === item.id}
                onDragStart={setDraggedId}
                onDragEnd={() => { setDraggedId(null); setDragOverStage(null); }}
                onOpen={() => router.push(`/dashboard/marketing/content/${item.id}`)}
              />
            ))
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800 px-2 py-8 text-center text-xs text-gray-400 dark:text-gray-600">
              {/* Says WHY the column is empty: a filtered-out column reads very
                  differently from a genuinely empty stage. */}
              {blocked
                ? (anyFilterActive ? 'No blocked cards match these filters' : 'Nothing blocked')
                : anyFilterActive
                  ? `No cards in ${stage.label} match these filters`
                  : `No content in ${stage.label} yet`}
            </div>
          )}
        </div>
      </div>
    );
  };


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

      {/* Search + shared filters + view toggle + column sort */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5">
        <ContentFilterBar
          filters={filters}
          onChange={applyFilters}
          searchDraft={searchDraft}
          onSearchDraft={setSearchDraft}
          open={filtersOpen}
          onToggleOpen={() => setFiltersOpen((v) => !v)}
          clients={clients}
          users={users}
          sort={sort}
          onSort={applySort}
          sortLabel="Sort columns by"
          right={<ViewToggle current="board" query={filtersToQuery(filters)} />}
        />
      </div>

      {/* Board */}
      {loading ? (
        // Skeleton mirrors the real column layout, so the board does not jump
        // when the data lands.
        <BoardSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-12 text-center">
          <p className="text-sm text-rose-600">{error}</p>
          <button onClick={() => { setLoading(true); load(); }} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700">Retry</button>
        </div>
      ) : (
        <>
        {/* Board-level empty state. Rendered only once loading has finished, so
            it can never flash in place of a pending request. */}
        {contents.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-10 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {anyFilterActive ? 'No content cards match these filters' : 'No content cards yet'}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {anyFilterActive
                ? 'Try removing a filter chip above, or clear all filters to see every card.'
                : 'Create the first content card to start planning work on the board.'}
            </p>
            {anyFilterActive ? (
              <button type="button" onClick={() => { setSearchDraft(''); applyFilters({ ...EMPTY_FILTERS }); }}
                className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                Clear all filters
              </button>
            ) : canCreate ? (
              <button type="button" onClick={() => setCreateOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700">
                <Plus className="h-3.5 w-3.5" /> Create Content
              </button>
            ) : null}
          </div>
        )}
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-4">
          {CONTENT_STAGES.map((s) => renderColumn(s))}
          {/* Blocked / Waiting — separated from the active workflow by a divider
              and its own dashed rose styling, never mixed into production stages. */}
          <div className="w-px shrink-0 self-stretch bg-gray-300 dark:bg-gray-700" aria-hidden />
          {renderColumn(BLOCKED_STAGE, true)}
        </div>
        </>
      )}

      {/* #29 — mandatory reason for a backward move (drag/drop path). */}
      <StageBackReasonModal
        key={stageBack ? `${stageBack.cardId}-${stageBack.to}` : 'none'}
        request={stageBack}
        onCancel={() => setStageBack(null)}
        onConfirm={async (reason) => {
          const req = stageBack!;
          // Rethrows on failure so the modal shows the reason inline and stays
          // open — no success toast can fire for a rejected move.
          await commitMove(req.cardId, req.from, req.to, reason);
          setStageBack(null);
          toast(`Card moved to ${stageName(req.to)} — the reason was recorded in the stage history`, 'success');
        }}
      />

      <ContentFormModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        users={users}
        onCreated={() => { toast('Content card created successfully', 'success'); load(); }}
      />
    </div>
  );
}
