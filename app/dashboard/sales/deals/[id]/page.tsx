'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';
import {
  ArrowLeft, Pencil, Trash2, Building2, Mail, Phone, Globe, MapPin, User,
  Target, Activity, History, TrendingUp, ExternalLink, DollarSign, Briefcase,
} from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { fetchDeal, fetchDealStages, deleteDeal } from '@/lib/api/leadLifecycle';
import { fetchAssignableUsers } from '@/lib/api/leads';
import { DealFormModal } from '@/components/deals/DealFormModal';
import { DealNotesPanel } from '@/components/deals/DealNotesPanel';
import { DealDocApprovalPanel } from '@/components/deals/DealDocApprovalPanel';
import type { DealDetail, DealStage, DealActivityLog } from '@/lib/types/leadLifecycle';
import type { AssignableUser } from '@/lib/types/lead';

const NOT_PROVIDED = 'Not Provided';

const STAGE_TONES: Record<string, { border: string; dot: string }> = {
  'Closed Won': { border: 'border-t-emerald-500', dot: 'bg-emerald-500' },
  'Closed Lost': { border: 'border-t-rose-500', dot: 'bg-rose-500' },
  Negotiation: { border: 'border-t-amber-500', dot: 'bg-amber-500' },
  'Proposal Sent': { border: 'border-t-blue-500', dot: 'bg-blue-500' },
};
function stageTone(stage: string) {
  return STAGE_TONES[stage] ?? { border: 'border-t-indigo-500', dot: 'bg-indigo-500' };
}

