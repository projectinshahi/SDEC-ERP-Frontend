'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, Loader2, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, UserX } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { fetchMyAttendance, type MyAttendanceResponse, type MyAttendanceDay } from '@/lib/api/hr-attendance';

/* ── Local date helpers (LOCAL calendar — matches the Attendance module's IST
 *    convention; never toISOString()/UTC, which can shift the day). ─────────── */
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthStart = (d: Date) => ymd(new Date(d.getFullYear(), d.getMonth(), 1));
const monthEnd = (d: Date) => ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
const prettyDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const prettyMonth = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};
/** work_hours (decimal) → "8h 00m" — identical rounding to the HR module. */
const fmtHours = (wh: number): string => {
  if (!wh || wh <= 0) return '—';
  const tm = Math.round(wh * 60);
  return `${Math.floor(tm / 60)}h ${pad(tm % 60)}m`;
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  present: { label: 'Present', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  late: { label: 'Late', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  late_after_lunch: { label: 'Late After Lunch', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  half_day: { label: 'Half Day', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  leave_half_day: { label: 'Half Day Leave', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
  leave_full_day: { label: 'Full Day Leave', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
  absent: { label: 'Absent', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
};
const statusMeta = (s: string) => STATUS_META[s] ?? { label: s, cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
const StatusBadge = ({ status }: { status: string }) => {
  const m = statusMeta(status);
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.cls}`}>{m.label}</span>;
};

type Preset = 'current' | 'previous' | 'custom';

export default function MyAttendancePage() {
  const [preset, setPreset] = useState<Preset>('current');
  const [start, setStart] = useState<string>(() => monthStart(new Date()));
  const [end, setEnd] = useState<string>(() => ymd(new Date()));
  const [data, setData] = useState<MyAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Wait for authentication to resolve before deciding anything — never flash the
  // "no employee profile" state while the session/user is still loading.
  const { user, isLoading: authLoading } = useAuth();

  const applyPreset = (p: Preset, base = new Date()) => {
    if (p === 'current') { setStart(monthStart(base)); setEnd(ymd(base)); }
    else if (p === 'previous') {
      const prev = new Date(base.getFullYear(), base.getMonth() - 1, 1);
      setStart(monthStart(prev)); setEnd(monthEnd(prev));
    }
    setPreset(p);
  };

  const load = useCallback(async (s: string, e: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMyAttendance(s, e);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load your attendance.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch only once auth is ready; refetch whenever the range changes — never keep
  // stale data from a prior month, and never fetch before the user is identified.
  useEffect(() => {
    if (authLoading || !user) return;
    load(start, end);
  }, [start, end, load, authLoading, user]);

  // Distinct states (never conflated): auth/data loading vs. genuinely no linked
  // employee (hasEmployee === false) vs. a linked employee with no rows in range.
  const showLoading = authLoading || loading;
  const noProfile = !!data && data.hasEmployee === false;
  const days = data?.daily ?? [];
  const leaves = data?.leaves ?? [];
  const sum = data?.summary;
  const summaryCards = useMemo(() => sum ? [
    { label: 'Present', value: sum.present, cls: 'text-emerald-600' },
    { label: 'Absent', value: sum.absent, cls: 'text-rose-600' },
    { label: 'Half Day', value: sum.halfDay, cls: 'text-blue-600' },
    { label: 'Full Day Leave', value: sum.fullDayLeave, cls: 'text-violet-600' },
    { label: 'Late Marks', value: sum.lateMarks, cls: 'text-amber-600' },
    { label: 'Working Days', value: sum.workingDays, cls: 'text-slate-600' },
    { label: 'Total Hours', value: fmtHours(sum.totalHours), cls: 'text-indigo-600' },
    { label: 'Attendance %', value: `${sum.attendancePct}%`, cls: 'text-teal-600' },
  ] : [], [sum]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">My Attendance</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data?.employee?.name || 'Your'} attendance · {prettyMonth(start) === prettyMonth(end) ? prettyMonth(start) : `${prettyDate(start)} – ${prettyDate(end)}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => load(start, end)}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
        <button onClick={() => applyPreset('previous')} title="Previous month"
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        {(['current', 'previous', 'custom'] as Preset[]).map((p) => (
          <button key={p} onClick={() => (p === 'custom' ? setPreset('custom') : applyPreset(p))}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
              preset === p ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}>
            {p === 'current' ? 'This Month' : p === 'previous' ? 'Last Month' : 'Custom'}
          </button>
        ))}
        <button onClick={() => applyPreset('current')} title="This month"
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          Next <ChevronRight className="h-4 w-4" />
        </button>
        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
            <span className="text-gray-400">–</span>
            <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
          </div>
        )}
      </div>

      {/* Summary */}
      {sum && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {summaryCards.map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{c.label}</p>
              <p className={`mt-0.5 text-lg font-bold ${c.cls}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Daily attendance */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Attendance History</h2>
        </div>

        {showLoading ? (
          // 1 · LOADING — auth still resolving or the fetch is in flight.
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
        ) : error ? (
          // 4 · API / server error — retry can help.
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle className="h-8 w-8 text-rose-400" />
            <p className="text-sm text-gray-600 dark:text-gray-300">{error}</p>
            <button onClick={() => load(start, end)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">Retry</button>
          </div>
        ) : noProfile ? (
          // 2 · NO EMPLOYEE MAPPING — the backend confirmed this user has no employee
          // row (hasEmployee === false). NOT an error; retry would not help.
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <UserX className="h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No employee profile is linked to your account.</p>
            <p className="max-w-[280px] text-xs text-gray-400">Ask HR to link your login to your employee record so your attendance can be shown here.</p>
          </div>
        ) : days.length === 0 ? (
          // 3 · NO ATTENDANCE for a linked employee in this range.
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <CalendarDays className="h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No attendance records found for the selected period.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-800">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Check In</th>
                    <th className="px-3 py-2.5">Lunch Out</th>
                    <th className="px-3 py-2.5">Lunch In</th>
                    <th className="px-3 py-2.5">Check Out</th>
                    <th className="px-3 py-2.5 text-right">Hours</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d: MyAttendanceDay) => (
                    <tr key={d.date} className="border-b border-gray-50 last:border-0 dark:border-gray-800/60">
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{prettyDate(d.date)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-600 dark:text-gray-300">{d.check_in ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-600 dark:text-gray-300">{d.lunch_out ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-600 dark:text-gray-300">{d.lunch_in ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-600 dark:text-gray-300">{d.check_out ?? '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-200">{fmtHours(d.work_hours)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <StatusBadge status={d.status} />
                        {(d.late_checkin || d.late_after_lunch) && <span className="ml-1 text-[10px] font-semibold text-amber-600">Late</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-gray-50 sm:hidden dark:divide-gray-800/60">
              {days.map((d) => (
                <div key={d.date} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{prettyDate(d.date)}</p>
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>Check In: <b className="font-medium text-gray-700 dark:text-gray-200">{d.check_in ?? '—'}</b></span>
                    <span>Check Out: <b className="font-medium text-gray-700 dark:text-gray-200">{d.check_out ?? '—'}</b></span>
                    <span>Lunch Out: <b className="font-medium text-gray-700 dark:text-gray-200">{d.lunch_out ?? '—'}</b></span>
                    <span>Lunch In: <b className="font-medium text-gray-700 dark:text-gray-200">{d.lunch_in ?? '—'}</b></span>
                    <span className="col-span-2 inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Hours: <b className="font-medium text-gray-700 dark:text-gray-200">{fmtHours(d.work_hours)}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Leaves */}
      {leaves.length > 0 && !error && !noProfile && (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">My Leave in this period</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {leaves.map((lv) => (
              <div key={lv.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-gray-800 dark:text-gray-200">{lv.leave_type}</span>
                  {lv.half_period && <span className="ml-1.5 text-xs text-violet-600">({lv.half_period === 'first_half' ? 'First Half' : 'Second Half'})</span>}
                  <span className="ml-2 text-xs text-gray-400">{prettyDate(lv.start_date)}{lv.end_date !== lv.start_date ? ` – ${prettyDate(lv.end_date)}` : ''} · {lv.days} day{lv.days === 1 ? '' : 's'}</span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                  lv.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : lv.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                }`}>{lv.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
