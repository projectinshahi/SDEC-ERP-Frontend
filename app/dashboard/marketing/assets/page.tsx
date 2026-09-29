'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Package, Plus, Pencil, CalendarRange, Inbox, CheckCircle2, XCircle, PackageOpen, Undo2, Wrench, History, Lock } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/marketing/FieldError';
import {
  collect, hasErrors, requiredText, fieldErrorsFromApi, invalidInputCls, type FieldErrors,
} from '@/lib/marketing/contentValidation';
import {
  fetchAssets, createAsset, updateAsset, setAssetActive,
  fetchAssetRequests, createAssetRequest, decideAssetRequest, cancelAssetRequest,
  fetchAssetAvailability,
  checkoutAsset, returnAsset, fetchCheckouts, setAssetMaintenance, fetchMaintenanceHistory,
  type MarketingAsset, type AssetRequest, type AssetBooking,
  type AssetCheckout, type MaintenanceEntry,
} from '@/lib/api/marketingAssets';
import { fetchProjectWorkspace, type MarketingProject } from '@/lib/api/marketingProjects';

/**
 * MK-002 — Asset Management.
 *
 * Registry (Admin), booking requests, the approval queue and the availability
 * calendar. Every control here is an affordance: the route is guarded by the
 * Marketing layout and every endpoint re-checks its own permission, so hiding a
 * button is never what stops an unauthorized action.
 */

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30';
const labelCls = 'mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300';

const apiError = (e: unknown): string | undefined =>
  (e as { details?: { error?: string } } | null)?.details?.error;

const STATUS_TONE: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const fmt = (iso: string): string =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

type Tab = 'registry' | 'requests' | 'availability' | 'custody';

