'use client';

import { ratingForScore } from '@/lib/data/leadRating';

interface LeadHealthBadgeProps {
  score: number | null | undefined;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const CONFIG = {
  Hot: { dot: '🟢', label: 'Hot Lead', classes: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' },
  Warm: { dot: '🟡', label: 'Warm Lead', classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' },
  Cold: { dot: '🔵', label: 'Cold Lead', classes: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' },
  'Not Scored': { dot: '⚪', label: 'Not Scored', classes: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
} as const;

/**
 * Lead-health indicator (Hot / Warm / Cold) derived from the lead score — the
 * AI-like qualification signal used across cards and the lead profile.
 */
export function LeadHealthBadge({ score, size = 'sm', showLabel = true }: LeadHealthBadgeProps) {
  const rating = ratingForScore(score);
  const cfg = CONFIG[rating];
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${pad} ${cfg.classes}`}>
      <span aria-hidden>{cfg.dot}</span>
      {showLabel ? cfg.label : rating}
    </span>
  );
}
