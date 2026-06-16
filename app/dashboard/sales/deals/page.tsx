'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Search, Plus, LayoutGrid } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { apiClient } from '@/lib/api/api-client';

interface Deal {
  id: string | number;
  title: string;
  amount: number;
  status: string;
  stage?: string;
  customer?: { name: string };
  owner?: { name: string };
}

export default function SalesDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<Deal[]>('/sales/deals');
      setDeals(res.data);
    } catch (error) {
      toast('Failed to fetch deals', 'error');
    } finally {
      setIsLoading(false);
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
              { label: 'Deals', href: '/dashboard/sales/deals' }
            ]} 
          />
          <div className="flex gap-2">
            <Link href="/dashboard/sales/deals/pipeline">
              <Button variant="secondary">
                <LayoutGrid className="w-4 h-4 mr-2" />
                Pipeline
              </Button>
            </Link>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Deal
            </Button>
          </div>
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
                ) : deals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No deals found</td>
                  </tr>
                ) : (
                  deals.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase())).map((deal) => (
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
      </div>
    </PermissionPageGuard>
  );
}
