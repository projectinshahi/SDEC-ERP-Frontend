'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import {
  ArrowLeft, AlertTriangle, Activity, Pencil, User, Building2, Mail, Phone,
  Globe, MapPin, Target, Tag, UserPlus, BellPlus, Ban, TrendingUp, CheckCircle2,
} from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { fetchLead, fetchLeadStages } from '@/lib/api/leads';
import { formatLeadSource, leadSourceVariant } from '@/lib/data/leadSources';
import { leadStageTheme } from '@/lib/data/leadStages';
import { formatScore } from '@/lib/data/leadRating';
import { LeadNotesPanel } from '@/components/leads/LeadNotesPanel';
import { EditLeadModal } from '@/components/leads/EditLeadModal';
import { ScoreCard } from '@/components/leads/ScoreCard';
import { InteractionTimeline } from '@/components/leads/InteractionTimeline';
import { FollowUpHistory } from '@/components/leads/FollowUpHistory';
import { AssignLeadModal } from '@/components/leads/AssignLeadModal';
import { AddReminderModal } from '@/components/leads/AddReminderModal';
import { DisqualifyLeadModal } from '@/components/leads/DisqualifyLeadModal';
import { ConvertToDealModal } from '@/components/leads/ConvertToDealModal';
import type { LeadDetail, LeadStage } from '@/lib/types/lead';

