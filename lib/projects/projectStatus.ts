/**
 * Project lifecycle status — the single source of truth for the manual status
 * system (Edit Project modal, status badges, tab grouping).
 *
 * Statuses are stored as canonical lowercase hyphen tokens (e.g. 'on-hold',
 * 'at-risk') in projects.status. Display labels and badge colors are derived
 * from these tokens so they stay consistent everywhere in the app.
 */

export type ProjectStatus =
  | 'active'
  | 'on-track'
  | 'delayed'
  | 'on-hold'
  | 'completed'
  | 'archived'
  | 'planning'
  | 'at-risk'
  | 'cancelled';

export interface ProjectStatusMeta {
  value: ProjectStatus;
  label: string;
  /** Short definition shown as a hint in the editor. */
  description: string;
  /** Tailwind classes for the status badge (light + dark). */
  badgeClass: string;
}

// Shared badge tones — mirror the Master Dashboard palette so a status reads the
// same wherever it appears (consistent colors across the application).
const TONE = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  violet: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
  slate: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
} as const;

/** Ordered list — drives the Edit modal dropdown (order matches the spec). */
export const PROJECT_STATUSES: ProjectStatusMeta[] = [
  { value: 'active', label: 'Active', description: 'Currently being worked on; not completed, archived or cancelled.', badgeClass: TONE.blue },
  { value: 'on-track', label: 'On Track', description: 'Active and progressing as planned without major issues.', badgeClass: TONE.emerald },
  { value: 'delayed', label: 'Delayed', description: 'Behind schedule or expected to miss milestones.', badgeClass: TONE.rose },
  { value: 'on-hold', label: 'On Hold', description: 'Temporarily paused (client, budget, resource or dependency blockers).', badgeClass: TONE.violet },
  { value: 'completed', label: 'Completed', description: 'All agreed scope delivered and approved.', badgeClass: TONE.emerald },
  { value: 'archived', label: 'Archived', description: 'Closed and moved to storage; no further work expected.', badgeClass: TONE.slate },
  { value: 'planning', label: 'Planning', description: 'Approved but execution has not started.', badgeClass: TONE.indigo },
  { value: 'at-risk', label: 'At Risk', description: 'Running but showing warning signs (delays, overruns, resources).', badgeClass: TONE.amber },
  { value: 'cancelled', label: 'Cancelled', description: 'Terminated before completion.', badgeClass: TONE.rose },
];

const BY_VALUE: Record<ProjectStatus, ProjectStatusMeta> = PROJECT_STATUSES.reduce(
  (acc, s) => { acc[s.value] = s; return acc; },
  {} as Record<ProjectStatus, ProjectStatusMeta>,
);

// Maps every stored spelling / legacy synonym onto a canonical status token.
const SYNONYMS: Record<string, ProjectStatus> = {
  active: 'active', 'in-progress': 'active', ongoing: 'active', inprogress: 'active',
  'on-track': 'on-track', ontrack: 'on-track',
  delayed: 'delayed', overdue: 'delayed',
  'on-hold': 'on-hold', onhold: 'on-hold', hold: 'on-hold', paused: 'on-hold',
  completed: 'completed', complete: 'completed', done: 'completed', closed: 'completed',
  archived: 'archived', archive: 'archived',
  planning: 'planning', planned: 'planning', new: 'planning', draft: 'planning', backlog: 'planning', todo: 'planning', 'not-started': 'planning',
  'at-risk': 'at-risk', atrisk: 'at-risk', risk: 'at-risk',
  cancelled: 'cancelled', canceled: 'cancelled',
};

/** Normalise any stored/raw status string to a canonical token (defaults to 'active'). */
export function normalizeProjectStatus(raw?: string | null): ProjectStatus {
  const key = String(raw ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  return SYNONYMS[key] ?? (BY_VALUE[key as ProjectStatus] ? (key as ProjectStatus) : 'active');
}

export const projectStatusLabel = (raw?: string | null): string => BY_VALUE[normalizeProjectStatus(raw)].label;
export const projectStatusBadgeClass = (raw?: string | null): string => BY_VALUE[normalizeProjectStatus(raw)].badgeClass;

export type ProjectTab = 'active' | 'on-hold' | 'archived';

/**
 * Which tab a project belongs to (status-driven). 'cancelled' projects fall into
 * no tab — they're excluded from Active, On Hold and Archived per spec.
 */
export function projectTabBucket(p: { status?: string | null; is_archived?: boolean | null }): ProjectTab | 'cancelled' {
  const s = normalizeProjectStatus(p.status);
  if (p.is_archived || s === 'archived') return 'archived';
  if (s === 'on-hold') return 'on-hold';
  if (s === 'cancelled') return 'cancelled';
  return 'active'; // active, on-track, delayed, planning, at-risk, completed
}
