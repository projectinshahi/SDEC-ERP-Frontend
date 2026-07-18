'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Loader2, Users, CheckCircle2, Clock, Percent, Search, ArrowUpDown, RefreshCw } from 'lucide-react';
import { fetchNoticeAcknowledgements, type NoticeAckStats } from '@/lib/api/notices';
import { classNames } from '@/lib/utils';

/**
 * Per-notice Read Tracking dashboard (management view). Summary cards + a sortable,
 * filterable recipient roster (read AND pending). Reuses the shared Modal; the
 * table collapses to cards on mobile. Data comes from the single acknowledgements
 * endpoint (no duplicate queries).
 */

type SortKey = 'name' | 'department' | 'readTime' | 'status';

function fmtDateTime(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusPill({ status }: { status: 'read' | 'pending' }) {
  return status === 'read'
    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Read</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700"><Clock className="h-3 w-3" /> Pending</span>;
}

function Card({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: typeof Users; tone: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</span>
        <Icon className={classNames('h-4 w-4', tone)} />
      </div>
      <p className="mt-1 text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

export function NoticeReadReportModal({
  isOpen, onClose, noticeId, noticeTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  noticeId: number | null;
  noticeTitle?: string;
}) {
  const [stats, setStats] = useState<NoticeAckStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'read' | 'pending'>('all');
  const [fromDate, setFromDate] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });

  // Last-request-wins: the modal instance is never unmounted between opens, so a slow
  // response for a previously-viewed notice could resolve after a newer one and clobber
  // its stats. Tag each request and ignore any stale resolution.
  const reqIdRef = useRef(0);
  const load = useCallback((initial: boolean) => {
    if (noticeId == null) return;
    const reqId = ++reqIdRef.current;
    if (initial) setLoading(true); else setRefreshing(true);
    fetchNoticeAcknowledgements(noticeId)
      .then((s) => { if (reqId === reqIdRef.current) setStats(s); })
      .catch(() => { if (reqId === reqIdRef.current && initial) setStats(null); })
      .finally(() => { if (reqId === reqIdRef.current) { if (initial) setLoading(false); else setRefreshing(false); } });
  }, [noticeId]);

  useEffect(() => {
    if (!isOpen || noticeId == null) return;
    setSearch(''); setDeptFilter('all'); setStatusFilter('all'); setFromDate('');
    load(true);
  }, [isOpen, noticeId, load]);

  const depts = useMemo(
    () => [...new Set((stats?.recipients || []).map((r) => r.department).filter(Boolean))].sort() as string[],
    [stats],
  );

  const rows = useMemo(() => {
    let list = stats?.recipients ?? [];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q) || (r.department || '').toLowerCase().includes(q));
    if (deptFilter !== 'all') list = list.filter((r) => r.department === deptFilter);
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter);
    if (fromDate) {
      const from = new Date(`${fromDate}T00:00:00`).getTime();
      list = list.filter((r) => r.readTime && new Date(r.readTime).getTime() >= from);
    }
    const { key, dir } = sort;
    return [...list].sort((a, b) => {
      if (key === 'readTime') {
        const av = a.readTime ? new Date(a.readTime).getTime() : 0;
        const bv = b.readTime ? new Date(b.readTime).getTime() : 0;
        return (av - bv) * dir;
      }
      return String((a as any)[key] || '').localeCompare(String((b as any)[key] || '')) * dir;
    });
  }, [stats, search, deptFilter, statusFilter, fromDate, sort]);

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir === 1 ? -1 : 1) as 1 | -1 } : { key, dir: 1 }));

  if (!isOpen) return null;

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th className="px-2 py-2">
      <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-gray-400 hover:text-gray-600">
        {label} <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Read Report" size="xl">
      <div className="space-y-4">
        <div className="-mt-1 flex items-center justify-between gap-2">
          {noticeTitle ? <p className="truncate text-sm font-semibold text-gray-700">{noticeTitle}</p> : <span />}
          <button type="button" onClick={() => load(false)} disabled={loading || refreshing} title="Refresh"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-60">
            <RefreshCw className={classNames('h-4 w-4', refreshing && 'animate-spin')} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-gray-300"><Loader2 className="h-7 w-7 animate-spin" /></div>
        ) : !stats ? (
          <p className="py-12 text-center text-sm text-rose-600">Failed to load the read report.</p>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Card label="Total Recipients" value={stats.totalRecipients} icon={Users} tone="text-slate-400" />
              <Card label="Read" value={stats.totalRead} icon={CheckCircle2} tone="text-emerald-500" />
              <Card label="Unread" value={stats.totalUnread} icon={Clock} tone="text-amber-500" />
              <Card label="Read %" value={`${stats.readPercentage}%`} icon={Percent} tone="text-indigo-500" />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[150px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or department…"
                  className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none" />
              </div>
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:outline-none">
                <option value="all">All departments</option>
                {depts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:outline-none">
                <option value="all">All statuses</option>
                <option value="read">Read</option>
                <option value="pending">Pending</option>
              </select>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="Read on/after"
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:outline-none" />
            </div>

            <p className="text-[11px] text-gray-400">{rows.length} of {stats.totalRecipients} recipients</p>

            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No recipients match these filters.</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden max-h-[46vh] overflow-y-auto rounded-xl border border-gray-100 sm:block">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr><Th k="name" label="Employee" /><Th k="department" label="Department" /><Th k="readTime" label="Read Time" /><Th k="status" label="Status" /></tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.userId} className="border-t border-gray-50">
                          <td className="px-2 py-2 text-sm font-medium text-gray-700">{r.name}</td>
                          <td className="px-2 py-2 text-sm text-gray-500">{r.department || '—'}</td>
                          <td className="px-2 py-2 text-xs text-gray-500">{r.readTime ? fmtDateTime(r.readTime) : '—'}</td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1.5">
                              <StatusPill status={r.status} />
                              {r.acknowledged && <span title="Explicitly acknowledged" className="inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">Ack</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="max-h-[50vh] space-y-2 overflow-y-auto sm:hidden">
                  {rows.map((r) => (
                    <div key={r.userId} className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-gray-800">{r.name}</span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <StatusPill status={r.status} />
                          {r.acknowledged && <span title="Explicitly acknowledged" className="inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">Ack</span>}
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-gray-500">
                        <span>{r.department || '—'}</span>
                        {r.readTime && <span>Read {fmtDateTime(r.readTime)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
