import { CONTENT_FORMATS, CONTENT_PLATFORMS, CONTENT_PRIORITIES, CONTENT_OBJECTIVES } from '@/lib/api/marketingContent';

/**
 * M06 #30–#33 — THE shared board-filter definition.
 *
 * Kanban, the List/Table view and the Deadline view all import this module, so
 * the three cannot drift into three dialects of the same filter. It owns:
 *   • the filter shape and its empty value
 *   • URL <-> state serialisation (the URL is the single filter state, so the
 *     Kanban <-> List toggle carries filters for free — it is just a link)
 *   • the query object handed to the API (server-side filtering)
 *   • the active-filter chips
 *   • the sort comparators
 * No filtering rule is written anywhere else in the frontend.
 */

export interface BoardFilters {
  search: string;
  /** Single-select. */
  clientId: string;
  teamMember: string;
  objective: string;
  /** Multi-select — OR within the filter, AND across filters (matches the API). */
  platforms: string[];
  formats: string[];
  priorities: string[];
  /** Deadline view only; harmless elsewhere. */
  mine: boolean;
  /** M09 #42 — Published/Analytics cards with no performance data recorded. */
  awaitingPerformance: boolean;
}

export const EMPTY_FILTERS: BoardFilters = {
  search: '', clientId: '', teamMember: '', objective: '',
  platforms: [], formats: [], priorities: [], mine: false, awaitingPerformance: false,
};

export const MULTI_FILTER_OPTIONS = {
  platforms: CONTENT_PLATFORMS as readonly string[],
  formats: CONTENT_FORMATS as readonly string[],
  priorities: CONTENT_PRIORITIES as readonly string[],
} as const;

export const OBJECTIVE_OPTIONS = CONTENT_OBJECTIVES as readonly string[];

export const hasActiveFilters = (f: BoardFilters): boolean =>
  !!f.search || !!f.clientId || !!f.teamMember || !!f.objective ||
  f.platforms.length > 0 || f.formats.length > 0 || f.priorities.length > 0 || f.mine ||
  f.awaitingPerformance;

/* ── URL <-> state ─────────────────────────────────────────────────────────── */

const csv = (v: string | null): string[] => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

/** Read the filters out of a URLSearchParams — the ONLY place filters are parsed. */
export function filtersFromParams(p: URLSearchParams): BoardFilters {
  return {
    search: p.get('search') ?? '',
    clientId: p.get('clientId') ?? '',
    teamMember: p.get('teamMember') ?? '',
    objective: p.get('objective') ?? '',
    platforms: csv(p.get('platform')),
    formats: csv(p.get('format')),
    priorities: csv(p.get('priority')),
    mine: p.get('mine') === 'true',
    awaitingPerformance: p.get('awaitingPerformance') === 'true',
  };
}

/** Serialise filters back to a query string (stable key order, empties omitted). */
export function filtersToQuery(f: BoardFilters): string {
  const p = new URLSearchParams();
  if (f.search) p.set('search', f.search);
  if (f.clientId) p.set('clientId', f.clientId);
  if (f.teamMember) p.set('teamMember', f.teamMember);
  if (f.objective) p.set('objective', f.objective);
  if (f.platforms.length) p.set('platform', f.platforms.join(','));
  if (f.formats.length) p.set('format', f.formats.join(','));
  if (f.priorities.length) p.set('priority', f.priorities.join(','));
  if (f.mine) p.set('mine', 'true');
  if (f.awaitingPerformance) p.set('awaitingPerformance', 'true');
  return p.toString();
}

/** The params sent to the API. Same names the shared server filter builder reads. */
export const filtersToApiParams = (f: BoardFilters): Record<string, string> =>
  Object.fromEntries(new URLSearchParams(filtersToQuery(f)));

/* ── Chips ─────────────────────────────────────────────────────────────────── */