function fmtMoney(amount?: number | null, currency?: string | null): string {
  const n = Number(amount || 0);
  return `${currency || 'INR'} ${n.toLocaleString()}`;
}
function fmtDate(iso?: string | null): string {
  if (!iso) return NOT_PROVIDED;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? NOT_PROVIDED : d.toLocaleString();
}
function fmtDateShort(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Stage-change activity types feeding the Stage History timeline. */
const STAGE_TYPES = ['deal_created', 'deal_stage_changed', 'deal_won', 'deal_lost', 'deal_recovered'];
/**
 * Extract "from X to Y" out of a stage-change activity description. Anchored to
 * the deal title's closing quote (backend template is `… "<title>" from X to Y.`)
 * so a title that itself contains " from … to " can't be mis-parsed. Descriptions
 * without that shape (deal_created / deal_recovered) return {} → raw text shown.
 */
function parseStageTransition(desc: string): { from?: string; to?: string } {
  const m = desc.match(/"\s*from (.+?) to (.+?)\.?$/i);
  if (m) return { from: m[1], to: m[2] };
  return {};
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const canEdit = hasPermission('sales.edit');
  const canDelete = hasPermission('sales.delete');
  const canAssignOwner = hasPermission('sales.assign');

  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [owners, setOwners] = useState<AssignableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDeal = useCallback(async () => {
    try {
      setIsLoading(true);
      setDeal(await fetchDeal(id));
    } catch {
      toast('Failed to load deal', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  const refreshAll = useCallback(() => {
    loadDeal();
    setRefreshKey((k) => k + 1);
  }, [loadDeal]);

  useEffect(() => {
    if (id) loadDeal();
  }, [id, loadDeal]);

  useEffect(() => {
    fetchDealStages().then(setStages).catch(() => setStages([]));
    fetchAssignableUsers().then(setOwners).catch(() => setOwners([]));
  }, []);

  const handleDelete = async () => {
    if (!deal) return;
    try {
      setIsDeleting(true);
      await deleteDeal(deal.id);
      toast('Deal deleted', 'success');
      router.push('/dashboard/sales/deals');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete deal', 'error');
      setIsDeleting(false);
    }
  };

  const logs: DealActivityLog[] = deal?.activityLogs ?? [];
  const stageHistory = logs.filter((l) => STAGE_TYPES.includes(l.type));
  const tone = deal ? stageTone(deal.stage) : stageTone('');
  const forecast = deal
    ? (deal.weightedRevenue ?? Math.round((Number(deal.amount || 0) * Number(deal.probability || 0)) / 100))
    : 0;

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales/deals' },
              { label: 'Deals', href: '/dashboard/sales/deals' },
              { label: deal?.title || 'Deal', href: `/dashboard/sales/deals/${id}` },
            ]}
          />
          <div className="flex gap-2 flex-wrap">
            {canEdit && deal && (
              <Button size="sm" onClick={() => setIsEditOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Deal
              </Button>
            )}
            {canDelete && deal && (
              <Button variant="danger" size="sm" onClick={() => setIsDeleteOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => router.push('/dashboard/sales/deals')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Card className="p-8 text-center text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            Loading deal…
          </Card>
        ) : !deal ? (
          <Card className="p-8 text-center text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            Deal not found.
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Deal Overview */}
              <Card className={`p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl border-t-4 ${tone.border}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white break-words">{deal.title}</h1>
                    {deal.customer?.company && (
                      <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 break-words">
                        <Building2 className="w-4 h-4 shrink-0" />
                        {deal.customer.company}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                      <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                      {deal.stage}
                    </span>
                    <Badge variant={deal.status === 'won' ? 'success' : deal.status === 'lost' ? 'danger' : 'info'}>
                      {deal.status}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                  <Detail label="Deal Value" value={fmtMoney(deal.amount, deal.currency)} />
                  <Detail label="Probability" value={`${deal.probability ?? 0}%`} />
                  <Detail label="Owner" value={deal.owner?.name || NOT_PROVIDED} />
                  <Detail label="Status" value={deal.status} />
                  <Detail label="Expected Close" value={fmtDate(deal.expectedCloseDate)} />
                  <Detail label="Created" value={fmtDate(deal.createdAt)} />
                </div>
              </Card>

              {/* Deal Information */}
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-gray-400" />
                  Deal Information
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Detail label="Deal ID" value={`#${deal.id}`} />
                  <Detail label="Deal Value" value={fmtMoney(deal.amount, deal.currency)} />
                  <Detail label="Currency" value={deal.currency || 'INR'} />
                  <Detail label="Stage" value={deal.stage} />
                  <Detail label="Probability" value={`${deal.probability ?? 0}%`} />
                  <Detail label="Owner" value={deal.owner?.name || NOT_PROVIDED} />
                  <Detail label="Source" value={deal.source || NOT_PROVIDED} />
                  <Detail label="Expected Close" value={fmtDate(deal.expectedCloseDate)} />
                  <Detail label="Last Updated" value={fmtDate(deal.updatedAt)} />
                </div>
                {deal.description && (
                  <div className="mt-6">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Description</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                      {deal.description}
                    </p>
                  </div>
                )}
              </Card>

              {/* Stage History */}
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-gray-400" />
                  Stage History
                </h2>
                {stageHistory.length === 0 ? (
                  <p className="text-sm text-gray-500">No stage changes recorded yet.</p>
                ) : (
                  <ul className="space-y-4">
                    {stageHistory.map((log) => {
                      const t = parseStageTransition(log.description);
                      return (
                        <li key={log.id} className="flex gap-3">
                          <div className="mt-1.5 w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                          <div className="min-w-0">
                            {t.from && t.to ? (
                              <p className="text-sm text-gray-800 dark:text-gray-200">
                                <span className="font-medium">{t.from}</span>
                                <span className="text-gray-400"> → </span>
                                <span className="font-semibold">{t.to}</span>
                              </p>
                            ) : (
                              <p className="text-sm text-gray-800 dark:text-gray-200 break-words">{log.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">
                              {log.actor?.name ? `${log.actor.name} · ` : ''}{fmtDateShort(log.created_at)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              {/* Notes */}
              <DealNotesPanel dealId={deal.id} onChange={refreshAll} />

              {/* Attachments / Documents */}
              <DealDocApprovalPanel dealId={deal.id} />

              {/* Activity Timeline */}
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-gray-400" />
                  Activity Timeline
                </h2>
                {logs.length === 0 ? (
                  <p className="text-sm text-gray-500">No activity recorded yet.</p>
                ) : (
                  <ul className="space-y-4">
                    {logs.map((log) => (
                      <li key={log.id} className="flex gap-3">
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 dark:text-gray-200 break-words">{log.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {log.actor?.name ? `${log.actor.name} · ` : ''}{fmtDateShort(log.created_at)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {/* Side column */}
            <div className="space-y-6">
              {/* Financial Information */}
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  Financial Information
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Deal Value</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtMoney(deal.amount, deal.currency)}</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-400">Probability</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{deal.probability ?? 0}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, deal.probability ?? 0))}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Weighted Forecast</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtMoney(forecast, deal.currency)}</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Forecast = value × probability</p>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-gray-400">Expected Close</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{fmtDate(deal.expectedCloseDate)}</span>
                  </div>
                </div>
              </Card>

              {/* Linked Lead */}
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-gray-400" />
                  Linked Lead
                </h2>
                {deal.lead ? (
                  <div className="space-y-3">
                    <Link
                      href={`/dashboard/sales/leads/${deal.lead.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      {deal.lead.title}
                      <ExternalLink size={14} />
                    </Link>
                    <ContactRow icon={Building2} label="Company" value={deal.lead.customer?.company} />
                    <ContactRow icon={User} label="Contact" value={deal.lead.customer?.name} />
                    <ContactRow icon={Mail} label="Email" value={deal.lead.customer?.email} />
                    <ContactRow icon={Phone} label="Phone" value={deal.lead.customer?.phone} />
                    {deal.lead.status && <ContactRow icon={Target} label="Lead Status" value={deal.lead.status} />}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">This deal was not converted from a lead.</p>
                )}
              </Card>

              {/* Linked Account */}
              {deal.customer && (
                <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    Linked Account
                  </h2>
                  <div className="space-y-3">
                    <ContactRow icon={User} label="Account Name" value={deal.customer.name} />
                    <ContactRow icon={Building2} label="Company" value={deal.customer.company} />
                    <ContactRow icon={Briefcase} label="Industry" value={deal.customer.industry} />
                    <ContactRow icon={Mail} label="Email" value={deal.customer.email} />
                    <ContactRow icon={Phone} label="Phone" value={deal.customer.phone} />
                    <ContactRow icon={Globe} label="Website" value={deal.customer.website} />
                    <ContactRow icon={MapPin} label="Address" value={deal.customer.address} />
                  </div>
                </Card>
              )}

              {/* Linked Project (post-sale) */}
              {deal.linkedProject && (
                <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    Linked Project
                  </h2>
                  <Link
                    href={`/dashboard/projects/${deal.linkedProject.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {deal.linkedProject.name}
                    <ExternalLink size={14} />
                  </Link>
                  <p className="text-xs text-gray-400 mt-1 capitalize">Status: {deal.linkedProject.status}</p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit modal (existing DealFormModal) */}
      {deal && (
        <DealFormModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSaved={refreshAll}
          deal={deal}
          stages={stages}
          owners={owners}
          canAssignOwner={canAssignOwner}
        />
      )}

      {/* Delete confirmation */}
      <Modal isOpen={isDeleteOpen} onClose={() => !isDeleting && setIsDeleteOpen(false)} title="Delete Deal" size="sm">
        <div className="flex flex-col items-center text-center p-2">
          <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4">
            <Trash2 size={26} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete this deal?</h3>
          <p className="text-slate-500 text-sm mb-6">
            Permanently delete <span className="font-semibold text-slate-800 dark:text-slate-200">&quot;{deal?.title}&quot;</span>?
            This also removes its notes and attachments and cannot be undone.
          </p>
          <div className="flex items-center gap-3 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete} isLoading={isDeleting}>Delete Deal</Button>
          </div>
        </div>
      </Modal>
    </PermissionPageGuard>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize break-words">{value || NOT_PROVIDED}</p>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white break-words">
          {value && value.trim() ? value : <span className="text-gray-400 font-normal">{NOT_PROVIDED}</span>}
        </p>
      </div>
    </div>
  );
}
