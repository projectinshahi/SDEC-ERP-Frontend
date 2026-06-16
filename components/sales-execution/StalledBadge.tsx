'use client';

import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/Badge';
import type { StalledStatus } from '@/lib/types/salesExecution';

/**
 * SE-021 — Stalled deal indicator.
 *
 * Renders nothing for healthy deals. For at-risk / stalled deals it shows a
 * coloured pill with the days-in-stage detail surfaced via a native tooltip.
 */
export function StalledBadge({ status }: { status: StalledStatus }) {
  if (!status || status.level === 'healthy') return null;

  const isStalled = status.level === 'stalled';
  const title = `${status.daysInStage}d in stage (threshold ${status.thresholdDays}d)`;

  return (
    <span title={title} className="inline-flex">
      <Badge variant={isStalled ? 'danger' : 'warning'}>
        <AlertTriangle className="mr-1 h-3 w-3" />
        {isStalled ? 'Stalled' : 'At Risk'}
      </Badge>
    </span>
  );
}