export interface FilterChip {
  key: string;
  label: string;
  /** Returns the filters with just this one selection removed. */
  remove: (f: BoardFilters) => BoardFilters;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The active filters as removable chips. Each chip removes ONLY its own value —
 * a single platform out of a multi-select leaves the rest of that filter intact.
 */
export function buildChips(
  f: BoardFilters,
  lookups: { clientName?: (id: string) => string | undefined; userName?: (id: string) => string | undefined } = {},
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.search) chips.push({ key: 'search', label: `Search: ${f.search}`, remove: (p) => ({ ...p, search: '' }) });
  if (f.clientId) {
    chips.push({
      key: 'clientId',
      label: `Client: ${lookups.clientName?.(f.clientId) ?? f.clientId}`,
      remove: (p) => ({ ...p, clientId: '' }),
    });
  }
  for (const v of f.platforms) {
    chips.push({ key: `platform:${v}`, label: `Platform: ${cap(v)}`, remove: (p) => ({ ...p, platforms: p.platforms.filter((x) => x !== v) }) });
  }
  for (const v of f.formats) {
    chips.push({ key: `format:${v}`, label: `Type: ${cap(v)}`, remove: (p) => ({ ...p, formats: p.formats.filter((x) => x !== v) }) });
  }
  for (const v of f.priorities) {
    chips.push({ key: `priority:${v}`, label: `Priority: ${cap(v)}`, remove: (p) => ({ ...p, priorities: p.priorities.filter((x) => x !== v) }) });
  }
  if (f.teamMember) {
    chips.push({
      key: 'teamMember',
      label: `Team Member: ${lookups.userName?.(f.teamMember) ?? f.teamMember}`,
      remove: (p) => ({ ...p, teamMember: '' }),
    });
  }
  if (f.objective) chips.push({ key: 'objective', label: `Objective: ${f.objective}`, remove: (p) => ({ ...p, objective: '' }) });
  if (f.mine) chips.push({ key: 'mine', label: 'My Cards', remove: (p) => ({ ...p, mine: false }) });
  if (f.awaitingPerformance) {
    chips.push({
      key: 'awaitingPerformance',
      label: 'Awaiting Performance Data',
      remove: (p) => ({ ...p, awaitingPerformance: false }),
    });
  }
  return chips;
}

/* ── Sorting (#31) ─────────────────────────────────────────────────────────── */

export const BOARD_SORTS = [
  { key: 'deadline', label: 'Nearest Deadline' },
  { key: 'priority', label: 'Priority' },
  { key: 'created', label: 'Creation Date' },
] as const;
export type BoardSort = (typeof BOARD_SORTS)[number]['key'];
export const DEFAULT_SORT: BoardSort = 'deadline';

/** Business severity order — priority is NEVER sorted alphabetically. */
export const PRIORITY_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, urgent: 3 };

export interface SortableCard {
  nearestDeadline?: string | null;
  deadline?: string | null;
  priority?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  id: number;
}

const deadlineOf = (c: SortableCard) => c.nearestDeadline ?? c.deadline ?? null;
const createdOf = (c: SortableCard) => c.createdAt ?? c.created_at ?? null;

/**
 * Compare two cards for the given board sort. Always compares the UNDERLYING
 * values ('YYYY-MM-DD' strings sort chronologically as text, so no Date object
 * and therefore no timezone can shift a calendar day).
 *
 * Null deadlines sink to the bottom — the same convention the List view already
 * used before this change, so the two views agree.
 */
export function compareCards(a: SortableCard, b: SortableCard, sort: BoardSort): number {
  switch (sort) {
    case 'priority': {
      const d = (PRIORITY_RANK[b.priority ?? ''] ?? -1) - (PRIORITY_RANK[a.priority ?? ''] ?? -1);
      return d !== 0 ? d : a.id - b.id;   // highest first, stable
    }
    case 'created': {
      const av = createdOf(a) ?? '', bv = createdOf(b) ?? '';
      return bv.localeCompare(av) || a.id - b.id;  // newest first
    }
    default: {
      const av = deadlineOf(a), bv = deadlineOf(b);
      if (!av && !bv) return a.id - b.id;
      if (!av) return 1;
      if (!bv) return -1;
      return av.localeCompare(bv) || a.id - b.id;  // earliest first
    }
  }
}

export const sortCards = <T extends SortableCard>(cards: T[], sort: BoardSort): T[] =>
  [...cards].sort((a, b) => compareCards(a, b, sort));

/* ── Session-scoped sort preference (#31) ──────────────────────────────────── */

const SORT_KEY = 'marketing.content.boardSort';

export function loadSortPreference(): BoardSort {
  if (typeof window === 'undefined') return DEFAULT_SORT;
  const v = window.sessionStorage.getItem(SORT_KEY);
  return BOARD_SORTS.some((s) => s.key === v) ? (v as BoardSort) : DEFAULT_SORT;
}

export function saveSortPreference(sort: BoardSort): void {
  if (typeof window !== 'undefined') window.sessionStorage.setItem(SORT_KEY, sort);
}

/* ── Overdue (shared by every view) ────────────────────────────────────────── */

/** Local calendar day as 'YYYY-MM-DD' — compared as text, never as a Date. */
export const todayYmd = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * ONE overdue rule for Kanban, List and Deadline view, so the same card can
 * never look overdue in one view and on time in another. Published cards are
 * never overdue.
 */
export const isOverdue = (deadline: string | null | undefined, stage?: string | null): boolean =>
  !!deadline && deadline < todayYmd() && stage !== 'published';
