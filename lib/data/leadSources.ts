/**
 * Lead Source tracking constants (frontend).
 *
 * Mirrors the backend controlled list in `src/constants/leadSource.ts`. Every
 * lead records where it originated. `manual` is the system fallback used when a
 * source cannot be determined; such leads are flagged for review.
 */

import type { BadgeVariant } from '@/components/Badge';

// Channels a lead can explicitly originate from. `import` is reserved for the
// CSV import workflow; the rest are pickable when capturing a lead by hand.
export const PRIMARY_LEAD_SOURCES = [
  'website', 'phone', 'email', 'whatsapp', 'meta_ads', 'referral', 'face_to_face', 'other', 'import',
] as const;

// Fallback used when no source can be determined.
export const FALLBACK_LEAD_SOURCE = 'manual';

// The complete controlled list of accepted source values (stored lower-cased).
export const LEAD_SOURCES = [...PRIMARY_LEAD_SOURCES, FALLBACK_LEAD_SOURCE] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

// Human-readable labels for display.
export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website: 'Website',
  phone: 'Phone',
  email: 'Email',
  whatsapp: 'WhatsApp',
  meta_ads: 'Meta Ads',
  referral: 'Referral',
  face_to_face: 'Face-to-Face',
  other: 'Other',
  import: 'Import',
  manual: 'Manual',
};

// Badge colour per source so origins are easy to scan in the listing.
export const LEAD_SOURCE_BADGE_VARIANTS: Record<LeadSource, BadgeVariant> = {
  website: 'info',
  phone: 'success',
  email: 'warning',
  whatsapp: 'success',
  meta_ads: 'info',
  referral: 'warning',
  face_to_face: 'info',
  other: 'default',
  import: 'default',
  manual: 'danger',
};

// Sources a user may pick when creating/editing a lead by hand (the New/Edit
// Lead modals). `import` is reserved for the CSV import workflow and `manual`
// is the system fallback, so neither is offered here.
export const SELECTABLE_LEAD_SOURCES: LeadSource[] = [
  'phone', 'email', 'website', 'whatsapp', 'meta_ads', 'referral', 'face_to_face', 'other',
];

export const formatLeadSource = (source: string | null | undefined): string => {
  if (!source) return LEAD_SOURCE_LABELS.manual;
  const key = source.toLowerCase() as LeadSource;
  return LEAD_SOURCE_LABELS[key] ?? source;
};

export const leadSourceVariant = (source: string | null | undefined): BadgeVariant => {
  if (!source) return 'default';
  const key = source.toLowerCase() as LeadSource;
  return LEAD_SOURCE_BADGE_VARIANTS[key] ?? 'default';
};
