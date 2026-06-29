'use client';

/** Target Management — shared status badge + value formatting helpers. */

import { Badge, type BadgeVariant } from '@/components/Badge';
import { formatINR } from '@/lib/utils/currency';
import { TARGET_STATUS_LABELS } from '@/lib/types/salesExecution';
import type { TargetStatus, TargetType, PeriodType } from '@/lib/types/salesExecution';

const STATUS_VARIANTS: Record<TargetStatus, BadgeVariant> = {
  not_started: 'default',
  in_progress: 'info',
  achieved: 'success',
  exceeded: 'success',
  missed: 'danger',
  expired: 'warning',
};

export function TargetStatusBadge({ status }: { status: TargetStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{TARGET_STATUS_LABELS[status]}</Badge>;
}

export const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const count = (n: number) => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));

/** INR for revenue targets, plain count otherwise. */
export function formatTargetValue(value: number, type: TargetType): string {
  return type === 'revenue' ? formatINR(value) : count(value);
}

export function achievementVariant(pct: number): BadgeVariant {
  const r = Math.round(pct || 0);
  if (r >= 100) return 'success';
  if (r >= 80) return 'info';
  if (r >= 50) return 'warning';
  return 'danger';
}
