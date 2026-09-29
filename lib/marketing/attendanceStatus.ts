/**
 * THE Marketing attendance status presentation — one mapping, used by the daily
 * page, the monthly calendar and the summary report.
 *
 * Extracted from the daily attendance page so a third surface cannot introduce a
 * fourth colour scheme. The status KEYS and their human labels are served by the
 * backend (marketingAttendance.service); this file only decides how each one
 * looks, which is a purely presentational concern.
 */

/** Statuses a record can hold. Mirrors the backend enum. */
export const ATTENDANCE_STATUS_KEYS = ['present', 'absent', 'half_day', 'on_leave'] as const;

/**
 * Calendar-cell kinds the month endpoint returns. The four statuses above plus
 * three NON-STATUS kinds that exist so a day can be shown as "nothing to report"
 * rather than being misreported as an absence.
 */
export type DayKind =
  | 'present' | 'absent' | 'half_day' | 'on_leave'
  | 'holiday' | 'future' | 'before_join';

/** Badge/pill classes — the same tones the daily attendance page already uses. */
export const STATUS_TONE: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  absent: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  half_day: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  on_leave: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  holiday: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  // A future day and a pre-join day are deliberately near-invisible: they carry
  // no information and must never read as an absence.
  future: 'bg-transparent text-gray-300 dark:text-gray-700',
  before_join: 'bg-transparent text-gray-300 dark:text-gray-700',
};

/** Solid fill for calendar cells, where a pill would be too heavy. */
export const DAY_FILL: Record<string, string> = {
  present: 'bg-emerald-500/85 text-white',
  absent: 'bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  half_day: 'bg-violet-500/85 text-white',
  on_leave: 'bg-blue-500/85 text-white',
  holiday: 'bg-amber-400/80 text-amber-950',
  future: 'bg-transparent text-gray-300 dark:text-gray-700',
  before_join: 'bg-transparent text-gray-300 dark:text-gray-700',
};

export const DAY_LABEL: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  half_day: 'Half-Day',
  on_leave: 'On Leave',
  holiday: 'Holiday',
  future: 'Upcoming',
  before_join: 'Before joining',
};

/** Kinds that carry real information and belong in a legend. */
export const LEGEND_KINDS: DayKind[] = ['present', 'half_day', 'absent', 'on_leave', 'holiday'];

/** A day with nothing to report — rendered blank, never as an absence. */
export const isBlankDay = (kind: string): boolean => kind === 'future' || kind === 'before_join';

/* ── Month helpers ──────────────────────────────────────────────────────────
 * Pure string maths on 'YYYY-MM'. No Date object is constructed for a calendar
 * month, so no timezone can shift a month boundary. */

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const zero = y * 12 + (m - 1) + delta;
  return `${Math.floor(zero / 12)}-${pad((zero % 12) + 1)}`;
}

export function monthTitle(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** Weekday index (0=Sun) of the 1st, computed in UTC so it cannot drift. */
export function firstWeekdayOfMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
}

/** 'YYYY-MM-DD' → day number, without building a local Date. */
export const dayOfMonth = (ymd: string): number => Number(ymd.slice(8, 10));

export const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
