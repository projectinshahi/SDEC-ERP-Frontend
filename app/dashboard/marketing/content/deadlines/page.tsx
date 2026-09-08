'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarClock, Loader2, AlertTriangle, FileText, Download } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { fetchUsers, type UserDbResponse } from '@/lib/api/users';
import { fetchContentList, fetchReferenceData, downloadContentExport, type ContentListRow, type ReferenceItem } from '@/lib/api/marketingContent';
import { ContentFilterBar } from '@/components/marketing/ContentFilterBar';
import { useToast } from '@/lib/hooks/useToast';
import { ViewToggle } from '@/components/marketing/ViewToggle';
import { TableSkeleton } from '@/components/marketing/ContentSkeletons';
import {
  filtersFromParams, filtersToQuery, filtersToApiParams, sortCards, isOverdue, hasActiveFilters,
  type BoardFilters,
} from '@/lib/marketing/contentBoardFilters';

/**
 * M06 #33 — Deadline list.
 *
 * A THIRD view over the same data, not a third implementation: it calls the same
 * `/marketing/content/list` endpoint (whose `where` comes from the shared server
 * filter builder) with `hasDeadline=true`, renders the shared filter bar over
 * the shared URL filter state, and sorts with the shared comparator. The only
 * thing unique to this page is the layout.
 */

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
};
const TYPE_BADGE: Record<string, string> = {
  poster: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  carousel: 'bg-violet-50 text-violet-700 border-violet-200',
  reel: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  video: 'bg-teal-50 text-teal-700 border-teal-200',
};
const cap = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');
const prettyDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};


/** Server-built CSV of the CURRENT filter set — same query, same rows. */
function ExportCsvButton({ kind, params, label }: {
  kind: 'content-cards' | 'deadlines'; params: Record<string, string>; label: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadContentExport(kind, params);
          toast(`${label.replace('Export ', '').replace(' CSV', '')} exported successfully`, 'success');
        } catch (err) {
          toast(
            (err as { details?: { error?: string } } | null)?.details?.error
              || 'Unable to export the CSV. Please try again.',
            'error',
          );
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} {label}
    </button>
  );
}

export default function ContentDeadlinesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ContentListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserDbResponse[]>([]);
  const [clients, setClients] = useState<ReferenceItem[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const applyFilters = useCallback((next: BoardFilters) => {
    const qs = filtersToQuery(next);
    router.replace(qs ? `?${qs}` : '/dashboard/marketing/content/deadlines', { scroll: false });
  }, [router]);

  useEffect(() => {
    if (searchDraft === filters.search) return;
    const t = setTimeout(() => applyFilters({ ...filters, search: searchDraft.trim() }), 350);
    return () => clearTimeout(t);
  }, [searchDraft, filters, applyFilters]);

  const load = useCallback(async () => {
    setError(null);
    try {
      // hasDeadline is the ONLY thing this view adds to the shared filter set.
      // "My Cards" is resolved server-side from the session, never from a
      // client-supplied user id, so it can never widen what is returned.
      setRows(await fetchContentList({ ...filtersToApiParams(filters), hasDeadline: 'true' }));
    } catch (err) {
      const e = err as { details?: { error?: string }; message?: string };
      setError(e?.details?.error || e?.message || 'Failed to load deadlines.');
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchUsers('marketing').then(setUsers).catch(() => setUsers([])); }, []);
  useEffect(() => { fetchReferenceData().then((d) => setClients(d.clients)).catch(() => setClients([])); }, []);

  // Nearest deadline first, using the shared comparator (ISO text compare — no
  // Date object, so no timezone can move a card across a day boundary).
  const sorted = useMemo(() => sortCards(rows, 'deadline'), [rows]);
  const overdueCount = sorted.filter((r) => isOverdue(r.nearestDeadline, r.stage)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Deadlines</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Active content cards with a production deadline, nearest first.
              {overdueCount > 0 && <span className="ml-1 font-semibold text-rose-600">{overdueCount} overdue.</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton kind="deadlines" params={filtersToApiParams(filters)} label="Export Deadlines CSV" />
        <ViewToggle current="deadlines" query={filtersToQuery(filters)} />
        </div>
      </div>

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
          showMine
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <TableSkeleton columns={8} />
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle className="h-8 w-8 text-rose-400" />
            <p className="text-sm text-gray-600 dark:text-gray-300">{error}</p>
            <button onClick={() => { setLoading(true); load(); }} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700">Retry</button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <FileText className="h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {hasActiveFilters(filters) ? 'No deadlines match these filters' : 'No upcoming deadlines'}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {hasActiveFilters(filters)
                ? 'Remove a filter chip above, or clear all filters to see every dated card.'
                : 'Only active cards with a production deadline appear here. Set a deadline on a card to see it listed.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800">
                  <th className="whitespace-nowrap px-4 py-2.5">Deadline</th>
                  <th className="whitespace-nowrap px-4 py-2.5">Content ID</th>
                  <th className="whitespace-nowrap px-4 py-2.5">Title</th>
                  <th className="whitespace-nowrap px-4 py-2.5">Type</th>
                  <th className="whitespace-nowrap px-4 py-2.5">Priority</th>
                  <th className="whitespace-nowrap px-4 py-2.5">Stage</th>
                  <th className="whitespace-nowrap px-4 py-2.5">Owner</th>
                  <th className="whitespace-nowrap px-4 py-2.5">Platform(s)</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const overdue = isOverdue(r.nearestDeadline, r.stage);
                  return (
                    <tr
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/dashboard/marketing/content/${r.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/dashboard/marketing/content/${r.id}`); }}
                      className="cursor-pointer border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/70 dark:border-gray-800/60 dark:hover:bg-gray-800/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={classNames('font-semibold', overdue ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-gray-200')}>
                          {r.nearestDeadline ? prettyDate(r.nearestDeadline) : '—'}
                          {/* Overdue is never signalled by colour alone. */}
                          {overdue && <span className="ml-1 text-[10px] font-bold uppercase">Overdue</span>}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{r.contentId ?? '—'}</td>
                      <td className="max-w-[280px] truncate px-4 py-3 font-medium text-gray-800 dark:text-gray-200" title={r.title}>{r.title}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={classNames('inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', TYPE_BADGE[r.format ?? ''] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
                          {cap(r.format)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={classNames('inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', PRIORITY_BADGE[r.priority] ?? PRIORITY_BADGE.medium)}>
                          {cap(r.priority)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">{r.stageLabel}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">
                        {r.ownerName ?? <span className="text-gray-400">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.platforms.length ? (
                          <span className="flex flex-wrap gap-1">
                            {r.platforms.map((p) => (
                              <span key={p} className="inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-700">{cap(p)}</span>
                            ))}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
