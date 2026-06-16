/**
 * Deal pipeline stages (frontend). Mirrors the seeded `deal_stages` table.
 * Every deal always belongs to exactly one stage. Order drives the deal board.
 */

export const DEAL_STAGES = [
  'Proposal Sent', 'Demo Done', 'Contract Review', 'Negotiation', 'Closed Won', 'Closed Lost',
] as const;

export type DealStageName = (typeof DEAL_STAGES)[number];

// Per-stage accent colours so columns/cards are easy to scan.
export const DEAL_STAGE_THEMES = [
  { dot: 'bg-blue-500', border: 'border-t-blue-500' },
  { dot: 'bg-indigo-500', border: 'border-t-indigo-500' },
  { dot: 'bg-amber-500', border: 'border-t-amber-500' },
  { dot: 'bg-violet-500', border: 'border-t-violet-500' },
  { dot: 'bg-emerald-500', border: 'border-t-emerald-500' },
  { dot: 'bg-rose-500', border: 'border-t-rose-500' },
];

export const dealStageTheme = (index: number) =>
  DEAL_STAGE_THEMES[index % DEAL_STAGE_THEMES.length];
