'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, User as UserIcon } from 'lucide-react';
import { classNames } from '@/lib/utils';
import type { MarketingEvent } from '@/lib/api/marketingProjects';
import {
  type CalendarView, monthGrid, weekDays, toYmd, todayYmd, addDays, addMonths,
  viewTitle, DAY_NAMES, MONTH_NAMES, formatTime, layoutOverlaps, isAllDay, timeToMinutes,
} from '@/lib/marketing/calendarDates';

/**
 * MK-001.2 — the project calendar.
 *
 * Presentational: it receives the events for the visible range and reports
 * intent (a slot was clicked, an event was clicked). Fetching, scoping and
 * mutation all stay with the workspace page, so this component cannot show one
 * project's events while another is selected.
 */

const HOUR_PX = 44;
const DAY_START_HOUR = 6;          // the grid runs 06:00–23:00; earlier events
const DAY_END_HOUR = 23;           // are clamped into the first row, never hidden.
const GRID_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;

const TYPE_TONE: Record<string, string> = {
  shoot: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700',
  meeting: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700',
  deadline: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-700',
  publish: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700',
  review: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700',
  other: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600',
};
const tone = (t: string | null) => TYPE_TONE[t ?? 'other'] ?? TYPE_TONE.other;

interface Props {
  view: CalendarView;
  anchor: Date;
  events: MarketingEvent[];
  loading?: boolean;
  canWrite: boolean;
  onViewChange: (v: CalendarView) => void;
  onAnchorChange: (d: Date) => void;
  /** A blank slot was clicked — date is 'YYYY-MM-DD', time is 'HH:MM' or null. */
  onCreateAt: (date: string, time: string | null) => void;
  onOpenEvent: (event: MarketingEvent) => void;
}

export function ProjectCalendar({
  view, anchor, events, loading, canWrite, onViewChange, onAnchorChange, onCreateAt, onOpenEvent,
}: Props) {
  const byDate = useMemo(() => {
    const map: Record<string, MarketingEvent[]> = {};
    for (const e of events) (map[e.date] ??= []).push(e);
    // Timed events first, in clock order; all-day events lead each day.
    for (const list of Object.values(map)) {
      list.sort((a, b) => (timeToMinutes(a.startTime) ?? -1) - (timeToMinutes(b.startTime) ?? -1));
    }
    return map;
  }, [events]);

  const step = (dir: -1 | 1) => {
    if (view === 'month') onAnchorChange(addMonths(anchor, dir));
    else onAnchorChange(addDays(anchor, dir * (view === 'week' ? 7 : 1)));
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => step(-1)} aria-label="Previous"
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-1.5 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next"
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-1.5 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onAnchorChange(new Date())}
            className="rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Today
          </button>
          <h3 className="ml-2 text-sm font-bold text-gray-800 dark:text-gray-100">{viewTitle(view, anchor)}</h3>
        </div>

        <div role="tablist" aria-label="Calendar view" className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
          {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v}
              onClick={() => onViewChange(v)}
              className={classNames(
                'rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors',
                view === v ? 'bg-cyan-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 p-4" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : view === 'month' ? (
        <MonthView anchor={anchor} byDate={byDate} canWrite={canWrite} onCreateAt={onCreateAt} onOpenEvent={onOpenEvent} />
      ) : (
        <TimeGrid
          days={view === 'week' ? weekDays(anchor) : [anchor]}
          byDate={byDate} canWrite={canWrite} onCreateAt={onCreateAt} onOpenEvent={onOpenEvent}
        />
      )}
    </div>
  );
}

/* ── Month ──────────────────────────────────────────────────────────────────
 * Events are listed per day rather than positioned by time, so overlap is not a
 * concern here — two events at 10:00 simply appear as two rows. */
