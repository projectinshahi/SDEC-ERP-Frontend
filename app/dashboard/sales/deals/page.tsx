'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Search, Plus, List, Columns3 } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { fetchDeals, fetchDealStages, moveDealStage } from '@/lib/api/leadLifecycle';
import { fetchAssignableUsers } from '@/lib/api/leads';
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
  const [ownerFilter, setOwnerFilter] = useState('all');

  // Table ↔ Pipeline view (both render the SAME live `deals` dataset).
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canMove = hasPermission('sales.edit');
  const canCreate = hasPermission('sales.create');

  // Initialise the view from the URL (?view=pipeline) — read on the client to
  // avoid a useSearchParams Suspense boundary / hydration mismatch. The old
  // /deals/pipeline route redirects here in pipeline mode.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      setDeals(await fetchDeals({ ownerId: ownerFilter }));
    } catch {
      toast('Failed to fetch deals', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [ownerFilter, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDeals();
  }, [loadDeals]);

  useEffect(() => {
    fetchDealStages().then(setStages).catch(() => setStages([]));
    fetchAssignableUsers().then(setOwners).catch(() => setOwners([]));
  }, []);

  // Client-side search (title + company) — applies to BOTH views so they stay
  // in sync, and the filtered set feeds both the table and the board grouping.
  const visibleDeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      (d.customer?.company || '').toLowerCase().includes(q) ||
      (d.customer?.name || '').toLowerCase().includes(q),
    );
  }, [deals, searchQuery]);

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

  // Optimistic move with revert on failure. Updates the shared `deals` state, so
  // the table reflects the move too (and vice-versa).
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
          <div className="flex gap-2">
            {canCreate && (
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Deal
              </Button>
            )}
          </div>
        </div>

        {/* View switch — Table ⇄ Pipeline (same Deals dataset, no navigation) */}
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 w-fit">
          {([
            { key: 'table', label: 'Table View', icon: List },
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

        {/* Filters (apply to BOTH views — they drive the shared dataset) */}
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
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
          >
            <option value="all">All Owners</option>
            {owners.map((o) => (
              <option key={o.id} value={String(o.id)}>{o.name}</option>
            ))}
          </select>
        </div>

        {/* TABLE VIEW */}
        {viewMode === 'table' && (
          <Card className="overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Deal Name</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Value</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Stage</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Client</th>
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
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{deal.title}</td>
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
                          <Button variant="secondary" size="sm">View</Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* PIPELINE VIEW — same data, Kanban presentation (no separate route) */}
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
            <DealPipelineBoard stages={stages} dealsByStage={dealsByStage} canMove={canMove} onMove={handleMove} />
          )
        )}
      </div>
    </PermissionPageGuard>
  );
}
