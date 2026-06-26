'use client';

import { useCallback, useEffect, useState } from 'react';
import { Paperclip, Plus } from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { fetchApprovals } from '@/lib/api/documentApprovals';
import type { DocumentApproval } from '@/lib/types/salesExecution';
import { ApprovalStatusBadge } from '@/components/sales-execution/ApprovalStatusBadge';
import { SubmitDocumentModal } from '@/components/sales-execution/SubmitDocumentModal';
import { ApprovalDetailDrawer } from '@/components/sales-execution/ApprovalDetailDrawer';

interface DealDocApprovalPanelProps {
  dealId: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatBytes(bytes?: number | null): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Deal Attachments / Documents — reuses the documentApproval system (single
 * source of truth) via `presetDealId`, exactly like the Lead panel. Uploaded
 * files post to POST /sales/approvals with this deal, so they also appear in the
 * Sales → Approvals queue. View/Download via the detail drawer's open-document
 * link. Upload requires `sales.create`.
 */
export function DealDocApprovalPanel({ dealId }: DealDocApprovalPanelProps) {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const canUpload = hasPermission('sales.create');

  const [docs, setDocs] = useState<DocumentApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setDocs(await fetchApprovals({ dealId }));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load attachments', 'error');
    } finally {
      setLoading(false);
    }
  }, [dealId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-gray-400" />
          Attachments
          {docs.length > 0 && <span className="text-xs font-medium text-gray-400">({docs.length})</span>}
        </h2>
        {canUpload && (
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Upload
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading attachments…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-500">
          No attachments yet.{canUpload ? ' Upload PDF, DOC, XLS, PPT or image files.' : ''}
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
                    <ApprovalStatusBadge status={d.status} sentToClient={d.sentToClient} />
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{d.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{d.fileName}</span>
                    {d.fileSize ? <span>{formatBytes(d.fileSize)}</span> : null}
                    <span>Uploaded by {d.submittedBy?.name ?? `User #${d.submittedById}`}</span>
                    <span>{formatDate(d.createdAt)}</span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  {d.fileUrl && (
                    <a href={d.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="secondary" size="sm">Download</Button>
                    </a>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => setDetailId(d.id)}>
                    View
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Upload — preset to this deal so it also surfaces in Sales → Approvals. */}
      <SubmitDocumentModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmitted={load}
        presetDealId={dealId}
      />
      {/* View document + full history + download. */}
      <ApprovalDetailDrawer
        isOpen={detailId !== null}
        onClose={() => setDetailId(null)}
        approvalId={detailId}
        onChanged={load}
      />
    </Card>
  );
}
