/**
 * Lead score → rating display helpers. Mirrors the backend `ratingFor` thresholds
 * (Hot ≥ 80, Warm ≥ 50, Cold ≥ 1, otherwise Not Scored).
 */

import type { BadgeVariant } from '@/components/Badge';
import type { LeadRating } from '@/lib/types/leadQualification';

export const ratingForScore = (score: number | null | undefined): LeadRating => {
  const s = Number(score);
  if (!Number.isFinite(s) || s <= 0) return 'Not Scored';
  if (s >= 80) return 'Hot';
  if (s >= 50) return 'Warm';
  return 'Cold';
};

export const ratingVariant = (rating: LeadRating): BadgeVariant => {
  switch (rating) {
    case 'Hot': return 'danger';
    case 'Warm': return 'warning';
    case 'Cold': return 'info';
    default: return 'default';
  }
};

/** Score color class for inline numeric display. */
export const scoreColorClass = (score: number | null | undefined): string => {
  const s = Number(score);
  if (!Number.isFinite(s) || s <= 0) return 'text-gray-400';
  if (s >= 80) return 'text-rose-600 dark:text-rose-400';
  if (s >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-blue-600 dark:text-blue-400';
};

/** Display string for a score — "Not Scored" instead of 0/blank. */
export const formatScore = (score: number | null | undefined): string => {
  const s = Number(score);
  if (!Number.isFinite(s) || s <= 0) return 'Not Scored';
  return String(Math.round(s));
};
