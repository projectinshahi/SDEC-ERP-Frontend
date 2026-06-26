'use client';

/**
 * Target Management — the Sales "Target" tab.
 *
 * Live revenue-target dashboard: summary cards, per-team aggregation, top
 * performers and a scoped target list (BDE = own, Manager = team, Admin = all).
 * Achievement, status and incentive are computed live on the backend from won
 * deals; nothing is manually maintained. Managers can create / edit / delete.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Target as TargetIcon, Plus, Filter, ListChecks, Activity, Trophy, XCircle,
  Wallet, TrendingUp, Percent, Users, Pencil, Trash2, Eye,
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { Badge } from '@/components/Badge';
import { SelectField } from '@/components/ui/SelectField';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { TargetFormModal } from '@/components/sales-execution/TargetFormModal';
import { TargetStatusBadge, PERIOD_TYPE_LABELS, formatTargetValue, achievementVariant } from '@/components/sales-execution/targetShared';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { fetchTargets, deleteTarget } from '@/lib/api/bdeDashboard';
import { fetchAssignableUsers } from '@/lib/api/leads';
import { formatINR } from '@/lib/utils/currency';
import { TARGET_TYPE_LABELS } from '@/lib/types/salesExecution';
import type { TargetListResponse, TargetListEntry } from '@/lib/types/salesExecution';
import type { AssignableUser } from '@/lib/types/lead';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'achieved', label: 'Achieved' },
  { value: 'exceeded', label: 'Exceeded' },
  { value: 'missed', label: 'Missed' },
  { value: 'expired', label: 'Expired' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  ...(Object.keys(TARGET_TYPE_LABELS) as (keyof typeof TARGET_TYPE_LABELS)[]).map((k) => ({ value: k, label: TARGET_TYPE_LABELS[k] })),
];

const PERIOD_TYPE_OPTIONS = [
  { value: 'all', label: 'All Periods' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

function TargetsPageInner() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('sales.targets.manage');

  const [data, setData] = useState<TargetListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [owners, setOwners] = useState<AssignableUser[]>([]);

  // Filters
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [periodType, setPeriodType] = useState('all');
  const [ownerId, setOwnerId] = useState('all');
  const [search, setSearch] = useState('');

  // Modal
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TargetListEntry | null>(null);

  const ownerOptions = useMemo(
    () => [{ value: 'all', label: 'All BDEs' }, ...owners.map((o) => ({ value: String(o.id), label: o.name }))],
    [owners],
  );

  // Stable reference for the modal's owner picker (prevents its seed effect from
  // re-firing on unrelated parent re-renders).
  const ownerPickerOptions = useMemo(() => owners.map((o) => ({ id: o.id, name: o.name })), [owners]);

  useEffect(() => {
    let active = true;
    fetchAssignableUsers()
      .then((u) => { if (active) setOwners(u); })
      .catch(() => { if (active) setOwners([]); });
    return () => { active = false; };
  }, []);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters: Record<string, any> = {};
      if (status !== 'all') filters.status = status;
      if (type !== 'all') filters.type = type;
      if (periodType !== 'all') filters.periodType = periodType;
      if (ownerId !== 'all') filters.ownerId = Number(ownerId);
      setData(await fetchTargets(filters));
    } catch (error: any) {
      toast(error?.message || 'Failed to load targets', 'error');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [status, type, periodType, ownerId, toast]);

  useEffect(() => { load(); }, [load]);

  const visibleTargets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data?.targets ?? [];
    if (!q) return list;
    return list.filter(
      (t) => (t.name || '').toLowerCase().includes(q) || t.ownerName.toLowerCase().includes(q),
    );
  }, [data?.targets, search]);

  const handleDelete = async (t: TargetListEntry) => {
    const ok = await confirm({
      title: 'Delete target',
      message: `Delete the ${TARGET_TYPE_LABELS[t.type]} target for ${t.ownerName} (${t.period})? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      intent: 'danger',
    });
    if (!ok) return;
    try {
      await deleteTarget(t.id);
      toast('Target deleted', 'success');
      await load();
    } catch (error: any) {
      toast(error?.message || 'Failed to delete target', 'error');
    }
  };

  const summary = data?.summary;
  const cards = summary
    ? [
        { key: 'total', label: 'Total Targets', value: String(summary.totalTargets), icon: ListChecks, tone: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
        { key: 'active', label: 'Active', value: String(summary.activeTargets), icon: Activity, tone: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30' },
        { key: 'achieved', label: 'Achieved', value: String(summary.achievedTargets), icon: Trophy, tone: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
        { key: 'missed', label: 'Missed', value: String(summary.missedTargets), icon: XCircle, tone: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30' },
        { key: 'value', label: 'Total Target Value', value: formatINR(summary.totalTargetValue), icon: Wallet, tone: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
        { key: 'revenue', label: 'Achieved Revenue', value: formatINR(summary.totalAchievedRevenue), icon: TrendingUp, tone: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30' },
        { key: 'pct', label: 'Overall Achievement', value: `${summary.overallAchievementPct}%`, icon: Percent, tone: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales' },
              { label: 'Targets', href: '/dashboard/sales/targets' },
            ]}
          />
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Sales Targets</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Assign revenue targets and track achievement live from won deals.
          </p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
            <Plus size={18} /> New Target
          </Button>
        )}
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-[76px] w-full rounded-xl" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.key} variant="outlined" className="flex items-center gap-3 px-4 py-3.5">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.bg} ${c.tone}`}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold leading-tight text-gray-900 dark:text-gray-100">{c.value}</p>
                  <p className="mt-0.5 truncate text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* Team aggregation + Top performers */}
      {!isLoading && data && (data.teams.length > 0 || data.topPerformers.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.teams.length > 0 && (
            <Card variant="outlined" className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                <Users size={16} className="text-indigo-500" /> Team Aggregation
              </div>
              <div className="space-y-2.5">
                {data.teams.map((tm) => (
                  <div key={tm.teamId} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-700/60">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{tm.teamName}</p>
                      <p className="text-xs text-gray-400">{tm.memberCount} member{tm.memberCount !== 1 ? 's' : ''} · {formatINR(tm.achievedValue)} / {formatINR(tm.targetValue)}</p>
                    </div>
                    <Badge variant={achievementVariant(tm.achievementPct)}>{tm.achievementPct}%</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {data.topPerformers.length > 0 && (
            <Card variant="outlined" className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                <Trophy size={16} className="text-amber-500" /> Top Performers
              </div>
              <div className="space-y-2.5">
                {data.topPerformers.map((p, i) => (
                  <div key={p.ownerId} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-700/60">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{p.ownerName}</p>
                        <p className="text-xs text-gray-400">{formatINR(p.achieved)} / {formatINR(p.targetAmount)}</p>
                      </div>
                    </div>
                    <Badge variant={achievementVariant(p.achievementPct)}>{p.achievementPct}%</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Filters */}
      <Card variant="outlined" className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <Filter size={15} className="text-gray-400" /> Filters
        </div>
        <div className="mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by target name or BDE…"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SelectField id="t-filter-owner" label="BDE" options={ownerOptions} value={ownerId} onChange={setOwnerId} />
          <SelectField id="t-filter-type" label="Type" options={TYPE_OPTIONS} value={type} onChange={setType} />
          <SelectField id="t-filter-period" label="Period" options={PERIOD_TYPE_OPTIONS} value={periodType} onChange={setPeriodType} />
          <SelectField id="t-filter-status" label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        </div>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : visibleTargets.length === 0 ? (
        <EmptyState
          icon={<TargetIcon size={32} />}
          title="No targets found"
          description={canManage ? 'Create a target to start tracking achievement against won deals.' : 'No targets are assigned to you for these filters yet.'}
          actionLabel={canManage ? 'New Target' : undefined}
          onAction={canManage ? () => { setEditTarget(null); setFormOpen(true); } : undefined}
        />
      ) : (
        <Card variant="outlined" className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">BDE</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Target</th>
                  <th className="px-4 py-3 text-right">Achieved</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3 text-center">Achievement</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleTargets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      <Link href={`/dashboard/sales/targets/${t.id}`} className="hover:text-indigo-600 hover:underline dark:hover:text-indigo-400">
                        {t.name || `${TARGET_TYPE_LABELS[t.type]} — ${t.period}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{t.ownerName}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.teamName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{TARGET_TYPE_LABELS[t.type]}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {t.period}
                      <span className="ml-1.5 text-xs text-gray-400">{PERIOD_TYPE_LABELS[t.periodType]}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-100">{formatTargetValue(t.targetAmount, t.type)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatTargetValue(t.achieved, t.type)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-600 dark:text-amber-400">{formatTargetValue(t.remaining, t.type)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={achievementVariant(t.achievementPct)}>{t.achievementPct}%</Badge>
                    </td>
                    <td className="px-4 py-3 text-center"><TargetStatusBadge status={t.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/dashboard/sales/targets/${t.id}`}
                          title="View details"
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-gray-700"
                        >
                          <Eye size={16} />
                        </Link>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => { setEditTarget(t); setFormOpen(true); }}
                              title="Edit target"
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(t)}
                              title="Delete target"
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <TargetFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        editTarget={editTarget}
        owners={ownerPickerOptions}
      />
    </div>
  );
}

export default function TargetsPage() {
  return (
    <PermissionPageGuard module="sales">
      <TargetsPageInner />
    </PermissionPageGuard>
  );
}
