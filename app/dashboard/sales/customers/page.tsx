'use client';

import { useState, useEffect } from 'react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Search, Plus } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { apiClient } from '@/lib/api/api-client';

export default function SalesCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<any[]>('/sales/customers');
      setCustomers(res.data);
    } catch (error) {
      toast('Failed to fetch customers', 'error');
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
              { label: 'Sales', href: '/dashboard/sales/customers' },
              { label: 'Customers', href: '/dashboard/sales/customers' }
            ]} 
          />
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Customer
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
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
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Company</th>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Email</th>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Owner</th>
                  <th className="px-6 py-4 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading customers...</td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No customers found</td>
                  </tr>
                ) : (
                  customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{customer.name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{customer.company || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{customer.email || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{customer.owner?.name}</td>
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
