'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Search, Plus, List, Columns3, Trash2 } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { fetchDeals, fetchDealStages, moveDealStage, deleteDeal } from '@/lib/api/leadLifecycle';
import { fetchAssignableUsers } from '@/lib/api/leads';
import { DealFormModal } from '@/components/deals/DealFormModal';
import { DealPipelineBoard } from '@/components/deals/DealPipelineBoard';
import { classNames } from '@/lib/utils';
import type { Deal, DealStage } from '@/lib/types/leadLifecycle';
import type { AssignableUser } from '@/lib/types/lead';

type ViewMode = 'table' | 'pipeline';

export default function SalesDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [owners, setOwners] = useState<AssignableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();

  // Granular Deals keys (coarse roles satisfied via the permission.utils bridge).
  const canCreate = hasPermission('sales.deals.create');
  const canEdit = hasPermission('sales.deals.edit');
  // Deal deletion is its own independent permission (drives the table row action
  // AND the Kanban card delete control).
  const canDelete = hasPermission('sales.deals.delete');
  const canAssignOwner = hasPermission('sales.assign');
  // Dragging a deal between stages = editing it (view-only users can't move).
  const canMove = canEdit;

  // Table ⇄ Pipeline view (both render the SAME live `deals` dataset).
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // New Deal / Edit / View modal (single shared modal — no duplicate flow).
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [dealModalReadOnly, setDealModalReadOnly] = useState(false);

  // Initialise the view from the URL (?view=pipeline) — read on the client to
  // avoid a useSearchParams Suspense boundary / hydration mismatch. The former
  // /deals/pipeline route redirects here in pipeline mode.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (new URLSearchParams(window.location.search).get('view') === 'pipeline') setViewMode('pipeline');
    }
  }, []);

  // Switch view + keep the URL in sync without a navigation/refetch.
  const changeView = (v: ViewMode) => {
    setViewMode(v);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (v === 'pipeline') url.searchParams.set('view', 'pipeline');
      else url.searchParams.delete('view');
      window.history.replaceState(null, '', url.toString());
    }
  };

  const loadDeals = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchDeals();
      setDeals(Array.isArray(data) ? data : []);
    } catch {
      toast('Failed to fetch deals', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  useEffect(() => {
    fetchDealStages().then(setStages).catch(() => setStages([]));
    fetchAssignableUsers().then(setOwners).catch(() => setOwners([]));
  }, []);

  const openNewDeal = () => {
    setActiveDeal(null);
    setDealModalReadOnly(false);
    setDealModalOpen(true);
  };
  const openDeal = (deal: Deal) => {
    setActiveDeal(deal);
    setDealModalReadOnly(!canEdit); // view-only for users without Edit Deal
    setDealModalOpen(true);
  };

  // Client-side search (title + company + client) — applies to BOTH views so the
  // Table and Pipeline always show the SAME deals (single source of truth).
  const visibleDeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter((d) =>
      (d.title || '').toLowerCase().includes(q) ||
      (d.customer?.company || '').toLowerCase().includes(q) ||
      (d.customer?.name || '').toLowerCase().includes(q),
    );
  }, [deals, searchQuery]);

  // Group the (filtered) deals by stage for the Kanban columns — same dataset
  // the table renders, so the two views never diverge.
  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const s of stages) map[s.name] = [];
    for (const d of visibleDeals) {
      // Default an unknown stage to the first column so deals are never dropped.
      const key = map[d.stage] ? d.stage : stages[0]?.name;
      if (key) map[key].push(d);
    }
    return map;
  }, [visibleDeals, stages]);

  // Optimistic stage move with revert on failure. Updates the shared `deals`
  // state, so the table reflects the move too (and vice-versa) and the backend
  // is the source of truth (PUT /sales/deals/:id/stage).
  const handleMove = async (dealId: number, targetStage: string) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === targetStage) return;
    const prev = deals;
    setDeals((ds) => ds.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d)));
    try {
      await moveDealStage(dealId, targetStage);
      toast(`Moved "${deal.title}" to ${targetStage}`, 'success');
    } catch (error) {
      setDeals(prev);
      toast(error instanceof Error ? error.message : 'Failed to move deal', 'error');
    }
  };

  // Delete a deal (shared by the table row action AND the Kanban card). Confirms
  // first, then optimistically drops it from the shared `deals` state — so the
  // list, the pipeline columns and the stage totals all update with no refetch.
  // The backend removes it from analytics / revenue. Reverts on failure.
  const handleDeleteDeal = async (deal: Deal) => {
    const ok = await confirm({
      title: 'Delete Deal',
      message: `Are you sure you want to delete "${deal.title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      intent: 'danger',
    });
    if (!ok) return;

    const prev = deals;
    setDeals((ds) => ds.filter((d) => d.id !== deal.id));
    try {
      await deleteDeal(deal.id);
      toast(`Deleted "${deal.title}"`, 'success');
    } catch (error) {
      setDeals(prev);
      toast(error instanceof Error ? error.message : 'Failed to delete deal', 'error');
    }
  };

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales/deals' },
              { label: 'Deals', href: '/dashboard/sales/deals' },
            ]}
          />
          {canCreate && (
            <Button onClick={openNewDeal}>
              <Plus className="w-4 h-4 mr-2" />
              New Deal
            </Button>
          )}
        </div>

        {/* View switch — Table ⇄ Pipeline (same Deals dataset, no navigation). */}
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 w-fit">
          {([
            { key: 'table', label: 'List View', icon: List },
            { key: 'pipeline', label: 'Pipeline View', icon: Columns3 },
          ] as { key: ViewMode; label: string; icon: typeof List }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={viewMode === key}
              onClick={() => changeView(key)}
              className={classNames(
                'inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
                viewMode === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Search — drives the shared dataset for BOTH views. */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />
          </div>
        </div>

        {/* LIST (TABLE) VIEW */}
        {viewMode === 'table' && (
          <Card className="overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Title</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Stage</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Owner</th>
                    <th className="px-6 py-4 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading deals...</td>
                    </tr>
                  ) : visibleDeals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No deals found</td>
                    </tr>
                  ) : (
                    visibleDeals.map((deal) => (
                      <tr key={deal.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium">
                          <Link
                            href={`/dashboard/sales/deals/${deal.id}`}
                            className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                          >
                            {deal.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">${deal.amount?.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                            {deal.stage || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {deal.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{deal.customer?.name}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{deal.owner?.name}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button variant="secondary" size="sm" onClick={() => openDeal(deal)}>
                              {canEdit ? 'Edit' : 'View'}
                            </Button>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDeal(deal)}
                                className="inline-flex items-center justify-center p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
                                aria-label={`Delete deal ${deal.title}`}
                                title="Delete deal"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* PIPELINE (KANBAN) VIEW — same data, Kanban presentation (no separate route). */}
        {viewMode === 'pipeline' && (
          isLoading ? (
            <Card className="p-8 text-center text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              Loading deals…
            </Card>
          ) : stages.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              No deal stages configured.
            </Card>
          ) : (
            <DealPipelineBoard
              stages={stages}
              dealsByStage={dealsByStage}
              canMove={canMove}
              canDeleteDeal={canDelete}
              onDeleteDeal={handleDeleteDeal}
              onMove={handleMove}
            />
          )
        )}
      </div>

      {/* Shared New Deal / Edit / View modal. On save, reload the deals list. */}
      <DealFormModal
        isOpen={dealModalOpen}
        onClose={() => setDealModalOpen(false)}
        onSaved={loadDeals}
        deal={activeDeal}
        stages={stages}
        owners={owners}
        readOnly={dealModalReadOnly}
        canAssignOwner={canAssignOwner}
      />
    </PermissionPageGuard>
  );
}
