'use client';

/**
 * Target Management — 360° Target Details.
 *
 * Live overview (target vs achieved / status / incentive), the assigned BDE, the
 * won deals contributing to revenue in the period, an achievement timeline and
 * the owner's other targets. All figures are computed live on the backend.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Target as TargetIcon, User, Users, CalendarRange, Wallet, TrendingUp,
  Gift, Pencil, Trash2, Activity, History, ExternalLink, Percent,
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { fetchTargetById, deleteTarget } from '@/lib/api/bdeDashboard';
import { isApiError } from '@/lib/api-errors';
import { formatINR } from '@/lib/utils/currency';
import { TargetStatusBadge, PERIOD_TYPE_LABELS, formatTargetValue, achievementVariant } from '@/components/sales-execution/targetShared';
import { TargetFormModal } from '@/components/sales-execution/TargetFormModal';
import { TARGET_TYPE_LABELS } from '@/lib/types/salesExecution';
import type { TargetDetail } from '@/lib/types/salesExecution';

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function TargetDetailInner() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('sales.targets.manage');

  const [data, setData] = useState<TargetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id || isNaN(id)) { setNotFound(true); setIsLoading(false); return; }
    try {
      setIsLoading(true);
      setData(await fetchTargetById(id));
      setNotFound(false);
    } catch (error: unknown) {
      if (isApiError(error) && (error.statusCode === 404 || error.statusCode === 403)) setNotFound(true);
      else toast(error instanceof Error ? error.message : 'Failed to load target', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!data) return;
    const ok = await confirm({
      title: 'Delete target',
      message: `Delete this ${TARGET_TYPE_LABELS[data.type]} target for ${data.ownerName} (${data.period})? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      intent: 'danger',
    });
    if (!ok) return;
    try {
      await deleteTarget(data.id);
      toast('Target deleted', 'success');
      router.push('/dashboard/sales/targets');
    } catch (error: any) {
      toast(error?.message || 'Failed to delete target', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /></div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/sales/targets" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400">
          <ArrowLeft size={16} /> Back to Targets
        </Link>
        <EmptyState icon={<TargetIcon size={32} />} title="Target not found" description="This target may have been deleted or is outside your access." />
      </div>
    );
  }

  const isRevenue = data.type === 'revenue';
  const displayName = data.name || `${TARGET_TYPE_LABELS[data.type]} — ${data.period}`;
  const barWidth = Math.min(100, Math.max(0, Math.round(data.achievementPct)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Sales', href: '/dashboard/sales' },
            { label: 'Targets', href: '/dashboard/sales/targets' },
            { label: displayName, href: `/dashboard/sales/targets/${data.id}` },
          ]}
        />
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
              <TargetIcon size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1"><User size={14} /> {data.ownerName}</span>
                {data.teamName && <span className="inline-flex items-center gap-1"><Users size={14} /> {data.teamName}</span>}
                <span className="inline-flex items-center gap-1"><CalendarRange size={14} /> {data.period} · {PERIOD_TYPE_LABELS[data.periodType]}</span>
                <TargetStatusBadge status={data.status} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/sales/targets" className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
              <ArrowLeft size={16} /> Back
            </Link>
            {canManage && (
              <>
                <Button variant="secondary" onClick={() => setEditOpen(true)}><Pencil size={15} /> Edit</Button>
                <Button variant="danger" onClick={handleDelete}><Trash2 size={15} /> Delete</Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Overview metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <MetricCard icon={TargetIcon} tone="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-950/30" label="Target" value={formatTargetValue(data.targetAmount, data.type)} />
        <MetricCard icon={TrendingUp} tone="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/30" label="Achieved" value={formatTargetValue(data.achieved, data.type)} />
        <MetricCard icon={Wallet} tone="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-950/30" label="Remaining" value={formatTargetValue(data.remaining, data.type)} />
        <MetricCard icon={Percent} tone="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-950/30" label="Achievement" value={`${data.achievementPct}%`} />
        <MetricCard icon={Gift} tone="text-teal-600 dark:text-teal-400" bg="bg-teal-50 dark:bg-teal-950/30" label="Incentive" value={formatINR(data.incentiveEarned)} />
      </div>

      {/* Progress + meta */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card variant="outlined" className="p-5 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700 dark:text-gray-200">{isRevenue ? 'Revenue Progress' : `${TARGET_TYPE_LABELS[data.type]} Progress`}</span>
            <span className={`font-bold tabular-nums ${data.achievementPct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>{data.achievementPct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div className={`h-full rounded-full transition-all duration-700 ${data.achievementPct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${barWidth}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Window: <b className="text-gray-700 dark:text-gray-200">{fmtDate(data.startDate)} → {fmtDate(data.endDate)}</b></span>
            <span>Achieved: <b className="text-emerald-600 dark:text-emerald-400">{formatTargetValue(data.achieved, data.type)}</b></span>
            <span>Remaining: <b className="text-amber-600 dark:text-amber-400">{formatTargetValue(data.remaining, data.type)}</b></span>
          </div>
          {data.description && (
            <p className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">{data.description}</p>
          )}
        </Card>

        <Card variant="outlined" className="p-5">
          <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100">Assigned BDE</h3>
          <div className="space-y-1.5 text-sm">
            <p className="font-semibold text-gray-800 dark:text-gray-100">{data.ownerName}</p>
            {data.ownerEmail && <p className="text-gray-500 dark:text-gray-400">{data.ownerEmail}</p>}
            {data.teamName && <p className="text-gray-500 dark:text-gray-400">Team: {data.teamName}</p>}
            <p className="text-gray-400">Type: {TARGET_TYPE_LABELS[data.type]}</p>
            <p className="text-gray-400">Created: {fmtDateTime(data.createdAt)}</p>
          </div>
        </Card>
      </div>

      {/* Contributing deals */}
      <Card variant="outlined" className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
          <TrendingUp size={16} className="text-violet-500" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Contributing Deals</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">{data.contributingDeals.length}</span>
        </div>
        {data.contributingDeals.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">
            {isRevenue || data.type === 'deal_count' ? 'No won deals in this period yet.' : 'Contributing deals apply to revenue / deal-count targets.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
                  <th className="px-4 py-2.5">Deal</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Stage</th>
                  <th className="px-4 py-2.5">Closed</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.contributingDeals.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                      <Link href={`/dashboard/sales/deals/${d.id}`} className="inline-flex items-center gap-1 hover:text-indigo-600 hover:underline dark:hover:text-indigo-400">
                        {d.title} <ExternalLink size={12} className="text-gray-400" />
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{d.customer ?? '—'}</td>
                    <td className="px-4 py-2.5"><Badge variant="success">{d.stage}</Badge></td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{fmtDate(d.closedAt)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{formatINR(d.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Timeline + Owner history */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card variant="outlined" className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity size={16} className="text-blue-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Achievement Timeline</h2>
          </div>
          {data.timeline.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No activity yet.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-gray-200 pl-4 dark:border-gray-700">
              {data.timeline.map((ev, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{ev.label}</p>
                  <p className="text-xs text-gray-400">
                    {fmtDateTime(ev.date)}
                    {ev.amount != null && <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">{formatINR(ev.amount)}</span>}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card variant="outlined" className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <History size={16} className="text-amber-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{data.ownerName}&apos;s Other Targets</h2>
          </div>
          {data.ownerHistory.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No other targets for this BDE.</p>
          ) : (
            <div className="space-y-2">
              {data.ownerHistory.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-700/60">
                  <Link href={`/dashboard/sales/targets/${h.id}`} className="min-w-0 hover:underline">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{TARGET_TYPE_LABELS[h.type]} — {h.period}</p>
                    <p className="text-xs text-gray-400">{PERIOD_TYPE_LABELS[h.periodType]} · {formatTargetValue(h.achieved, h.type)} / {formatTargetValue(h.targetAmount, h.type)}</p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={achievementVariant(h.achievementPct)}>{h.achievementPct}%</Badge>
                    <TargetStatusBadge status={h.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">{data.note}</p>

      <TargetFormModal isOpen={editOpen} onClose={() => setEditOpen(false)} onSaved={load} editTarget={data} owners={[]} />
    </div>
  );
}

function MetricCard({ icon: Icon, tone, bg, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; tone: string; bg: string; label: string; value: string }) {
  return (
    <Card variant="outlined" className="flex items-center gap-3 px-4 py-3.5">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg} ${tone}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-base font-bold leading-tight text-gray-900 dark:text-gray-100">{value}</p>
        <p className="mt-0.5 truncate text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </Card>
  );
}

export default function TargetDetailPage() {
  return (
    <PermissionPageGuard module="sales">
      <TargetDetailInner />
    </PermissionPageGuard>
  );
}
