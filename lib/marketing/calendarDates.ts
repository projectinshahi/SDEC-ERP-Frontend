/**
 * MK-001.2 — calendar date maths.
 *
 * THE RULE: a calendar day is a LOCAL wall-clock day and is carried as a
 * 'YYYY-MM-DD' string. `toIso`/`Date.toISOString()` are never used to derive
 * one, because they convert to UTC first — which is exactly how a user in a
 * UTC+X timezone picks 15 September and stores 14 September.
 *
 * Dates arriving from the API are already 'YYYY-MM-DD' (the server slices a
 * DATE column stored at UTC midnight). They are parsed back with `fromYmd`,
 * which builds a LOCAL midnight Date, so the string round-trips unchanged.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Local Date → 'YYYY-MM-DD'. Never toISOString: that would shift the day. */
export const toYmd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 'YYYY-MM-DD' → local midnight Date. Never new Date(str): that parses as UTC. */
export const fromYmd = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

export const todayYmd = (): string => toYmd(new Date());

export const addDays = (d: Date, n: number): Date => {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + n);
  return out;
};

export const addMonths = (d: Date, n: number): Date => {
  // Anchored on the 1st so stepping from the 31st never skips a short month.
  const out = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return out;
};

export const startOfWeek = (d: Date): Date => addDays(d, -d.getDay());   // Sunday-first
export const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);

export const isSameYmd = (a: Date, b: Date): boolean => toYmd(a) === toYmd(b);

export type CalendarView = 'month' | 'week' | 'day';

/**
 * The inclusive 'YYYY-MM-DD' range a view covers — used to narrow the fetch.
 * Month view includes the leading/trailing days that fill the 6x7 grid, so
 * events shown in those cells are actually loaded.
 */
export function viewRange(view: CalendarView, anchor: Date): { from: string; to: string } {
  if (view === 'day') return { from: toYmd(anchor), to: toYmd(anchor) };
  if (view === 'week') {
    const s = startOfWeek(anchor);
    return { from: toYmd(s), to: toYmd(addDays(s, 6)) };
  }
  const gridStart = startOfWeek(startOfMonth(anchor));
  return { from: toYmd(gridStart), to: toYmd(addDays(gridStart, 41)) };
}

/** The 42 days of a month grid (6 weeks), starting on the Sunday on/before the 1st. */
export function monthGrid(anchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(anchor));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** 'HH:MM' → minutes since midnight; null for an all-day event. */
export const timeToMinutes = (t: string | null | undefined): number | null => {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** 'HH:MM' → '9:30 AM'. Display only. */
export const formatTime = (t: string | null | undefined): string => {
  const mins = timeToMinutes(t);
  if (mins === null) return '';
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad(m)} ${h24 < 12 ? 'AM' : 'PM'}`;
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function viewTitle(view: CalendarView, anchor: Date): string {
  if (view === 'day') {
    return `${DAY_NAMES[anchor.getDay()]} ${anchor.getDate()} ${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }
  if (view === 'week') {
    const s = startOfWeek(anchor);
    const e = addDays(s, 6);
    const sameMonth = s.getMonth() === e.getMonth();
    return sameMonth
      ? `${s.getDate()}–${e.getDate()} ${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()}`
      : `${s.getDate()} ${MONTH_NAMES[s.getMonth()]} – ${e.getDate()} ${MONTH_NAMES[e.getMonth()]} ${e.getFullYear()}`;
  }
  return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
}

/* ── Overlap layout ──────────────────────────────────────────────────────────
 * Timed events that overlap are laid out side by side rather than stacked on
 * top of each other, so neither one is hidden behind the other. Events are
 * packed into lanes: each event takes the first lane whose previous event has
 * already ended. `lanes` is the width divisor for that cluster. */

export interface Positioned<T> {
  event: T;
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
}

export function layoutOverlaps<T>(
  events: T[],
  getStart: (e: T) => string | null,
  getEnd: (e: T) => string | null,
  defaultMinutes = 60,
): Positioned<T>[] {
  const timed = events
    .map((event) => {
      const startMin = timeToMinutes(getStart(event));
      if (startMin === null) return null;
      const rawEnd = timeToMinutes(getEnd(event));
      // A stored end is always after the start (the server enforces it); this
      // floor only guards a legacy row and keeps the block visible.
      const endMin = rawEnd !== null && rawEnd > startMin ? rawEnd : startMin + defaultMinutes;
      return { event, startMin, endMin };
    })
    .filter((x): x is { event: T; startMin: number; endMin: number } => x !== null)
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const out: Positioned<T>[] = [];
  let cluster: Positioned<T>[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const lanes = cluster.reduce((max, c) => Math.max(max, c.lane + 1), 0);
    for (const c of cluster) out.push({ ...c, lanes });
    cluster = [];
    clusterEnd = -1;
  };

  for (const item of timed) {
    // A gap means the previous cluster is closed — its width divisor is final.
    if (cluster.length && item.startMin >= clusterEnd) flush();

    const taken = new Set(cluster.filter((c) => c.endMin > item.startMin).map((c) => c.lane));
    let lane = 0;
    while (taken.has(lane)) lane++;

    cluster.push({ ...item, lane, lanes: lane + 1 });
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  if (cluster.length) flush();

  return out;
}

/** All-day events (no start time) — rendered in their own row, not the grid. */
export const isAllDay = (startTime: string | null | undefined): boolean => timeToMinutes(startTime) === null;
