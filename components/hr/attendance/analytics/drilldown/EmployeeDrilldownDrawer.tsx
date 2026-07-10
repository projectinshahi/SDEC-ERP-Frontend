'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  X,
  Loader2,
  UserRound,
  LayoutDashboard,
  CalendarDays,
  ListChecks,
  Umbrella,
  Lightbulb,
  AlertCircle,
} from 'lucide-react';
import { fetchEmployeeDetail } from '@/lib/api/hrAnalytics';
import type { EmployeeDetailResponse } from '@/lib/hr/attendanceAnalytics.types';
import { DrilldownOverview } from './DrilldownOverview';
import { DrilldownCalendar } from './DrilldownCalendar';
import { DrilldownTimeline } from './DrilldownTimeline';
import { DrilldownLeaveBreakdown } from './DrilldownLeaveBreakdown';
import { DrilldownInsights } from './DrilldownInsights';

type TabKey = 'overview' | 'calendar' | 'timeline' | 'leave' | 'insights';

const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
  { key: 'timeline', label: 'Timeline', icon: ListChecks },
  { key: 'leave', label: 'Leave', icon: Umbrella },
  { key: 'insights', label: 'Insights', icon: Lightbulb },
];

export function EmployeeDrilldownDrawer({
  employeeId,
  from,
  to,
  onClose,
}: {
  employeeId: number | null;
  from?: string;
  to?: string;
  onClose: () => void;
}) {
  const open = employeeId != null;
  const [data, setData] = useState<EmployeeDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('overview');
  const [shown, setShown] = useState(false); // drives the slide-in transition

  const load = useCallback(async () => {
    if (employeeId == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEmployeeDetail(employeeId, { from, to });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  }, [employeeId, from, to]);

  // Fetch + reset to Overview whenever a (new) employee is opened.
  useEffect(() => {
    if (open) {
      setTab('overview');
      load();
    } else {
      setData(null);
      setError(null);
    }
  }, [open, load]);

  // Slide-in on open.
  useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/60 ${shown ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Panel — right side on desktop, full screen on mobile */}
      <div
        className={`relative z-10 flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-gray-950 sm:max-w-xl lg:max-w-2xl ${shown ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800/70">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
              <UserRound size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-gray-900 dark:text-white">
                {data ? data.profile.name : 'Employee Details'}
              </h2>
              <p className="truncate text-[11px] text-gray-400">
                {data
                  ? [data.profile.employeeCode, data.profile.department, data.profile.designation]
                      .filter(Boolean)
                      .join(' · ')
                  : 'Attendance drill-down'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0.5 overflow-x-auto border-b border-gray-100 px-3 dark:border-gray-800/70">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition ${
                  active
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-5 dark:bg-gray-950">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-950/20">
                <AlertCircle size={22} />
              </div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Could not load details</p>
              <p className="mt-1 max-w-xs text-xs text-gray-500">{error}</p>
              <button
                onClick={load}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Retry
              </button>
            </div>
          ) : data ? (
            <>
              {tab === 'overview' && <DrilldownOverview profile={data.profile} metrics={data.metrics} />}
              {tab === 'calendar' && <DrilldownCalendar months={data.calendar} />}
              {tab === 'timeline' && <DrilldownTimeline entries={data.timeline} />}
              {tab === 'leave' && <DrilldownLeaveBreakdown data={data.leaveBreakdown} />}
              {tab === 'insights' && <DrilldownInsights insights={data.insights} />}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
