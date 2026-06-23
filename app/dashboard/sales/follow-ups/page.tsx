'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card } from '@/components/Card';
import { Clock, AlertTriangle, CheckCircle2, Inbox, ListChecks, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchMyFollowUps, completeFollowUp } from '@/lib/api/leadQualification';
import type { MyFollowUps, FollowUp } from '@/lib/types/leadQualification';

// Derived, mutually-exclusive lifecycle status. Completed always wins; an
// uncompleted follow-up past its due date is Overdue; otherwise Pending.
type DerivedStatus = 'Pending' | 'Completed' | 'Overdue';
type StatusFilter = 'all' | DerivedStatus;

const STATUS_BADGE: Record<DerivedStatus, string> = {
  Pending: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40',
  Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/40',
  Overdue: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/40',
};

// "22-Jun-2026 12:30 PM" — date + time so Due vs Completed can be compared.
function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${date} ${time}`;
}

const TYPE_LABELS: Record<string, string> = {
  follow_up: 'Follow-up', call: 'Call', initial: 'Initial', proposal_review: 'Proposal Review',
  manual: 'Manual', email: 'Email', meeting: 'Meeting',
};
function formatType(t?: string): string {
  if (!t) return '—';
  return TYPE_LABELS[t] || t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

type SortKey = 'action' | 'type' | 'assignee' | 'status' | 'due' | 'completed';

interface Row { fu: FollowUp; status: DerivedStatus }

export default function FollowUpCenterPage() {
  const { toast } = useToast();
  const [data, setData] = useState<MyFollowUps | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [completingId, setCompletingId] = useState<number | null>(null);
  // Column sort (cycles: none → asc → desc → none). null = natural bucket order.
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);
  const toggleSort = (key: SortKey) =>
    setSort((cur) => (cur?.key === key ? (cur.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setData(await fetchMyFollowUps());
    } catch {
      toast('Failed to load follow-ups', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Manual completion only — the system never auto-completes a follow-up.
  const handleComplete = async (id: number) => {
    try {
      setCompletingId(id);
      await completeFollowUp(id);
      toast('Follow-up marked as completed', 'success');
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to complete follow-up', 'error');
    } finally {
      setCompletingId(null);
    }
  };

  // Live counts come straight from the backend buckets (so Overdue/Pending match
  // the server's date math exactly — no client clock-skew). Pending = due today
  // or later; Overdue = past due & not completed; Completed = done.
  const pendingCount = (data?.counts?.today ?? 0) + (data?.counts?.upcoming ?? 0);
  const overdueCount = data?.counts?.overdue ?? 0;
  const completedCount = data?.counts?.completed ?? 0;
  const totalCount = pendingCount + overdueCount + completedCount;

  // One unified list, each row tagged with its derived status from its bucket.
  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    return [
      ...(data.overdue ?? []).map((fu) => ({ fu, status: 'Overdue' as const })),
      ...(data.today ?? []).map((fu) => ({ fu, status: 'Pending' as const })),
      ...(data.upcoming ?? []).map((fu) => ({ fu, status: 'Pending' as const })),
      ...(data.completed ?? []).map((fu) => ({ fu, status: 'Completed' as const })),
    ];
  }, [data]);

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((r) => statusFilter === 'all' || r.status === statusFilter);
    if (!sort) return filtered; // natural bucket order (overdue → today → upcoming → completed)
    const { key, dir } = sort;
    const mul = dir === 'asc' ? 1 : -1;
    const v = (r: Row): string | number => {
      switch (key) {
        case 'action': return r.fu.title.toLowerCase();
        case 'type': return formatType(r.fu.type).toLowerCase();
        case 'assignee': return (r.fu.owner?.name || '').toLowerCase();
        case 'status': return r.status;
        case 'due': return new Date(r.fu.scheduledDate).getTime();
        case 'completed': return r.fu.completedAt ? new Date(r.fu.completedAt).getTime() : 0;
      }
    };
    return [...filtered].sort((a, b) => {
      const av = v(a), bv = v(b);
      if (av < bv) return -1 * mul;
      if (av > bv) return 1 * mul;
      return 0;
    });
  }, [rows, statusFilter, sort]);

  const FILTERS: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalCount },
    { key: 'Pending', label: 'Pending', count: pendingCount },
    { key: 'Completed', label: 'Completed', count: completedCount },
    { key: 'Overdue', label: 'Overdue', count: overdueCount },
  ];

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Breadcrumb
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Sales', href: '/dashboard/sales' },
                { label: 'Follow-up Center', href: '/dashboard/sales/follow-ups' },
              ]}
            />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">Follow-up Center</h1>
          </div>
        </div>

        {/* Analytics — live Pending / Completed / Overdue counts */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AnalyticsCard label="Total" value={totalCount} icon={ListChecks} tone="text-blue-600 dark:text-blue-400" />
          <AnalyticsCard label="Pending" value={pendingCount} icon={Clock} tone="text-amber-600 dark:text-amber-400" />
          <AnalyticsCard label="Completed" value={completedCount} icon={CheckCircle2} tone="text-emerald-600 dark:text-emerald-400" />
          <AnalyticsCard label="Overdue" value={overdueCount} icon={AlertTriangle} tone="text-rose-600 dark:text-rose-400" alert={overdueCount > 0} />
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ key, label, count }) => {
            const active = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                {label}
                <span className={`rounded-full px-1.5 text-xs font-bold ${active ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <Card className="p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          {isLoading ? (
            <p className="text-sm text-gray-500 p-6">Loading…</p>
          ) : visibleRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Inbox className="w-8 h-8 text-gray-400" />
              <p className="text-sm text-gray-500">
                {statusFilter === 'Completed'
                  ? 'No completed follow-ups yet.'
                  : statusFilter === 'Overdue'
                    ? 'No overdue follow-ups — nicely done.'
                    : statusFilter === 'Pending'
                      ? 'No pending follow-ups.'
                      : 'Nothing here — you’re all caught up.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <SortHeader label="Action" sortKey="action" sort={sort} onSort={toggleSort} />
                    <SortHeader label="Type" sortKey="type" sort={sort} onSort={toggleSort} />
                    <SortHeader label="Assigned To" sortKey="assignee" sort={sort} onSort={toggleSort} />
                    <SortHeader label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
                    <SortHeader label="Due Date" sortKey="due" sort={sort} onSort={toggleSort} />
                    <SortHeader label="Completed Date" sortKey="completed" sort={sort} onSort={toggleSort} />
                    <th className="px-6 py-3 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {visibleRows.map(({ fu, status }) => (
                    <tr key={fu.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      {/* Action */}
                      <td className="px-6 py-3.5">
                        <Link
                          href={fu.leadId ? `/dashboard/sales/leads/${fu.leadId}` : '#'}
                          className="text-sm font-medium text-gray-800 dark:text-gray-100 hover:text-blue-600 break-words"
                        >
                          {fu.title}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">{fu.lead?.customer?.company || fu.lead?.title || '—'}</p>
                      </td>
                      {/* Type */}
                      <td className="px-6 py-3.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatType(fu.type)}</td>
                      {/* Assigned To */}
                      <td className="px-6 py-3.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{fu.owner?.name || '—'}</td>
                      {/* Status */}
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[status]}`}>
                          {status}
                        </span>
                      </td>
                      {/* Due Date — scheduled date/time (always shown) */}
                      <td className="px-6 py-3.5 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap tabular-nums">
                        {fmtDateTime(fu.scheduledDate)}
                      </td>
                      {/* Completed Date — actual completion timestamp, or — when not completed */}
                      <td className="px-6 py-3.5 text-xs whitespace-nowrap tabular-nums">
                        {fu.completedAt
                          ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">{fmtDateTime(fu.completedAt)}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-3.5 text-right">
                        {status === 'Completed' ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <button
                            onClick={() => handleComplete(fu.id)}
                            disabled={completingId === fu.id}
                            title="Mark this follow-up as completed"
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 size={15} />
                            {completingId === fu.id ? 'Saving…' : 'Mark as Completed'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PermissionPageGuard>
  );
}

function SortHeader({ label, sortKey, sort, onSort }: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: 'asc' | 'desc' } | null;
  onSort: (key: SortKey) => void;
}) {
  const active = sort?.key === sortKey;
  return (
    <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title={`Sort by ${label}`}>
        {label}
        {active ? (sort!.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-40" />}
      </button>
    </th>
  );
}

function AnalyticsCard({
  label, value, icon: Icon, tone, alert,
}: {
  label: string; value: number; icon: React.ComponentType<{ size?: number; className?: string }>; tone: string; alert?: boolean;
}) {
  return (
    <Card className={`p-4 bg-white dark:bg-gray-900 border rounded-2xl ${alert ? 'border-rose-300 dark:border-rose-700' : 'border-gray-200 dark:border-gray-800'}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <Icon size={16} className={tone} />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums mt-1">{value}</p>
    </Card>
  );
}
