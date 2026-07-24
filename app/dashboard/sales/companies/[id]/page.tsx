'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { ArrowLeft, Pencil, Trash2, Building2, Users, TrendingUp, Globe, MapPin, FileText } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { fetchCompany, deleteCompany, type CompanyDetails } from '@/lib/api/companies';
import { CompanyFormModal } from '@/components/companies/CompanyFormModal';

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm text-gray-800 dark:text-gray-200">{value || <span className="text-gray-400">—</span>}</p>
    </div>
  );
}

export default function CompanyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canEdit = isSuperAdmin || hasPermission('sales.companies.edit');
  const canDelete = isSuperAdmin || hasPermission('sales.companies.delete');

  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) { setNotFound(true); setIsLoading(false); return; }
    try {
      setIsLoading(true);
      setCompany(await fetchCompany(id));
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onDelete = async () => {
    if (!company) return;
    const ok = await confirm({
      title: 'Delete company',
      message: `Delete "${company.name}"? Its contacts are kept but unlinked. This cannot be undone.`,
      confirmLabel: 'Delete', cancelLabel: 'Cancel', intent: 'danger',
    });
    if (!ok) return;
    try {
      await deleteCompany(company.id);
      toast('Company deleted', 'success');
      router.push('/dashboard/sales/companies');
    } catch (e: any) {
      toast(e?.response?.data?.error || 'Failed to delete company', 'error');
    }
  };

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Sales', href: '/dashboard/sales' },
            { label: 'Companies', href: '/dashboard/sales/companies' },
            { label: company?.name || 'Company', href: `/dashboard/sales/companies/${id}` },
          ]}
        />

        {isLoading ? (
          <div className="space-y-4"><Skeleton className="h-32 w-full rounded-2xl" /><Skeleton className="h-48 w-full rounded-2xl" /></div>
        ) : notFound || !company ? (
          <Card className="p-12 text-center">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Company not found</h2>
            <Link href="/dashboard/sales/companies" className="mt-3 inline-flex items-center text-sm text-blue-600 hover:underline">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Companies
            </Link>
          </Card>
        ) : (
          <>
            {/* Header + actions */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{company.name}</h1>
                  {company.industry && <p className="text-sm text-gray-500">{company.industry}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canEdit && <Button variant="secondary" onClick={() => setModalOpen(true)}><Pencil className="w-4 h-4 mr-2" />Edit</Button>}
                {canDelete && <Button variant="danger" onClick={onDelete}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>}
              </div>
            </div>

            {/* Basic information */}
            <Card className="p-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-4">Company Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <Field label="Company Name" value={company.name} />
                <Field label="Industry" value={company.industry} />
                <Field label="GST" value={company.gst} />
                <Field label="Website" value={company.website ? (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                    <Globe className="w-3.5 h-3.5" />{company.website}
                  </a>
                ) : undefined} />
                <Field label="Address" value={company.address ? (
                  <span className="inline-flex items-start gap-1"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />{company.address}</span>
                ) : undefined} />
              </div>
              {company.notes && (
                <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Notes</p>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{company.notes}</p>
                </div>
              )}
            </Card>

            {/* Related contacts */}
            <Card className="p-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" /> Related Contacts ({company.contacts.length})
              </h2>
              {company.contacts.length === 0 ? (
                <p className="text-sm text-gray-400">No contacts linked to this company yet.</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {company.contacts.map((c) => (
                    <Link key={c.id} href={`/dashboard/sales/customers/${c.id}`}
                      className="flex items-center justify-between py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 -mx-2 px-2 rounded-lg transition-colors">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                        <p className="text-xs text-gray-500">{[c.designation, c.email, c.phone].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                      <span className="text-xs text-blue-600 dark:text-blue-400">View →</span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {/* Related pipeline */}
            <Card className="p-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Related Pipeline ({company.pipeline.length})
              </h2>
              {company.pipeline.length === 0 ? (
                <p className="text-sm text-gray-400">No pipeline records for this company yet.</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {company.pipeline.map((p) => (
                    <Link key={p.id} href={`/dashboard/sales/pipeline/${p.id}`}
                      className="flex items-center justify-between py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 -mx-2 px-2 rounded-lg transition-colors">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{p.title}</p>
                        <p className="text-xs text-gray-500">{p.stage} · {p.status}</p>
                      </div>
                      <span className="text-xs text-blue-600 dark:text-blue-400">View →</span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      <CompanyFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} company={company} />
    </PermissionPageGuard>
  );
}