const NOT_PROVIDED = 'Not Provided';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isDisqualifyOpen, setIsDisqualifyOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  // Bumped after edits/interactions/assignment to refresh score + interactions.
  const [refreshKey, setRefreshKey] = useState(0);

  const canEdit = hasPermission('sales.edit');
  const canAssign = hasPermission('sales.assign');

  const isConverted = lead?.status === 'converted';
  const isDisqualified = lead?.status === 'disqualified';
  const isInactive = isConverted || isDisqualified;

  const loadLead = useCallback(async () => {
    try {
      setIsLoading(true);
      setLead(await fetchLead(id));
    } catch {
      toast('Failed to load lead', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  const refreshAll = useCallback(() => {
    loadLead();
    setRefreshKey((k) => k + 1);
  }, [loadLead]);

  useEffect(() => {
    if (id) loadLead();
  }, [id, loadLead]);

  useEffect(() => {
    fetchLeadStages().then(setStages).catch(() => setStages([]));
  }, []);

  const stageIndex = lead ? Math.max(0, stages.findIndex((s) => s.name === lead.stage)) : 0;
  const stageTheme = leadStageTheme(stageIndex);

  const tags = (lead?.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales/leads' },
              { label: 'Leads', href: '/dashboard/sales/leads' },
              { label: lead?.title || 'Lead', href: `/dashboard/sales/leads/${id}` },
            ]}
          />
          <div className="flex gap-2 flex-wrap">
            {canEdit && lead && !isInactive && (
              <Button variant="secondary" size="sm" onClick={() => setIsReminderOpen(true)}>
                <BellPlus className="w-4 h-4 mr-2" />
                Add Reminder
              </Button>
            )}
            {canEdit && lead && !isInactive && (
              <Button variant="danger" size="sm" onClick={() => setIsDisqualifyOpen(true)}>
                <Ban className="w-4 h-4 mr-2" />
                Disqualify
              </Button>
            )}
            {canEdit && lead && !isInactive && (
              <Button variant="success" size="sm" onClick={() => setIsConvertOpen(true)}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Convert to Deal
              </Button>
            )}
            {canAssign && lead && !isInactive && (
              <Button variant="secondary" size="sm" onClick={() => setIsAssignOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Assign
              </Button>
            )}
            {canEdit && lead && !isInactive && (
              <Button size="sm" onClick={() => setIsEditOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Lead
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => router.push('/dashboard/sales/leads')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Card className="p-8 text-center text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            Loading lead…
          </Card>
        ) : !lead ? (
          <Card className="p-8 text-center text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            Lead not found.
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Lifecycle status banner */}
            {isConverted && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                This lead has been converted to a deal and is no longer in the active pipeline.
              </div>
            )}
            {isDisqualified && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 text-sm font-medium">
                <Ban className="w-4 h-4 shrink-0" />
                This lead was disqualified{lead.disqualifyReason ? ` — ${lead.disqualifyReason}` : ''}.
              </div>
            )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Overview */}
              <Card className={`p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl border-t-4 ${stageTheme.border}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white break-words">{lead.title}</h1>
                    {lead.customer?.company && (
                      <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 break-words">
                        <Building2 className="w-4 h-4 shrink-0" />
                        {lead.customer.company}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200`}>
                      <span className={`w-2 h-2 rounded-full ${stageTheme.dot}`} />
                      {lead.stage}
                    </span>
                    {lead.flaggedForReview && (
                      <Badge variant="warning">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                        Flagged
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                  <Detail label="Source" value={formatLeadSource(lead.source)} />
                  <Detail label="Owner" value={lead.owner?.name || NOT_PROVIDED} />
                  <Detail label="Stage" value={lead.stage} />
                  <Detail label="Score" value={formatScore(lead.score)} />
                  <Detail label="Status" value={lead.status} />
                  <Detail label="Priority" value={lead.priority} />
                  <Detail label="Created" value={new Date(lead.createdAt).toLocaleString()} />
                  <Detail label="Last Updated" value={new Date(lead.updatedAt).toLocaleString()} />
                </div>

                {lead.description && (
                  <div className="mt-6">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Description</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                      {lead.description}
                    </p>
                  </div>
                )}
              </Card>

              {/* Interactions */}
              <InteractionTimeline leadId={lead.id} refreshKey={refreshKey} onChange={refreshAll} />

              {/* Unified follow-up history timeline */}
              <FollowUpHistory leadId={lead.id} refreshKey={refreshKey} />

              {/* Notes */}
              <LeadNotesPanel leadId={lead.id} onChange={loadLead} />

              {/* Activity */}
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-gray-400" />
                  Activity
                </h2>
                {lead.activityLogs && lead.activityLogs.length > 0 ? (
                  <ul className="space-y-4">
                    {lead.activityLogs.map((log) => (
                      <li key={log.id} className="flex gap-3">
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 dark:text-gray-200 break-words">{log.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No activity recorded yet.</p>
                )}
              </Card>
            </div>

            {/* Side column */}
            <div className="space-y-6">
              {/* Lead score + rating + breakdown */}
              <ScoreCard leadId={lead.id} refreshKey={refreshKey} />

              {/* Contact information */}
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h2>
                <div className="space-y-4">
                  <ContactRow icon={Mail} label="Primary Email" value={lead.customer?.email} />
                  <ContactRow icon={Phone} label="Phone Number" value={lead.customer?.phone} />
                  <ContactRow icon={Globe} label="Website" value={lead.customer?.website} />
                  <ContactRow icon={MapPin} label="Address" value={lead.customer?.address} />
                  <ContactRow icon={User} label="Contact Name" value={lead.customer?.name} />
                </div>
              </Card>

              {/* Metadata */}
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Lead Metadata</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Source</span>
                    <Badge variant={leadSourceVariant(lead.source)}>{formatLeadSource(lead.source)}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Owner</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{lead.owner?.name || NOT_PROVIDED}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Stage</span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                      <span className={`w-2 h-2 rounded-full ${stageTheme.dot}`} />
                      {lead.stage}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 flex items-center gap-1.5 mb-2"><Tag className="w-3.5 h-3.5" /> Tags</span>
                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((t) => (
                          <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">{NOT_PROVIDED}</span>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
          </div>
        )}
      </div>

      {lead && (
        <EditLeadModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          lead={lead}
          stages={stages}
          onSaved={refreshAll}
        />
      )}

      {lead && (
        <AssignLeadModal
          isOpen={isAssignOpen}
          onClose={() => setIsAssignOpen(false)}
          leadId={lead.id}
          currentOwnerId={lead.ownerId}
          onAssigned={refreshAll}
        />
      )}

      {lead && (
        <AddReminderModal
          isOpen={isReminderOpen}
          onClose={() => setIsReminderOpen(false)}
          leadId={lead.id}
          onSaved={loadLead}
        />
      )}

      {lead && (
        <DisqualifyLeadModal
          isOpen={isDisqualifyOpen}
          onClose={() => setIsDisqualifyOpen(false)}
          leadId={lead.id}
          onDone={refreshAll}
        />
      )}

      {lead && (
        <ConvertToDealModal
          isOpen={isConvertOpen}
          onClose={() => setIsConvertOpen(false)}
          lead={lead}
          onConverted={refreshAll}
        />
      )}
    </PermissionPageGuard>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize break-words">
        {value || NOT_PROVIDED}
      </p>
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
