'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Search, Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { fetchCompanies, deleteCompany, type Company } from '@/lib/api/companies';
import { CompanyFormModal } from '@/components/companies/CompanyFormModal';

const PAGE_SIZE = 25;

export default function SalesCompaniesPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canCreate = isSuperAdmin || hasPermission('sales.companies.create');
  const canEdit = isSuperAdmin || hasPermission('sales.companies.edit');
  const canDelete = isSuperAdmin || hasPermission('sales.companies.delete');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);

  // Debounce the search box so the server-side `q` fires at most every 300ms.
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchCompanies({ q: debounced || undefined, page, pageSize: PAGE_SIZE });
      setCompanies(res.data);
      setTotal(res.total);
    } catch {
      toast('Failed to fetch companies', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [debounced, page, toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (c: Company) => { setEditing(c); setModalOpen(true); };

  const onDelete = async (c: Company) => {
    const ok = await confirm({
      title: 'Delete company',
      message: `Delete "${c.name}"? Its contacts are kept but unlinked from this company. This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      intent: 'danger',
    });
    if (!ok) return;
    try {
      await deleteCompany(c.id);
      toast('Company deleted', 'success');
      load();
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Failed to delete company', 'error');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Breadcrumb
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Sales', href: '/dashboard/sales' },
                { label: 'Companies', href: '/dashboard/sales/companies' },
              ]}
            />
            <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Companies</h1>
          </div>
          {canCreate && (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              New Company
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies by name or industry..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />
          </div>
        </div>

        <Card className="overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Company</th>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Industry</th>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Website</th>
                  <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400">Contacts</th>
                  {(canEdit || canDelete) && <th className="px-6 py-4 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading companies...</td></tr>
                ) : companies.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    {debounced ? 'No companies match your search.' : 'No companies yet.'}
                  </td></tr>
                ) : (
                  companies.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        <Link href={`/dashboard/sales/companies/${c.id}`} className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.industry || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {c.website ? (
                          <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{c.website}</a>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c._count?.contacts ?? 0}</td>
                      {(canEdit || canDelete) && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {canEdit && (
                              <button onClick={() => openEdit(c)} aria-label="Edit company"
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                            )}
                            {canDelete && (
                              <button onClick={() => onDelete(c)} aria-label="Delete company"
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{total} companies · page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <CompanyFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} company={editing} />
    </PermissionPageGuard>
  );
}
