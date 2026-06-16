'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, FileCheck, Inbox, Plus, ScanEye } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { SelectField } from '@/components/ui/SelectField';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { fetchApprovals } from '@/lib/api/documentApprovals';
import type { ApprovalStatus, DocumentApproval } from '@/lib/types/salesExecution';
import { ApprovalStatusBadge } from '@/components/sales-execution/ApprovalStatusBadge';
import { SubmitDocumentModal } from '@/components/sales-execution/SubmitDocumentModal';
import { ApprovalDecisionModal } from '@/components/sales-execution/ApprovalDecisionModal';
import { ApprovalDetailDrawer } from '@/components/sales-execution/ApprovalDetailDrawer';

type Scope = 'mine' | 'queue';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'rework', label: 'Rework Requested' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function ApprovalsPageInner() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const canCreate = hasPermission('sales.create');
  const canApprove = hasPermission('sales.approve');

  const [scope, setScope] = useState<Scope>(canApprove ? 'queue' : 'mine');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [approvals, setApprovals] = useState<DocumentApproval[]>([]);
  const [loading, setLoading] = useState(true);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<DocumentApproval | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const status =
        scope === 'queue'
          ? 'pending'
          : statusFilter !== 'all'
          ? (statusFilter as ApprovalStatus)
          : undefined;
      const data = await fetchApprovals({ scope, status });
      setApprovals(data);
    } catch (err: any) {
      toast(err?.message || 'Failed to load document approvals', 'error');
    } finally {
      setLoading(false);
    }
  }, [scope, statusFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const scopeTabs = useMemo(() => {
    const tabs: { key: Scope; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
      { key: 'mine', label: 'My Submissions', icon: ClipboardCheck },
    ];
    if (canApprove) tabs.unshift({ key: 'queue', label: 'Approval Queue', icon: ScanEye });
    return tabs;
  }, [canApprove]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales' },
              { label: 'Document Approvals', href: '/dashboard/sales/approvals' },
            ]}
          />
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Document Approvals</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Submit documents for manager review and clear the approval gate before sending to clients.
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={() => setSubmitOpen(true)}>
            <Plus size={16} />
            Submit Document
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {scopeTabs.map(({ key, label, icon: Icon }) => {
            const active = scope === key;
            return (
              <button
                key={key}
                onClick={() => setScope(key)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>

        {scope === 'mine' && (
          <div className="w-full sm:w-56">
            <SelectField
              label="Status"
              id="approvals-status-filter"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} variant="outlined" className="p-5">
              <Skeleton className="mb-3 h-5 w-1/3" />
              <Skeleton className="mb-2 h-4 w-1/4" />
              <Skeleton className="h-4 w-1/5" />
            </Card>
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <EmptyState
          icon={<FileCheck size={32} />}
          title="No documents here"
          description={
            scope === 'queue'
              ? 'There are no documents awaiting your review right now.'
              : 'You have not submitted any documents for approval yet.'
          }
          actionLabel={canCreate ? 'Submit Document' : undefined}
          onAction={canCreate ? () => setSubmitOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-4">
          {approvals.map((a) => {
            const parent = a.deal?.title
              ? `Deal · ${a.deal.title}`
              : a.lead?.title
              ? `Lead · ${a.lead.title}`
              : null;
            return (
              <Card key={a.id} variant="outlined" hoverable className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {a.docType}
                      </span>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{a.version}</span>
                      <ApprovalStatusBadge status={a.status} sentToClient={a.sentToClient} />
                    </div>
                    <h3 className="mt-2 truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                      {a.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      {parent && <span className="font-medium text-gray-600 dark:text-gray-300">{parent}</span>}
                      <span>
                        {a.submittedBy?.name ?? `User #${a.submittedById}`}
                      </span>
                      <span>{formatDate(a.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setDetailId(a.id)}>
                      View
                    </Button>
                    {a.status === 'pending' && canApprove && (
                      <Button variant="primary" size="sm" onClick={() => setReviewTarget(a)}>
                        <Inbox size={15} />
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <SubmitDocumentModal
        isOpen={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSubmitted={load}
      />
      <ApprovalDecisionModal
        isOpen={reviewTarget !== null}
        onClose={() => setReviewTarget(null)}
        approval={reviewTarget}
        onDecided={load}
      />
      <ApprovalDetailDrawer
        isOpen={detailId !== null}
        onClose={() => setDetailId(null)}
        approvalId={detailId}
        onChanged={load}
      />
    </div>
  );
}

export default function DocumentApprovalsPage() {
  return (
    <PermissionPageGuard module="sales">
      <ApprovalsPageInner />
    </PermissionPageGuard>
  );
}
