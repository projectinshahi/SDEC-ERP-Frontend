'use client';

import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import { classNames } from '@/lib/utils';
import type { UserDbResponse } from '@/lib/api/users';
import type { ReferenceItem } from '@/lib/api/marketingContent';
import {
  buildChips, hasActiveFilters, MULTI_FILTER_OPTIONS, OBJECTIVE_OPTIONS,
  BOARD_SORTS, EMPTY_FILTERS, type BoardFilters, type BoardSort,
} from '@/lib/marketing/contentBoardFilters';

/**
 * The ONE filter bar, rendered by Kanban, List and the Deadline view. All three
 * therefore offer the same controls over the same shared filter state — there is
 * no second filter UI to keep in sync.
 *
 * Styling reuses the existing board control classes; nothing new is introduced.
 */

const selectCls =
  'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300';
const labelCls = 'mb-1 block text-[11px] font-semibold text-gray-500 dark:text-gray-400';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Multi-select rendered as toggle pills — no new dependency, keyboard-usable. */
function PillGroup({ options, selected, onToggle }: {
  options: readonly string[]; selected: string[]; onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o)}
            className={classNames(
              'rounded-md border px-2 py-1 text-[11px] font-semibold transition',
              on
                ? 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
            )}
          >
            {cap(o)}
          </button>
        );
      })}
    </div>
  );
}

export interface ContentFilterBarProps {
  filters: BoardFilters;
  onChange: (next: BoardFilters) => void;
  /** Live search box value (debounced by the page before it reaches `filters`). */
  searchDraft: string;
  onSearchDraft: (v: string) => void;
  open: boolean;
  onToggleOpen: () => void;
  clients: ReferenceItem[];
  users: UserDbResponse[];
  /** Sort control — omitted by views that own their own column sorting. */
  sort?: BoardSort;
  onSort?: (s: BoardSort) => void;
  sortLabel?: string;
  /** The Deadline view surfaces "My Cards" as a first-class toggle. */
  showMine?: boolean;
  right?: React.ReactNode;
}

export function ContentFilterBar({
  filters, onChange, searchDraft, onSearchDraft, open, onToggleOpen,
  clients, users, sort, onSort, sortLabel = 'Sort', showMine = false, right,
}: ContentFilterBarProps) {
  const toggleMulti = (key: 'platforms' | 'formats' | 'priorities') => (v: string) =>
    onChange({
      ...filters,
      [key]: filters[key].includes(v) ? filters[key].filter((x) => x !== v) : [...filters[key], v],
    });

  const chips = buildChips(filters, {
    clientName: (id) => clients.find((c) => String(c.id) === id)?.name,
    userName: (id) => users.find((u) => String(u.id) === id)?.name,
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={searchDraft}
            onChange={(e) => onSearchDraft(e.target.value)}
            placeholder="Search content…"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1.5 pl-8 pr-2.5 text-xs text-gray-700 dark:text-gray-300"
          />
        </div>

        {showMine && (
          <button
            type="button"
            aria-pressed={filters.mine}
            onClick={() => onChange({ ...filters, mine: !filters.mine })}
            className={classNames(
              'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
              filters.mine
                ? 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
            )}
          >
            My Cards
          </button>
        )}

        {sort && onSort && (
          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            {sortLabel}
            <select value={sort} onChange={(e) => onSort(e.target.value as BoardSort)} className={selectCls}>
              {BOARD_SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={onToggleOpen}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {right}
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelCls} htmlFor="flt-client">Client / Brand</label>
            <select id="flt-client" value={filters.clientId} onChange={(e) => onChange({ ...filters, clientId: e.target.value })} className={classNames(selectCls, 'w-full')}>
              <option value="">{clients.length ? 'All clients' : 'None configured'}</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="flt-team">Team Member</label>
            <select id="flt-team" value={filters.teamMember} onChange={(e) => onChange({ ...filters, teamMember: e.target.value })} className={classNames(selectCls, 'w-full')}>
              <option value="">All team members</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="flt-objective">Objective</label>
            <select id="flt-objective" value={filters.objective} onChange={(e) => onChange({ ...filters, objective: e.target.value })} className={classNames(selectCls, 'w-full')}>
              <option value="">All objectives</option>
              {OBJECTIVE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <span className={labelCls}>Platform(s)</span>
            <PillGroup options={MULTI_FILTER_OPTIONS.platforms} selected={filters.platforms} onToggle={toggleMulti('platforms')} />
          </div>
          <div>
            <span className={labelCls}>Content Type</span>
            <PillGroup options={MULTI_FILTER_OPTIONS.formats} selected={filters.formats} onToggle={toggleMulti('formats')} />
          </div>
          <div>
            <span className={labelCls}>Priority</span>
            <PillGroup options={MULTI_FILTER_OPTIONS.priorities} selected={filters.priorities} onToggle={toggleMulti('priorities')} />
          </div>
          {/* M09 #42 — one shared filter option, rendered on Kanban, List and
              Deadlines alike; the condition itself lives server-side. */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={filters.awaitingPerformance}
                onChange={(e) => onChange({ ...filters, awaitingPerformance: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
              />
              Awaiting Performance Data
              <span className="text-[11px] text-gray-400">— published cards with no metrics recorded yet</span>
            </label>
          </div>
        </div>
      )}

      {/* Active filter chips — each removes only its own value. */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span key={chip.key} className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 py-0.5 pl-2 pr-1 text-[11px] font-semibold text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300">
              {chip.label}
              <button
                type="button"
                aria-label={`Remove filter ${chip.label}`}
                onClick={() => onChange(chip.remove(filters))}
                className="rounded-full p-0.5 hover:bg-cyan-100 dark:hover:bg-cyan-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {hasActiveFilters(filters) && (
            <button
              type="button"
              onClick={() => { onSearchDraft(''); onChange({ ...EMPTY_FILTERS }); }}
              className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
}
