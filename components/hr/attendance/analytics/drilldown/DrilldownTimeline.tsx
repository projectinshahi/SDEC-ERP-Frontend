'use client';

import { CalendarX2 } from 'lucide-react';
import type { EmployeeTimelineEntry } from '@/lib/hr/attendanceAnalytics.types';
import { chipClass, dotClass, statusLabel, prettyLabel, formatDateLong } from './statusMeta';

export function DrilldownTimeline({ entries }: { entries: EmployeeTimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800/60">
          <CalendarX2 size={22} />
        </div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">No attendance records</p>
        <p className="mt-1 text-xs text-gray-400">Nothing was recorded for this employee in the selected period.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li
          key={e.date}
          className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotClass(e.status)}`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatDateLong(e.date)}</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${chipClass(e.status)}`}>
                {statusLabel(e.status)}
              </span>
            </div>
            {e.leaveType && (
              <p className="mt-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                Leave type: {prettyLabel(e.leaveType)}
              </p>
            )}
            {e.notes && (
              <p className="mt-1 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                <span className="font-semibold text-gray-400">HR Note: </span>
                {e.notes}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
