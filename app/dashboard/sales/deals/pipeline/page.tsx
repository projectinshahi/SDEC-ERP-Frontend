'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { List, Search } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { fetchDeals, fetchDealStages, moveDealStage } from '@/lib/api/leadLifecycle';
import { fetchAssignableUsers } from '@/lib/api/leads';
import { DealPipelineBoard } from '@/components/deals/DealPipelineBoard';
import type { Deal, DealStage } from '@/lib/types/leadLifecycle';
import type { AssignableUser } from '@/lib/types/lead';

export default function DealPipelinePage() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const canMove = hasPermission('sales.edit');

  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [owners, setOwners] = useState<AssignableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');

  const loadDeals = useCallback(async () => {
    try {
      setIsLoading(true);
      setDeals(await fetchDeals({ ownerId: ownerFilter }));
    } catch {
      toast('Failed to load deals', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [ownerFilter, toast]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  useEffect(() => {
    fetchDealStages().then(setStages).catch(() => setStages([]));
    fetchAssignableUsers().then(setOwners).catch(() => setOwners([]));
  }, []);

  const visibleDeals = useMemo(
    () => deals.filter((d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.customer?.company || '').toLowerCase().includes(search.toLowerCase())
    ),
    [deals, search]
  );

  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const s of stages) map[s.name] = [];
    for (const d of visibleDeals) {
      (map[d.stage] ??= []).push(d);
    }
    return map;
  }, [visibleDeals, stages]);

  const handleMove = async (dealId: number, targetStage: string) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === targetStage) return;
    const prev = deals;
    // Optimistic update.
    setDeals((ds) => ds.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d)));
    try {
      await moveDealStage(dealId, targetStage);
      toast(`Moved to ${targetStage}`, 'success');
    } catch (error: any) {
      setDeals(prev); // Revert.
      toast(error?.message || 'Failed to move deal', 'error');
    }
  };

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales/deals' },
              { label: 'Deals', href: '/dashboard/sales/deals' },
              { label: 'Pipeline', href: '/dashboard/sales/deals/pipeline' },
            ]}
          />
          <Link href="/dashboard/sales/deals">
            <Button variant="secondary"><List className="w-4 h-4 mr-2" />List View</Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" placeholder="Search deals..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            />
          </div>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm"
          >
            <option value="all">All Owners</option>
            {owners.map((o) => (
              <option key={o.id} value={String(o.id)}>{o.name}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <Card className="p-8 text-center text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            Loading deals…
          </Card>
        ) : stages.length === 0 ? (
          <Card className="p-8 text-center text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            No deal stages configured.
          </Card>
        ) : (
          <DealPipelineBoard stages={stages} dealsByStage={dealsByStage} canMove={canMove} onMove={handleMove} />
        )}
      </div>
    </PermissionPageGuard>
  );
}
