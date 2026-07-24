/**
 * Lead pipeline stages (frontend).
 *
 * Mirrors the seeded `lead_stages` table on the backend. Every lead always
 * belongs to exactly one stage. The order here drives the pipeline board
 * columns, analytics ordering and lead progression.
 */

// The standardized 8-stage sales funnel. Names match the backend seed exactly.
// Stages are fully DB-managed at runtime, so this is only a typing fallback — the
// live board always renders the stages returned by the API.
export const LEAD_STAGES = [
  'NQL', // Not-Qualified Lead
  'MQL', // Marketing-Qualified Lead
  'SQL', // Sales-Qualified Lead
  'PQL', // Product-Qualified Lead
  'SAL', // Sales-Accepted Lead
  'WON',
  'HOLD',
  'LOST',
] as const;

export type LeadStageName = (typeof LEAD_STAGES)[number];

// Per-stage accent colours so columns/cards are easy to scan. Indexed by the stage's
// order so DB-driven stages still get a consistent colour; the funnel colours run
// cool→warm and end on WON (green) / HOLD (amber) / LOST (red).
export const LEAD_STAGE_THEMES = [
  { dot: 'bg-slate-400', border: 'border-t-slate-400', headerBg: 'bg-slate-50 dark:bg-slate-900/40' },      // NQL
  { dot: 'bg-sky-500', border: 'border-t-sky-500', headerBg: 'bg-sky-50/40 dark:bg-sky-950/10' },           // MQL
  { dot: 'bg-blue-500', border: 'border-t-blue-500', headerBg: 'bg-blue-50/40 dark:bg-blue-950/10' },       // SQL
  { dot: 'bg-indigo-500', border: 'border-t-indigo-500', headerBg: 'bg-indigo-50/40 dark:bg-indigo-950/10' },// PQL
  { dot: 'bg-violet-500', border: 'border-t-violet-500', headerBg: 'bg-violet-50/40 dark:bg-violet-950/10' },// SAL
  { dot: 'bg-emerald-500', border: 'border-t-emerald-500', headerBg: 'bg-emerald-50/40 dark:bg-emerald-950/10' }, // WON
  { dot: 'bg-amber-500', border: 'border-t-amber-500', headerBg: 'bg-amber-50/40 dark:bg-amber-950/10' },    // HOLD
  { dot: 'bg-rose-500', border: 'border-t-rose-500', headerBg: 'bg-rose-50/40 dark:bg-rose-950/10' },        // LOST
];

export const leadStageTheme = (index: number) =>
  LEAD_STAGE_THEMES[index % LEAD_STAGE_THEMES.length];
