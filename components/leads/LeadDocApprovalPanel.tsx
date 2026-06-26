'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileCheck2, Plus, Inbox } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { fetchApprovals } from '@/lib/api/documentApprovals';
import type { DocumentApproval } from '@/lib/types/salesExecution';
import { ApprovalStatusBadge } from '@/components/sales-execution/ApprovalStatusBadge';
import { SubmitDocumentModal } from '@/components/sales-execution/SubmitDocumentModal';
import { ApprovalDecisionModal } from '@/components/sales-execution/ApprovalDecisionModal';
import { ApprovalDetailDrawer } from '@/components/sales-execution/ApprovalDetailDrawer';

interface LeadDocApprovalPanelProps {
  leadId: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * SE-022 — Doc Approval section on the Lead Details page.
 *
 * Documents uploaded here are persisted to the SAME `documentApproval` records as
 * the Sales → Approvals page (single source of truth): the upload posts to
 * POST /sales/approvals with this lead preset, so a "Pending Approval" document
 * automatically appears in the Approval Queue with NO duplicate model or manual
 * sync. Approving / rejecting (here or on the Approvals page) updates that one
 * record, so the status shown here always matches.
 *
 * RBAC: uploading needs `sales.create`; approving/rejecting needs `sales.approve`
 * (both enforced again on the backend → 403). Everyone with sales view can read.
 */
export function LeadDocApprovalPanel({ leadId }: LeadDocApprovalPanelProps) {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const canUpload = hasPermission('sales.create');
  const canApprove = hasPermission('sales.approve');

  const [docs, setDocs] = useState<DocumentApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<DocumentApproval | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setDocs(await fetchApprovals({ leadId }));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  }, [leadId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-gray-400" />
          Doc Approval
        </h2>
        {canUpload && (
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Upload Document
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading documents…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-500">
          No documents uploaded yet.{canUpload ? ' Upload a document to start the approval workflow.' : ''}
        </p>
      ) : (
        <ul className="space-y-3">
          {docs.map((d) => (
            <li
              key={d.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 transition-colors hover:border-blue-300 dark:hover:border-blue-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {d.docType}
                    </span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{d.version}</span>
                    <ApprovalStatusBadge status={d.status} sentToClient={d.sentToClient} />
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{d.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>Uploaded by {d.submittedBy?.name ?? `User #${d.submittedById}`}</span>
                    <span>{formatDate(d.createdAt)}</span>
                    {d.reviewedBy?.name && <span>Reviewer: {d.reviewedBy.name}</span>}
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setDetailId(d.id)}>
                    View
                  </Button>
                  {/* {d.status === 'pending' && canApprove && (
                    <Button size="sm" onClick={() => setReviewTarget(d)}>
                      <Inbox className="w-3.5 h-3.5 mr-1" />
                      Review
                    </Button>
                  )} */}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Upload — preset to this lead so the record appears in Sales → Approvals. */}
      <SubmitDocumentModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmitted={load}
        presetLeadId={leadId}
      />
      {/* Approve / reject (same record the Approvals page acts on → always synced). */}
      <ApprovalDecisionModal
        isOpen={reviewTarget !== null}
        onClose={() => setReviewTarget(null)}
        approval={reviewTarget}
        onDecided={load}
      />
      {/* View document + full approval history + download. */}
      <ApprovalDetailDrawer
        isOpen={detailId !== null}
        onClose={() => setDetailId(null)}
        approvalId={detailId}
        onChanged={load}
      />
    </Card>
  );
}
