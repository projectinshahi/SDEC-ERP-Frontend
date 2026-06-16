'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileUp,
  RotateCcw,
  Send,
  X,
  XCircle,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { TextareaField } from '@/components/ui/TextareaField';
import { InputField } from '@/components/ui/InputField';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';
import { useToast } from '@/lib/hooks/useToast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  fetchApproval,
  resubmitApproval,
  sendApprovalToClient,
} from '@/lib/api/documentApprovals';
import type { ApprovalHistoryEntry, DocumentApproval } from '@/lib/types/salesExecution';

interface ApprovalDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  approvalId: number | null;
  onChanged: () => void;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Visual style for each timeline action (normalised to lowercase). */
function timelineStyle(action: string): {
  dot: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
} {
  const a = action.toLowerCase();
  if (a.includes('approve')) return { dot: 'bg-green-500', icon: CheckCircle2 };
  if (a.includes('reject')) return { dot: 'bg-red-500', icon: XCircle };
  if (a.includes('rework')) return { dot: 'bg-amber-500', icon: RotateCcw };
  if (a.includes('sent') || a.includes('send')) return { dot: 'bg-emerald-500', icon: Send };
  // submitted / resubmitted / anything else
  return { dot: 'bg-blue-500', icon: FileUp };
}

function prettyAction(action: string): string {
  return action
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ApprovalDetailDrawer({ isOpen, onClose, approvalId, onChanged }: ApprovalDetailDrawerProps) {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();

  const [approval, setApproval] = useState<DocumentApproval | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Inline resubmit form state.
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [resubmitVersion, setResubmitVersion] = useState('');
  const [resubmitError, setResubmitError] = useState<string | undefined>();
  const [resubmitting, setResubmitting] = useState(false);

  const load = useCallback(async () => {
    if (approvalId == null) return;
    try {
      setLoading(true);
      setApproval(await fetchApproval(approvalId));
    } catch (err: any) {
      toast(err?.message || 'Failed to load document', 'error');
    } finally {
      setLoading(false);
    }
  }, [approvalId, toast]);

  useEffect(() => {
    if (isOpen && approvalId != null) {
      setResubmitFile(null);
      setResubmitNotes('');
      setResubmitVersion('');
      setResubmitError(undefined);
      load();
    } else if (!isOpen) {
      setApproval(null);
    }
  }, [isOpen, approvalId, load]);

  const handleSend = async () => {
    if (!approval) return;
    try {
      setSending(true);
      await sendApprovalToClient(approval.id);
      toast('Document sent', 'success');
      onChanged();
      await load();
    } catch (err: any) {
      toast(err?.message || 'Failed to send document to client', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleResubmit = async () => {
    if (!approval) return;
    if (!resubmitNotes.trim()) {
      setResubmitError('Change notes are required to resubmit.');
      return;
    }
    try {
      setResubmitting(true);
      await resubmitApproval(
        approval.id,
        resubmitNotes.trim(),
        resubmitFile ?? undefined,
        resubmitVersion.trim() || undefined,
      );
      toast('Revised document resubmitted', 'success');
      setResubmitFile(null);
      setResubmitNotes('');
      setResubmitVersion('');
      onChanged();
      await load();
    } catch (err: any) {
      toast(err?.message || 'Failed to resubmit document', 'error');
    } finally {
      setResubmitting(false);
    }
  };

  const history: ApprovalHistoryEntry[] = approval?.history ?? [];
  const isSubmitter = approval != null && user != null && Number(user.id) === approval.submittedById;
  const canSend = hasPermission('sales.edit');
  const canResubmit = hasPermission('sales.edit');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Document Approval" size="lg">
      {loading || !approval ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {approval.docType}
              </span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{approval.version}</span>
              <ApprovalStatusBadge status={approval.status} sentToClient={approval.sentToClient} />
            </div>
            <h3 className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">{approval.title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Submitted by {approval.submittedBy?.name ?? `User #${approval.submittedById}`} ·{' '}
              {formatDate(approval.createdAt)}
            </p>
            <a
              href={approval.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <ExternalLink size={15} />
              Open document ({approval.fileName})
            </a>
          </div>

          {/* Change notes */}
          {approval.changeNotes && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Change Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                {approval.changeNotes}
              </p>
            </div>
          )}

          {/* Manager comments */}
          {approval.managerComments && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Manager Comments
                {approval.reviewedBy?.name ? ` · ${approval.reviewedBy.name}` : ''}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                {approval.managerComments}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Audit History</p>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">No history recorded yet.</p>
            ) : (
              <ol className="relative space-y-5 border-l border-gray-200 pl-6 dark:border-gray-700">
                {history.map((entry) => {
                  const { dot, icon: Icon } = timelineStyle(entry.action);
                  return (
                    <li key={entry.id} className="relative">
                      <span
                        className={`absolute -left-[1.92rem] flex h-6 w-6 items-center justify-center rounded-full text-white ${dot}`}
                      >
                        <Icon size={13} />
                      </span>
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {prettyAction(entry.action)}
                        </p>
                        <span className="text-xs text-gray-400">{formatDate(entry.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {entry.actor?.name ?? `User #${entry.actorId}`}
                      </p>
                      {entry.comments && (
                        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                          {entry.comments}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Action footer */}
          <div className="space-y-4 border-t border-gray-100 pt-5 dark:border-gray-700">
            {approval.status === 'pending' && (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                Awaiting manager review — cannot be sent to client yet.
              </p>
            )}

            {approval.status === 'approved' && (
              <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:bg-green-950/30 dark:text-green-300">
                ✓ Approved — cleared to send to client.
              </p>
            )}

            {approval.status === 'approved' && !approval.sentToClient && canSend && (
              <Button variant="success" onClick={handleSend} isLoading={sending} fullWidth>
                <Send size={16} />
                Send to Client
              </Button>
            )}

            {(approval.status === 'rejected' || approval.status === 'rework') &&
              isSubmitter &&
              canResubmit && (
                <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Resubmit Revised Document
                  </p>

                  {resubmitFile ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/30">
                      <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {resubmitFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setResubmitFile(null)}
                        className="rounded-full p-1 text-gray-400 transition hover:text-gray-600"
                        aria-label="Remove file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 transition hover:border-blue-400 dark:border-gray-600">
                      <FileUp size={15} />
                      Replace file (optional)
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => setResubmitFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}

                  <InputField
                    label="Version"
                    id="resubmit-version"
                    value={resubmitVersion}
                    onChange={setResubmitVersion}
                    placeholder="e.g. v2"
                  />

                  <TextareaField
                    label="Change Notes"
                    id="resubmit-notes"
                    value={resubmitNotes}
                    onChange={(v) => {
                      setResubmitNotes(v);
                      setResubmitError(undefined);
                    }}
                    placeholder="Describe what you changed to address the feedback."
                    rows={3}
                    required
                    error={resubmitError}
                  />

                  <div className="flex justify-end">
                    <Button variant="primary" onClick={handleResubmit} isLoading={resubmitting}>
                      <RotateCcw size={16} />
                      Resubmit
                    </Button>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </Modal>
  );
}
