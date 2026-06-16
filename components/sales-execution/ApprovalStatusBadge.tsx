'use client';

import { Badge } from '@/components/Badge';
import type { ApprovalStatus } from '@/lib/types/salesExecution';

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
  sentToClient?: boolean;
}

const STATUS_MAP: Record<
  ApprovalStatus,
  { variant: 'default' | 'success' | 'warning' | 'danger' | 'info'; label: string }
> = {
  pending: { variant: 'warning', label: 'Pending Approval' },
  approved: { variant: 'success', label: 'Approved' },
  rejected: { variant: 'danger', label: 'Rejected' },
  rework: { variant: 'info', label: 'Rework Requested' },
};

/**
 * SE-022 — renders the status badge for a document approval, plus an
 * optional "Sent to Client" badge once the document has been dispatched.
 */
export function ApprovalStatusBadge({ status, sentToClient }: ApprovalStatusBadgeProps) {
  const config = STATUS_MAP[status];

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge variant={config.variant}>{config.label}</Badge>
      {sentToClient && <Badge variant="success">Sent to Client</Badge>}
    </span>
  );
}