function MonthView({ anchor, byDate, canWrite, onCreateAt, onOpenEvent }: {
  anchor: Date; byDate: Record<string, MarketingEvent[]>; canWrite: boolean;
  onCreateAt: (d: string, t: string | null) => void; onOpenEvent: (e: MarketingEvent) => void;
}) {
  const days = monthGrid(anchor);
  const today = todayYmd();
  const month = anchor.getMonth();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
          {DAY_NAMES.map((d) => (
            <div key={d} className="px-2 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-gray-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const ymd = toYmd(day);
            const list = byDate[ymd] ?? [];
            const outside = day.getMonth() !== month;
            return (
              <div key={ymd}
                className={classNames(
                  'min-h-[92px] border-b border-r border-gray-100 dark:border-gray-800 p-1',
                  outside && 'bg-gray-50/60 dark:bg-gray-950/40',
                )}>
                <div className="flex items-center justify-between">
                  <span className={classNames(
                    'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-bold',
                    ymd === today ? 'bg-cyan-600 text-white'
                      : outside ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-300',
                  )}>{day.getDate()}</span>
                  {canWrite && (
                    <button type="button" onClick={() => onCreateAt(ymd, null)}
                      aria-label={`Add event on ${day.getDate()} ${MONTH_NAMES[day.getMonth()]}`}
                      className="rounded px-1 text-sm leading-none text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400">+</button>
                  )}
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {list.slice(0, 3).map((e) => (
                    <button key={e.id} type="button" onClick={() => onOpenEvent(e)}
                      title={`${e.title}${e.startTime ? ` · ${formatTime(e.startTime)}` : ''}`}
                      className={classNames('block w-full truncate rounded border px-1 py-0.5 text-left text-[10px] font-semibold', tone(e.eventType))}>
                      {e.startTime && <span className="mr-1 opacity-70">{formatTime(e.startTime)}</span>}
                      {e.title}
                    </button>
                  ))}
                  {list.length > 3 && (
                    <span className="block px-1 text-[10px] font-semibold text-gray-400">+{list.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Week / Day ─────────────────────────────────────────────────────────────
 * A real time grid. Overlapping events share the column width via lane packing
 * (see layoutOverlaps) so neither is hidden behind the other. */
function TimeGrid({ days, byDate, canWrite, onCreateAt, onOpenEvent }: {
  days: Date[]; byDate: Record<string, MarketingEvent[]>; canWrite: boolean;
  onCreateAt: (d: string, t: string | null) => void; onOpenEvent: (e: MarketingEvent) => void;
}) {
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);
  const today = todayYmd();

  return (
    <div className="overflow-x-auto">
      <div className={classNames(days.length > 1 && 'min-w-[720px]')}>
        {/* Day headers */}
        <div className="grid border-b border-gray-100 dark:border-gray-800"
          style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
          <div />
          {days.map((d) => {
            const ymd = toYmd(d);
            return (
              <div key={ymd} className="px-2 py-1.5 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{DAY_NAMES[d.getDay()]}</div>
                <div className={classNames(
                  'mx-auto mt-0.5 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1 text-xs font-bold',
                  ymd === today ? 'bg-cyan-600 text-white' : 'text-gray-700 dark:text-gray-200',
                )}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* All-day row — events without a start time never belong in the grid. */}
        {days.some((d) => (byDate[toYmd(d)] ?? []).some((e) => isAllDay(e.startTime))) && (
          <div className="grid border-b border-gray-100 dark:border-gray-800"
            style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
            <div className="px-1 py-1 text-right text-[10px] font-semibold uppercase text-gray-400">All day</div>
            {days.map((d) => (
              <div key={toYmd(d)} className="space-y-0.5 border-l border-gray-100 dark:border-gray-800 p-1">
                {(byDate[toYmd(d)] ?? []).filter((e) => isAllDay(e.startTime)).map((e) => (
                  <button key={e.id} type="button" onClick={() => onOpenEvent(e)}
                    className={classNames('block w-full truncate rounded border px-1 py-0.5 text-left text-[10px] font-semibold', tone(e.eventType))}>
                    {e.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Time grid */}
        <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
          {/* Hour labels */}
          <div>
            {hours.map((h) => (
              <div key={h} style={{ height: HOUR_PX }} className="relative">
                <span className="absolute -top-1.5 right-1 text-[10px] font-semibold text-gray-400">
                  {h % 12 === 0 ? 12 : h % 12}{h < 12 ? 'am' : 'pm'}
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const ymd = toYmd(day);
            const timed = (byDate[ymd] ?? []).filter((e) => !isAllDay(e.startTime));
            const positioned = layoutOverlaps(timed, (e) => e.startTime, (e) => e.endTime);
            return (
              <div key={ymd} className="relative border-l border-gray-100 dark:border-gray-800">
                {hours.map((h) => (
                  <button key={h} type="button" disabled={!canWrite}
                    onClick={() => onCreateAt(ymd, `${String(h).padStart(2, '0')}:00`)}
                    aria-label={`Add event at ${h}:00 on ${ymd}`}
                    style={{ height: HOUR_PX }}
                    className="block w-full border-b border-gray-50 dark:border-gray-800/60 hover:bg-cyan-50/60 dark:hover:bg-cyan-900/10 disabled:hover:bg-transparent"
                  />
                ))}
                {positioned.map(({ event, startMin, endMin, lane, lanes }) => {
                  // Clamp into the visible window rather than dropping the event.
                  const top = Math.max(0, startMin - DAY_START_HOUR * 60);
                  const height = Math.max(18, Math.min(endMin, DAY_END_HOUR * 60) - Math.max(startMin, DAY_START_HOUR * 60));
                  return (
                    <button key={event.id} type="button" onClick={() => onOpenEvent(event)}
                      title={`${event.title} · ${formatTime(event.startTime)}–${formatTime(event.endTime)}`}
                      className={classNames(
                        'absolute overflow-hidden rounded border px-1 py-0.5 text-left text-[10px] font-semibold shadow-sm',
                        tone(event.eventType),
                      )}
                      style={{
                        top: (top / GRID_MINUTES) * (hours.length * HOUR_PX),
                        height: (height / GRID_MINUTES) * (hours.length * HOUR_PX),
                        left: `calc(${(lane / lanes) * 100}% + 2px)`,
                        width: `calc(${100 / lanes}% - 4px)`,
                      }}>
                      <span className="block truncate">{event.title}</span>
                      <span className="block truncate opacity-70">{formatTime(event.startTime)}</span>
                      {event.assigneeName && (
                        <span className="flex items-center gap-0.5 truncate opacity-70">
                          <UserIcon className="h-2.5 w-2.5" />{event.assigneeName}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CalendarEmptyState({ canWrite, onCreate }: { canWrite: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-800 py-10 text-center">
      <CalendarDays className="h-8 w-8 text-gray-300" />
      <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">No events scheduled yet</p>
      <p className="mt-0.5 text-xs text-gray-400">
        {canWrite ? 'Click any day or time slot to add one.' : 'Events added to this project will appear here.'}
      </p>
      {canWrite && (
        <button type="button" onClick={onCreate}
          className="mt-3 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700">
          Add event
        </button>
      )}
    </div>
  );
}
