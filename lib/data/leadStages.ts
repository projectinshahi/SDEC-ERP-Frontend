/**
 * Lead pipeline stages (frontend).
 *
 * Mirrors the seeded `lead_stages` table on the backend. Every lead always
 * belongs to exactly one stage. The order here drives the pipeline board
 * columns, analytics ordering and lead progression.
 */

// The default, ordered stage set. Names match the backend seed exactly.
export const LEAD_STAGES = ['New', 'Contacted', 'Interested', 'Negotiating'] as const;

export type LeadStageName = (typeof LEAD_STAGES)[number];

// Per-stage accent colours so columns/cards are easy to scan. Indexed by the
// stage's order so DB-driven stages still get a consistent colour.
export const LEAD_STAGE_THEMES = [
  { dot: 'bg-gray-400', border: 'border-t-gray-400', headerBg: 'bg-gray-50 dark:bg-gray-900/40' },
  { dot: 'bg-amber-500', border: 'border-t-amber-500', headerBg: 'bg-amber-50/40 dark:bg-amber-950/10' },
  { dot: 'bg-blue-500', border: 'border-t-blue-500', headerBg: 'bg-blue-50/40 dark:bg-blue-950/10' },
  { dot: 'bg-emerald-500', border: 'border-t-emerald-500', headerBg: 'bg-emerald-50/40 dark:bg-emerald-950/10' },
  { dot: 'bg-indigo-500', border: 'border-t-indigo-500', headerBg: 'bg-indigo-50/40 dark:bg-indigo-950/10' },
  { dot: 'bg-rose-500', border: 'border-t-rose-500', headerBg: 'bg-rose-50/40 dark:bg-rose-950/10' },
];

export const leadStageTheme = (index: number) =>
  LEAD_STAGE_THEMES[index % LEAD_STAGE_THEMES.length];
