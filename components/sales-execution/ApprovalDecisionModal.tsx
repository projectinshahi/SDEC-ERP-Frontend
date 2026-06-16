'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, RotateCcw, XCircle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TextareaField } from '@/components/ui/TextareaField';
import { useToast } from '@/lib/hooks/useToast';
import { decideApproval } from '@/lib/api/documentApprovals';
import type { ApprovalDecision, DocumentApproval } from '@/lib/types/salesExecution';

interface ApprovalDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  approval: DocumentApproval | null;
  onDecided: () => void;
}

const DECISIONS: {
  key: ApprovalDecision;
  label: string;
  variant: 'success' | 'danger' | 'secondary';
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { key: 'approve', label: 'Approve', variant: 'success', icon: CheckCircle2 },
  { key: 'reject', label: 'Reject', variant: 'danger', icon: XCircle },
  { key: 'rework', label: 'Request Rework', variant: 'secondary', icon: RotateCcw },
];

/**
 * SE-022 — manager review modal. Approve / Reject / Request Rework.
 * Comments are mandatory for reject and rework (validated client-side too).
 */
export function ApprovalDecisionModal({ isOpen, onClose, approval, onDecided }: ApprovalDecisionModalProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState<ApprovalDecision | null>(null);

  useEffect(() => {
    if (isOpen) {
      setComments('');
      setError(undefined);
      setPending(null);
    }
  }, [isOpen, approval?.id]);

  if (!approval) return null;

  const isReviewable = approval.status === 'pending';

  const handleDecide = async (decision: ApprovalDecision) => {
    if (!isReviewable) return;
    const trimmed = comments.trim();
    if ((decision === 'reject' || decision === 'rework') && !trimmed) {
      setError('Comments are required to reject or request rework.');
      toast('Please add comments before rejecting or requesting rework.', 'warning');
      return;
    }
    try {
      setPending(decision);
      await decideApproval(approval.id, decision, trimmed || undefined);
      const verb =
        decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'sent back for rework';
      toast(`Document ${verb}`, 'success');
      onDecided();
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to record decision', 'error');
    } finally {
      setPending(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Document" size="lg">
      <div className="space-y-5">
        {/* Document summary */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {approval.docType}
            </span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{approval.version}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-gray-100">{approval.title}</h3>
          {approval.changeNotes && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Change Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                {approval.changeNotes}
              </p>
            </div>
          )}
          {approval.comments && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Submitter Comments</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                {approval.comments}
              </p>
            </div>
          )}
          <a
            href={approval.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <ExternalLink size={15} />
            Open document
          </a>
        </div>

        {!isReviewable ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
            This document is no longer pending and cannot be reviewed.
          </p>
        ) : (
          <>
            <TextareaField
              label="Manager Comments"
              id="approval-decision-comments"
              value={comments}
              onChange={(v) => {
                setComments(v);
                setError(undefined);
              }}
              placeholder="Required to reject or request rework; optional when approving."
              rows={3}
              error={error}
            />

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
              {DECISIONS.map(({ key, label, variant, icon: Icon }) => (
                <Button
                  key={key}
                  variant={variant}
                  onClick={() => handleDecide(key)}
                  isLoading={pending === key}
                  disabled={pending !== null && pending !== key}
                >
                  <Icon size={16} />
                  {label}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
