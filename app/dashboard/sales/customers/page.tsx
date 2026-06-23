'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Search, Plus } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { apiClient } from '@/lib/api/api-client';

interface ContactRow {
  id: number;
  name: string;
  company?: string | null;
  email?: string | null;
  owner?: { name: string } | null;
}

// NOTE: terminology is "Contacts" in the UI; the route + API (/sales/customers)
// stay as-is to avoid backend/route churn.
export default function SalesContactsPage() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const fetchContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<ContactRow[]>('/sales/customers');
      setContacts(res.data);
    } catch {
      toast('Failed to fetch contacts', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContacts();
  }, [fetchContacts]);

  const visible = contacts.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Breadcrumb
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Sales', href: '/dashboard/sales/customers' },
                { label: 'Contacts', href: '/dashboard/sales/customers' },
              ]}
            />
            <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Contacts</h1>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Contact
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading contacts...</td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No contacts found</td>
                  </tr>
                ) : (
                  visible.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        {/* Contact name → Contact Details (replaces the old View button) */}
                        <Link
                          href={`/dashboard/sales/customers/${contact.id}`}
                          className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                        >
                          {contact.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{contact.company || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{contact.email || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{contact.owner?.name}</td>
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