export default function MarketingAssetsPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [tab, setTab] = useState<Tab>('registry');
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [canRequest, setCanRequest] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [loading, setLoading] = useState(true);

  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [bookings, setBookings] = useState<AssetBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [projects, setProjects] = useState<MarketingProject[]>([]);

  const [assetForm, setAssetForm] = useState<MarketingAsset | 'new' | null>(null);
  const [requestFor, setRequestFor] = useState<MarketingAsset | null>(null);
  // MK-002.3 / MK-002.5
  const [checkouts, setCheckouts] = useState<AssetCheckout[]>([]);
  const [loadingCheckouts, setLoadingCheckouts] = useState(true);
  const [canCheckout, setCanCheckout] = useState(false);
  const [maintenanceFor, setMaintenanceFor] = useState<MarketingAsset | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await fetchAssets(showInactive);
      setAssets(reg.assets);
      setCanManage(reg.canManage);
      setCanRequest(reg.canRequest);
      setCanApprove(reg.canApprove);
    } catch (err) {
      toast(apiError(err) || 'Unable to load the asset registry', 'error');
    } finally {
      setLoading(false);
    }
  }, [showInactive, toast]);

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      setRequests((await fetchAssetRequests()).requests);
    } catch (err) {
      toast(apiError(err) || 'Unable to load asset requests', 'error');
    } finally {
      setLoadingRequests(false);
    }
  }, [toast]);

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      setBookings(await fetchAssetAvailability());
    } catch (err) {
      toast(apiError(err) || 'Unable to load availability', 'error');
    } finally {
      setLoadingBookings(false);
    }
  }, [toast]);

  const loadCheckouts = useCallback(async () => {
    setLoadingCheckouts(true);
    try {
      const res = await fetchCheckouts();
      setCheckouts(res.checkouts);
      setCanCheckout(res.canCheckout);
    } catch (err) {
      toast(apiError(err) || 'Unable to load the checkout history', 'error');
    } finally {
      setLoadingCheckouts(false);
    }
  }, [toast]);

  useEffect(() => { void loadAssets(); }, [loadAssets]);
  useEffect(() => { void loadCheckouts(); }, [loadCheckouts]);
  useEffect(() => { void loadRequests(); void loadBookings(); }, [loadRequests, loadBookings]);
  useEffect(() => {
    fetchProjectWorkspace()
      .then((ws) => setProjects(ws.clients.flatMap((c) => c.projects)))
      .catch(() => setProjects([]));
  }, []);

  /** The open checkout for an asset, if it is currently out with someone. */
  const openFor = useCallback(
    (assetId: number) => checkouts.find((c) => c.open && c.assetId === assetId) ?? null,
    [checkouts],
  );

  const onToggleActive = async (asset: MarketingAsset) => {
    if (asset.active) {
      await confirm({
        title: 'Deactivate asset',
        message: `Deactivate "${asset.name}"? It leaves the active registry and can no longer be booked.`,
        warning: 'The asset is not deleted — existing and historical bookings keep their reference to it.',
        confirmLabel: 'Deactivate',
        intent: 'danger',
        onConfirm: async () => {
          await setAssetActive(asset.id, false);
          toast('Asset deactivated successfully', 'success');
          await loadAssets();
        },
      });
      return;
    }
    // Reactivating is harmless and reversible — no prompt.
    try {
      await setAssetActive(asset.id, true);
      toast('Asset reactivated successfully', 'success');
      await loadAssets();
    } catch (err) {
      toast(apiError(err) || 'Unable to reactivate the asset', 'error');
    }
  };

  /* MK-002.3 — physical custody. The asset, taker, project and timestamp all
   * come from the server's view of the approved request; nothing is sent. */
  const onCheckout = async (r: AssetRequest) => {
    if (busyId !== null) return;
    await confirm({
      title: 'Check out asset',
      message: `Check out ${r.assetName} for ${r.projectName}? It is recorded as physically with ${r.requesterName ?? 'the requester'} until returned.`,
      confirmLabel: 'Check out',
      onConfirm: async () => {
        setBusyId(r.id);
        try {
          await checkoutAsset(r.id);
          toast('Asset checked out successfully', 'success');
          await Promise.all([loadAssets(), loadRequests(), loadCheckouts()]);
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const onReturn = async (c: AssetCheckout) => {
    if (busyId !== null) return;
    await confirm({
      title: 'Return asset',
      message: `Record ${c.assetName} as returned? It becomes available for other bookings immediately.`,
      confirmLabel: 'Mark returned',
      onConfirm: async () => {
        setBusyId(c.id);
        try {
          await returnAsset(c.id);
          toast('Asset returned successfully', 'success');
          await Promise.all([loadAssets(), loadCheckouts()]);
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const onRestore = async (asset: MarketingAsset) => {
    await confirm({
      title: 'Mark asset repaired',
      message: `Mark ${asset.name} as repaired and available again? It becomes bookable immediately.`,
      confirmLabel: 'Mark repaired',
      onConfirm: async () => {
        await setAssetMaintenance(asset.id, 'restored');
        toast('Asset marked available successfully', 'success');
        await loadAssets();
      },
    });
  };

  const onDecide = async (r: AssetRequest, decision: 'approved' | 'rejected') => {
    await confirm({
      title: decision === 'approved' ? 'Approve request' : 'Reject request',
      message: decision === 'approved'
        ? `Approve ${r.assetName} for ${r.projectName}? The asset is reserved for that period and nobody else can book it.`
        : `Reject the request for ${r.assetName}? The asset stays free for that period.`,
      confirmLabel: decision === 'approved' ? 'Approve' : 'Reject',
      intent: decision === 'approved' ? 'primary' : 'danger',
      onConfirm: async () => {
        await decideAssetRequest(r.id, decision);
        toast(decision === 'approved' ? 'Asset request approved' : 'Asset request rejected', 'success');
        await Promise.all([loadRequests(), loadBookings()]);
      },
    });
  };

  const onCancel = async (r: AssetRequest) => {
    await confirm({
      title: 'Cancel booking',
      message: `Cancel the booking for ${r.assetName}? The asset becomes available again for that period.`,
      confirmLabel: 'Cancel booking',
      cancelLabel: 'Keep booking',
      intent: 'danger',
      onConfirm: async () => {
        await cancelAssetRequest(r.id);
        toast('Booking cancelled successfully', 'success');
        await Promise.all([loadRequests(), loadBookings()]);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Asset Management</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Equipment registry, booking requests and availability.
            </p>
          </div>
        </div>

        <div role="tablist" aria-label="Asset section" className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
          {([['registry', 'Registry', Package], ['requests', 'Requests', Inbox], ['custody', 'Custody', PackageOpen], ['availability', 'Availability', CalendarRange]] as const).map(
            ([key, label, Icon]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                className={classNames(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  tab === key ? 'bg-cyan-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
                )}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ),
          )}
        </div>
      </div>

      {/* ── Registry ─────────────────────────────────────────────────────────── */}
      {tab === 'registry' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300" />
              Show inactive
            </label>
            {canManage && (
              <Button onClick={() => setAssetForm('new')}>
                <Plus className="mr-1.5 h-4 w-4" /> Add asset
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-2 p-4" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Package className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">No active assets available.</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {canManage ? 'Add your first piece of equipment to get started.' : 'Equipment added by an administrator will appear here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-2">Asset</th>
                    <th className="px-4 py-2">Serial</th>
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {assets.map((a) => (
                    <tr key={a.id} className={classNames(!a.active && 'bg-gray-50/60 dark:bg-gray-950/30')}>
                      <td className="px-4 py-2">
                        <div className={classNames('font-semibold', a.active ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400')}>{a.name}</div>
                        {a.notes && <div className="text-[11px] text-gray-400 line-clamp-1">{a.notes}</div>}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-500 dark:text-gray-400">{a.serialNumber}</td>
                      <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{a.category ?? '—'}</td>
                      <td className="px-4 py-2">
                        {/* Registry lifecycle, condition and custody are three
                            different facts — an asset can be active, broken and
                            out with someone all at once. */}
                        <div className="flex flex-wrap items-center gap-1">
                          <span className={classNames('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                            a.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                     : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400')}>
                            {a.active ? 'Active' : 'Inactive'}
                          </span>
                          {a.maintenanceStatus === 'under_maintenance' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Wrench className="h-2.5 w-2.5" /> Maintenance
                            </span>
                          )}
                          {a.checkedOut && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                              <PackageOpen className="h-2.5 w-2.5" /> Checked out
                            </span>
                          )}
                        </div>
                        {a.checkedOut && openFor(a.id) && (
                          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                            With {openFor(a.id)!.takerName ?? 'a team member'} since {fmt(openFor(a.id)!.checkedOutAt)}
                            {openFor(a.id)!.projectName && ` · ${openFor(a.id)!.projectName}`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {canRequest && a.active && a.maintenanceStatus !== 'under_maintenance' && (
                            <button type="button" onClick={() => setRequestFor(a)}
                              className="rounded-lg border border-cyan-200 px-2 py-1 text-[11px] font-semibold text-cyan-700 hover:bg-cyan-50 dark:border-cyan-800 dark:text-cyan-300">
                              Request
                            </button>
                          )}
                          {/* MK-002.5 — reporting a fault is a duty of care, so
                              anyone who can see the registry may flag (server:
                              marketing.assets.view). Restoring is registry
                              management (marketing.assets.manage = canManage). */}
                          {a.active && a.maintenanceStatus !== 'under_maintenance' && (
                            <button type="button" onClick={() => setMaintenanceFor(a)}
                              title="Flag for maintenance" aria-label={`Flag ${a.name} for maintenance`}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300">
                              <Wrench className="h-3 w-3" /> Flag
                            </button>
                          )}
                          {a.maintenanceStatus === 'under_maintenance' && (
                            <button type="button" onClick={() => setMaintenanceFor(a)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                              <History className="h-3 w-3" /> Condition
                            </button>
                          )}
                          {canManage && (
                            <>
                              <button type="button" onClick={() => setAssetForm(a)} aria-label={`Edit ${a.name}`}
                                className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button type="button" onClick={() => void onToggleActive(a)}
                                className={classNames('rounded-lg border px-2 py-1 text-[11px] font-semibold',
                                  a.active ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300'
                                           : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300')}>
                                {a.active ? 'Deactivate' : 'Reactivate'}
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
          )}
        </div>
      )}

      {/* ── Requests ─────────────────────────────────────────────────────────── */}
      {tab === 'requests' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {loadingRequests ? (
            <div className="space-y-2 p-4" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Inbox className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">No asset requests found.</p>
              <p className="mt-0.5 text-xs text-gray-400">Requests you submit — and, if you approve them, the team&apos;s — appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{r.assetName}</span>
                      <span className={classNames('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', STATUS_TONE[r.status] ?? STATUS_TONE.cancelled)}>
                        {r.statusLabel}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {r.projectName} · {fmt(r.startAt)} → {fmt(r.endAt)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      Requested by {r.requesterName ?? 'Unknown'}
                      {r.decidedByName && ` · ${r.statusLabel} by ${r.decidedByName}`}
                      {r.decisionNote && ` · "${r.decisionNote}"`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {canApprove && r.status === 'requested' && (
                      <>
                        <button type="button" onClick={() => void onDecide(r, 'approved')}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> Approve
                        </button>
                        <button type="button" onClick={() => void onDecide(r, 'rejected')}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300">
                          <XCircle className="h-3 w-3" /> Reject
                        </button>
                      </>
                    )}
                    {/* MK-002.3 — only an APPROVED booking can become physical
                        custody, and only while the asset is not already out.
                        The server re-checks both. */}
                    {canCheckout && r.status === 'approved' && !openFor(r.assetId) && (
                      <button type="button" onClick={() => void onCheckout(r)} disabled={busyId !== null}
                        className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 px-2 py-1 text-[11px] font-semibold text-cyan-700 hover:bg-cyan-50 disabled:opacity-50 dark:border-cyan-800 dark:text-cyan-300">
                        <PackageOpen className="h-3 w-3" /> Check out
                      </button>
                    )}
                    {r.status === 'approved' && openFor(r.assetId)?.requestId === r.id && canCheckout && (
                      <button type="button" onClick={() => void onReturn(openFor(r.assetId)!)} disabled={busyId !== null}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900 dark:text-emerald-300">
                        <Undo2 className="h-3 w-3" /> Return
                      </button>
                    )}
                    {(r.status === 'requested' || r.status === 'approved') && (
                      <button type="button" onClick={() => void onCancel(r)}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        Cancel
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Custody ledger (MK-002.3) ────────────────────────────────────────
          Append-only history. No edit or delete control is rendered because the
          server exposes none — a checkout is created, then closed by a return. */}
      {tab === 'custody' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                <History className="h-4 w-4 text-cyan-600" /> Checkout history
              </h2>
              <p className="text-[11px] text-gray-400">Who physically holds each asset, and every past handover. Newest first.</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 px-2 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
              <Lock className="h-3 w-3" /> Read-only record
            </span>
          </div>

          {loadingCheckouts ? (
            <div className="space-y-2 p-4" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : checkouts.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <PackageOpen className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">Nothing has been checked out yet.</p>
              <p className="mt-0.5 text-xs text-gray-400">Approve a booking, then check the asset out from the Requests tab.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-2">Asset</th>
                    <th className="px-4 py-2">Held by</th>
                    <th className="px-4 py-2">Project</th>
                    <th className="px-4 py-2">Checked out</th>
                    <th className="px-4 py-2">Returned</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {checkouts.map((c) => (
                    <tr key={c.id} className={classNames(c.open && 'bg-cyan-50/40 dark:bg-cyan-950/10')}>
                      <td className="px-4 py-2">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{c.assetName ?? '—'}</div>
                        <div className="font-mono text-[10px] text-gray-400">{c.assetSerial ?? ''}</div>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {c.takerName ?? '—'}
                        {c.checkedOutByName && c.checkedOutByName !== c.takerName && (
                          <span className="block text-[10px] text-gray-400">handed over by {c.checkedOutByName}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{c.projectName ?? '—'}</td>
                      <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300">{fmt(c.checkedOutAt)}</td>
                      <td className="px-4 py-2 text-xs">
                        {c.returnedAt ? (
                          <>
                            <span className="text-gray-600 dark:text-gray-300">{fmt(c.returnedAt)}</span>
                            {c.returnedByName && <span className="block text-[10px] text-gray-400">to {c.returnedByName}</span>}
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                            Still out
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {c.open && canCheckout && (
                          <button type="button" onClick={() => void onReturn(c)} disabled={busyId !== null}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900 dark:text-emerald-300">
                            <Undo2 className="h-3 w-3" /> Return
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Availability ─────────────────────────────────────────────────────── */}
      {tab === 'availability' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Reserved equipment</h2>
            <p className="text-[11px] text-gray-400">
              Only approved bookings reserve an asset.{' '}
              <Link href="/dashboard/marketing/assets/availability" className="font-semibold text-cyan-700 hover:underline dark:text-cyan-400">
                Open the availability calendar →
              </Link>
            </p>
          </div>
          {loadingBookings ? (
            <div className="space-y-2 p-4" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <CalendarRange className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">Nothing is reserved.</p>
              <p className="mt-0.5 text-xs text-gray-400">Every asset in the registry is currently free.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-2">Asset</th>
                    <th className="px-4 py-2">Reserved</th>
                    <th className="px-4 py-2">Project</th>
                    <th className="px-4 py-2">Holder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {bookings.map((b) => (
                    <tr key={b.requestId}>
                      <td className="px-4 py-2">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{b.assetName}</div>
                        <div className="font-mono text-[10px] text-gray-400">{b.assetSerial}</div>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300">{fmt(b.startAt)} → {fmt(b.endAt)}</td>
                      <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{b.projectName}</td>
                      <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{b.requesterName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {assetForm && (
        <AssetFormModal
          key={assetForm === 'new' ? 'new' : `a${assetForm.id}`}
          asset={assetForm === 'new' ? null : assetForm}
          onClose={() => setAssetForm(null)}
          onSaved={async () => { setAssetForm(null); await loadAssets(); }}
        />
      )}

      {maintenanceFor && (
        <MaintenanceModal
          key={`m${maintenanceFor.id}`}
          asset={maintenanceFor}
          canRestore={canManage}
          onClose={() => setMaintenanceFor(null)}
          onRestore={async () => { const a = maintenanceFor; setMaintenanceFor(null); await onRestore(a); }}
          onSaved={async () => { setMaintenanceFor(null); await Promise.all([loadAssets(), loadRequests(), loadBookings()]); }}
        />
      )}

      {requestFor && (
        <RequestFormModal
          key={`r${requestFor.id}`}
          asset={requestFor}
          projects={projects}
          onClose={() => setRequestFor(null)}
          onSaved={async () => { setRequestFor(null); await Promise.all([loadRequests(), loadBookings()]); setTab('requests'); }}
        />
      )}
    </div>
  );
}

/* ── Asset form ──────────────────────────────────────────────────────────── */

function AssetFormModal({ asset, onClose, onSaved }: {
  asset: MarketingAsset | null; onClose: () => void; onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: asset?.name ?? '',
    serialNumber: asset?.serialNumber ?? '',
    category: asset?.category ?? '',
    notes: asset?.notes ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  /* `saving` is React STATE: two clicks landing in the same tick both read it
     as false and both fire. The ref updates synchronously, so the second click
     sees the first. */
  const submittingRef = useRef(false);


  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (submittingRef.current) return;
    const errs = collect({
      name: requiredText(form.name, 'Asset name'),
      serialNumber: requiredText(form.serialNumber, 'Serial number'),
    });
    setErrors(errs);
    if (hasErrors(errs)) return;

    submittingRef.current = true;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        serialNumber: form.serialNumber.trim(),
        category: form.category.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (asset) await updateAsset(asset.id, payload);
      else await createAsset(payload);
      toast(asset ? 'Asset updated successfully' : 'Asset created successfully', 'success');
      await onSaved();
    } catch (err) {
      const mapped = fieldErrorsFromApi(err);
      setErrors(mapped);
      if (!hasErrors(mapped)) toast(apiError(err) || 'Unable to save the asset', 'error');
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal confirmDiscard isOpen onClose={onClose} busy={saving} title={asset ? 'Edit asset' : 'Add asset'} size="md">
      <div className="space-y-3">
        <div>
          <label htmlFor="as-name" className={labelCls}>Name <span className="text-rose-500">*</span></label>
          <input id="as-name" value={form.name} onChange={set('name')} maxLength={160} aria-invalid={!!errors.name}
            className={classNames(inputCls, errors.name && invalidInputCls)} placeholder="e.g. Canon R5" />
          <FieldError message={errors.name} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="as-serial" className={labelCls}>Serial number <span className="text-rose-500">*</span></label>
            <input id="as-serial" value={form.serialNumber} onChange={set('serialNumber')} maxLength={80}
              aria-invalid={!!errors.serialNumber}
              className={classNames(inputCls, 'font-mono', errors.serialNumber && invalidInputCls)} placeholder="CAM-001" />
            <FieldError message={errors.serialNumber} />
          </div>
          <div>
            <label htmlFor="as-cat" className={labelCls}>Category</label>
            <input id="as-cat" value={form.category} onChange={set('category')} maxLength={60}
              className={inputCls} placeholder="Camera, Lens, Drone, Mic…" list="asset-categories" />
            {/* Suggestions only — the field is free text, so the registry is
                never limited to a hardcoded equipment list. */}
            <datalist id="asset-categories">
              {['Camera', 'Lens', 'Lighting', 'Drone', 'Mic', 'Tripod', 'Audio', 'Accessory'].map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>
        <div>
          <label htmlFor="as-notes" className={labelCls}>Notes</label>
          <textarea id="as-notes" value={form.notes} onChange={set('notes')} rows={3}
            className={classNames(inputCls, 'resize-y')} placeholder="Condition, accessories, storage location…" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void submit()} isLoading={saving}>{asset ? 'Save changes' : 'Create asset'}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Condition & maintenance (MK-002.5) ──────────────────────────────────────
 * One modal for both directions, because the condition LEDGER is the context you
 * need to decide either way: flag it with a mandatory note, or (Admin) mark it
 * repaired. The ledger itself is append-only and rendered read-only. */

function MaintenanceModal({ asset, canRestore, onClose, onRestore, onSaved }: {
  asset: MarketingAsset; canRestore: boolean;
  onClose: () => void; onRestore: () => void | Promise<void>; onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const flagged = asset.maintenanceStatus === 'under_maintenance';
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);

  const [history, setHistory] = useState<MaintenanceEntry[] | null>(null);

  useEffect(() => {
    fetchMaintenanceHistory(asset.id)
      .then((r) => setHistory(r.entries))
      .catch(() => setHistory([]));
  }, [asset.id]);

  const submit = async () => {
    if (submittingRef.current) return;
    // Mirrors validateMaintenanceNote so the field is marked before a round trip.
    const errs = collect({ note: requiredText(note, 'A repair or maintenance note') });
    setErrors(errs);
    if (hasErrors(errs)) return;

    submittingRef.current = true;
    setSaving(true);
    try {
      const res = await setAssetMaintenance(asset.id, 'flagged', note.trim());
      toast(
        res.overrodeActiveBooking
          ? 'Flagged for maintenance. The existing booking was kept — tell the holder.'
          : 'Asset flagged for maintenance',
        res.overrodeActiveBooking ? 'warning' : 'success',
      );
      await onSaved();
    } catch (err) {
      const mapped = fieldErrorsFromApi(err);
      setErrors(mapped);
      if (!hasErrors(mapped)) toast(apiError(err) || 'Unable to flag the asset', 'error');
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal confirmDiscard={!flagged && note.trim().length > 0} isOpen onClose={onClose} busy={saving}
      title={flagged ? `${asset.name} — condition` : `Flag ${asset.name}`} size="md">
      <div className="space-y-3">
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-200">{asset.name}</span>
          <span className="font-mono">· {asset.serialNumber}</span>
          <span className={classNames('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
            flagged ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300')}>
            {flagged ? 'Under maintenance' : 'Operational'}
          </span>
        </p>

        {!flagged ? (
          <>
            <div>
              <label htmlFor="mt-note" className={labelCls}>
                What is wrong with it? <span className="text-rose-500">*</span>
              </label>
              <textarea id="mt-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000}
                aria-invalid={!!errors.note}
                className={classNames(inputCls, 'resize-y', errors.note && invalidInputCls)}
                placeholder="e.g. Lens mount is loose — sent to the service centre on Monday" />
              <FieldError message={errors.note} />
            </div>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              While flagged, the asset cannot be requested or approved. Existing approved
              bookings are never cancelled automatically — if it is out on one right now,
              only an administrator can flag it, and the holder must be told.
            </p>
          </>
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            {canRestore
              ? 'This asset is out of service. Mark it repaired once it is back and working.'
              : 'This asset is out of service. An administrator marks it repaired once it is fixed.'}
          </p>
        )}

        {/* Immutable condition ledger — flag and repair events, both kept. */}
        <div>
          <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">
            <History className="h-3.5 w-3.5" /> Condition history
          </h3>
          {history === null ? (
            <div className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" aria-busy="true" />
          ) : history.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-3 py-3 text-center text-[11px] text-gray-400">
              No faults have ever been reported for this asset.
            </p>
          ) : (
            <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {history.map((h) => (
                <li key={h.id} className="rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={classNames('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                      h.action === 'flagged' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                             : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300')}>
                      {h.action === 'flagged' ? 'Flagged' : 'Repaired'}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {h.actorName ?? 'Unknown'} · {fmt(h.createdAt)}
                    </span>
                    {h.overrodeActiveBooking && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                        Overrode a live booking
                      </span>
                    )}
                  </div>
                  {h.note && <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-300">{h.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Close</Button>
          {flagged
            ? canRestore && <Button onClick={() => void onRestore()}>Mark repaired</Button>
            : <Button onClick={() => void submit()} isLoading={saving}>Flag for maintenance</Button>}
        </div>
      </div>
    </Modal>
  );
}

/* ── Booking request form ────────────────────────────────────────────────── */

function RequestFormModal({ asset, projects, onClose, onSaved }: {
  asset: MarketingAsset; projects: MarketingProject[];
  onClose: () => void; onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ projectId: '', startAt: '', endAt: '', notes: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [conflicts, setConflicts] = useState<{ startAt: string; endAt: string }[]>([]);
  const [saving, setSaving] = useState(false);
  /* `saving` is React STATE: two clicks landing in the same tick both read it
     as false and both fire. The ref updates synchronously, so the second click
     sees the first. */
  const submittingRef = useRef(false);


  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (submittingRef.current) return;
    const errs = collect({
      projectId: form.projectId ? undefined : 'Choose a project.',
      startAt: form.startAt ? undefined : 'Choose a start date and time.',
      endAt: form.endAt ? undefined : 'Choose an end date and time.',
    });
    // Mirrors the server rule so the wrong FIELD is marked, not the whole form.
    if (!errs.endAt && form.startAt && form.endAt && form.endAt <= form.startAt) {
      errs.endAt = 'End must be after the start.';
    }
    setErrors(errs);
    setConflicts([]);
    if (hasErrors(errs)) return;

    submittingRef.current = true;
    setSaving(true);
    try {
      await createAssetRequest({
        assetId: asset.id,
        projectId: Number(form.projectId),
        // datetime-local is local wall-clock; toISOString converts it to the
        // real instant the server stores.
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        notes: form.notes.trim() || null,
      });
      toast('Asset request submitted', 'success');
      await onSaved();
    } catch (err) {
      const mapped = fieldErrorsFromApi(err);
      setErrors(mapped);
      const clash = (err as { details?: { conflicts?: { startAt: string; endAt: string }[] } })?.details?.conflicts;
      if (clash?.length) setConflicts(clash);
      if (!hasErrors(mapped)) toast(apiError(err) || 'Unable to submit the request', 'error');
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal confirmDiscard isOpen onClose={onClose} busy={saving} title={`Request ${asset.name}`} size="md">
      <div className="space-y-3">
        <p className="rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-200">{asset.name}</span>
          <span className="font-mono"> · {asset.serialNumber}</span>
        </p>
        <div>
          <label htmlFor="rq-project" className={labelCls}>Project <span className="text-rose-500">*</span></label>
          <select id="rq-project" value={form.projectId} onChange={set('projectId')} aria-invalid={!!errors.projectId}
            className={classNames(inputCls, errors.projectId && invalidInputCls)}>
            <option value="">Select a project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <FieldError message={errors.projectId} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="rq-start" className={labelCls}>From <span className="text-rose-500">*</span></label>
            <input id="rq-start" type="datetime-local" value={form.startAt} onChange={set('startAt')}
              max={form.endAt || undefined} aria-invalid={!!errors.startAt}
              className={classNames(inputCls, errors.startAt && invalidInputCls)} />
            <FieldError message={errors.startAt} />
          </div>
          <div>
            <label htmlFor="rq-end" className={labelCls}>To <span className="text-rose-500">*</span></label>
            <input id="rq-end" type="datetime-local" value={form.endAt} onChange={set('endAt')}
              min={form.startAt || undefined} aria-invalid={!!errors.endAt}
              className={classNames(inputCls, errors.endAt && invalidInputCls)} />
            <FieldError message={errors.endAt} />
          </div>
        </div>
        {conflicts.length > 0 && (
          <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
            <p className="font-semibold">Already booked for:</p>
            <ul className="mt-0.5 space-y-0.5">
              {conflicts.map((c, i) => <li key={i}>{fmt(c.startAt)} → {fmt(c.endAt)}</li>)}
            </ul>
          </div>
        )}
        <div>
          <label htmlFor="rq-notes" className={labelCls}>Notes</label>
          <textarea id="rq-notes" value={form.notes} onChange={set('notes')} rows={2}
            className={classNames(inputCls, 'resize-y')} placeholder="What it is needed for" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void submit()} isLoading={saving}>Submit request</Button>
        </div>
      </div>
    </Modal>
  );
}
