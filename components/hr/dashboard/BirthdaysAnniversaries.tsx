'use client';

import { useEffect, useState } from 'react';
import { Gift, PartyPopper, PackageOpen } from 'lucide-react';
import { fetchEmployees } from '@/lib/api/hr';

interface PersonEvent {
  id: number;
  name: string;
  type: 'anniversary';
  label: string;   // "Today" | "Tomorrow" | "in N days"
  detail: string;  // "X years at SKPC"
}

interface BirthdaysAnniversariesProps {
  loading?: boolean;
}

const INITIALS_COLORS = [
  'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
];

/** Compute upcoming work anniversaries within next 30 days (inclusive today) */
function computeAnniversaries(employees: { id: number; name: string; join_date: string }[]): PersonEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events: PersonEvent[] = [];

  for (const emp of employees) {
    if (!emp.join_date) continue;
    const joined = new Date(emp.join_date);
    if (isNaN(joined.getTime())) continue;

    // Set anniversary this year to today's year
    const anniversary = new Date(today.getFullYear(), joined.getMonth(), joined.getDate());
    // If already passed this year, advance to next year
    if (anniversary < today) anniversary.setFullYear(today.getFullYear() + 1);

    const diffMs = anniversary.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 30) continue;

    const years = anniversary.getFullYear() - joined.getFullYear();
    let label: string;
    if (diffDays === 0) label = 'Today';
    else if (diffDays === 1) label = 'Tomorrow';
    else {
      const d = anniversary.getDate();
      const m = anniversary.toLocaleString('en-IN', { month: 'short' });
      label = `${d} ${m}`;
    }

    events.push({
      id: emp.id,
      name: emp.name,
      type: 'anniversary',
      label,
      detail: `${years} year${years !== 1 ? 's' : ''} at SKPC`,
    });
  }

  // Sort: Today first, then by upcoming date
  return events.sort((a, b) => {
    if (a.label === 'Today') return -1;
    if (b.label === 'Today') return 1;
    if (a.label === 'Tomorrow') return -1;
    if (b.label === 'Tomorrow') return 1;
    return 0;
  });
}

export function BirthdaysAnniversaries({ loading: parentLoading = false }: BirthdaysAnniversariesProps) {
  const [events, setEvents] = useState<PersonEvent[]>([]);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    setLocalLoading(true);
    fetchEmployees()
      .then((emps) => {
        const result = computeAnniversaries(
          emps.map((e) => ({ id: e.id, name: e.name, join_date: e.join_date }))
        );
        setEvents(result);
      })
      .catch(() => setEvents([]))
      .finally(() => setLocalLoading(false));
  }, []);

  const loading = parentLoading || localLoading;
  const todayCount = events.filter((e) => e.label === 'Today').length;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-pink-50 dark:bg-pink-950/40 flex items-center justify-center text-pink-600 dark:text-pink-400">
              <Gift size={14} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Work Anniversaries</h2>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-9">Next 30 days · based on join date</p>
        </div>
        {todayCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/30 px-2.5 py-1 rounded-full border border-pink-100 dark:border-pink-900/40">
            <PartyPopper size={10} />
            {todayCount} Today
          </span>
        )}
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                </div>
                <div className="h-5 w-14 bg-gray-100 dark:bg-gray-800 rounded-full" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <PackageOpen size={28} className="text-gray-300 dark:text-gray-700" />
            <p className="text-sm font-semibold text-gray-400 dark:text-gray-600">No anniversaries in the next 30 days</p>
          </div>
        ) : (
          events.map((event, idx) => {
            const colorClass = INITIALS_COLORS[idx % INITIALS_COLORS.length];
            const initial = event.name.charAt(0).toUpperCase();
            const isToday = event.label === 'Today';
            return (
              <div
                key={event.id}
                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                  isToday
                    ? 'border-pink-100 dark:border-pink-900/30 bg-pink-50/60 dark:bg-pink-950/15'
                    : 'border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/10'
                }`}
              >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-xl text-sm font-black flex items-center justify-center shrink-0 ${colorClass}`}>
                  {initial}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-gray-800 dark:text-gray-200 truncate">{event.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <PartyPopper size={10} className="text-violet-400" />
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">{event.detail}</span>
                  </div>
                </div>

                {/* Date badge */}
                <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${
                  isToday
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {event.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
