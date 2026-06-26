'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Search, Plus } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { fetchDeals, fetchDealStages } from '@/lib/api/leadLifecycle';
import { fetchAssignableUsers } from '@/lib/api/leads';
import { DealFormModal } from '@/components/deals/DealFormModal';
import type { Deal, DealStage } from '@/lib/types/leadLifecycle';
import type { AssignableUser } from '@/lib/types/lead';

export default function SalesDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [owners, setOwners] = useState<AssignableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const canCreate = hasPermission('sales.create');
  const canEdit = hasPermission('sales.edit');
  const canAssignOwner = hasPermission('sales.assign');

  // New Deal / Edit / View modal (single shared modal — no duplicate flow).
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [dealModalReadOnly, setDealModalReadOnly] = useState(false);

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

  const visibleDeals = deals.filter((d) =>
    (d.title || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

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

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
                        <Button variant="secondary" size="sm" onClick={() => openDeal(deal)}>
                          {canEdit ? 'Edit' : 'View'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
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
