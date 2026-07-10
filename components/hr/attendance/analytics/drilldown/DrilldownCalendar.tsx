'use client';

import type { EmployeeCalendarDay, EmployeeCalendarMonth } from '@/lib/hr/attendanceAnalytics.types';
import { cellClass, statusLabel } from './statusMeta';

/** Monday-first weekday headers; Sunday (last) is the weekly-off column. */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Monday-first column index (0=Mon … 6=Sun) for a 0=Sun..6=Sat day-of-week. */
function monIndex(dow: number): number {
  return (dow + 6) % 7;
}

const LEGEND: { status: string }[] = [
  { status: 'present' },
  { status: 'late' },
  { status: 'leave_half_day' },
  { status: 'leave_full_day' },
  { status: 'absent' },
];

function DayCell({ day }: { day: EmployeeCalendarDay }) {
  const dayNum = Number(day.date.slice(8, 10));
  const title = `${day.date}${day.status ? ` — ${statusLabel(day.status)}` : ''}`;

  // Out of the selected window: faint context only.
  if (!day.inRange) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg text-[11px] text-gray-300 dark:text-gray-700" title={day.date}>
        {dayNum}
      </div>
    );
  }
  // Recorded status → coloured cell.
  if (day.status) {
    return (
      <div className={`flex aspect-square items-center justify-center rounded-lg text-[11px] font-semibold ${cellClass(day.status)}`} title={title}>
        {dayNum}
      </div>
    );
  }
  // Weekly off / non-working day.
  if (!day.working) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100 text-[11px] text-gray-400 dark:bg-gray-800/50 dark:text-gray-500" title={`${day.date} — Weekly off`}>
        {dayNum}
      </div>
    );
  }
  // Working day still in the future → upcoming.
  if (day.isFuture) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-gray-200 text-[11px] text-gray-400 dark:border-gray-700 dark:text-gray-500" title={`${day.date} — Upcoming`}>
        {dayNum}
      </div>
    );
  }
  // Working day, past, no record → absence.
  return (
    <div className={`flex aspect-square items-center justify-center rounded-lg text-[11px] font-semibold ${cellClass('absent')}`} title={`${day.date} — Absent (no record)`}>
      {dayNum}
    </div>
  );
}

function MonthGrid({ month }: { month: EmployeeCalendarMonth }) {
  const leading = month.days.length ? monIndex(month.days[0].dow) : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{month.label}</h4>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`pb-1 text-center text-[10px] font-semibold uppercase ${i === 6 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400'}`}>
            {d}
          </div>
        ))}
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`lead-${i}`} />
        ))}
        {month.days.map((day) => (
          <DayCell key={day.date} day={day} />
        ))}
      </div>
    </div>
  );
}

export function DrilldownCalendar({ months }: { months: EmployeeCalendarMonth[] }) {
  if (months.length === 0) {
    return <div className="py-16 text-center text-sm text-gray-400">No calendar data for this period.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900/40">
        {LEGEND.map((l) => (
          <span key={l.status} className="inline-flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
            <span className={`h-3 w-3 rounded ${cellClass(l.status).split(' ')[0]}`} />
            {statusLabel(l.status)}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
          <span className="h-3 w-3 rounded bg-gray-100 dark:bg-gray-800/50" />
          Weekly off
        </span>
      </div>

      {months.map((m) => (
        <MonthGrid key={m.month} month={m} />
      ))}
    </div>
  );
}
