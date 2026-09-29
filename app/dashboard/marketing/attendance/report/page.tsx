'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarRange, ChevronLeft, ChevronRight, Download, Table2, CalendarDays, Users, Info, ShieldAlert,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useToast } from '@/lib/hooks/useToast';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import {
  fetchAttendanceMonth, fetchAttendanceSummary, downloadAttendanceSummaryXlsx,
  type AttendanceMonth, type AttendanceSummary, type MemberMonth, type MonthDayCell,
} from '@/lib/api/marketingAttendance';
import {
  DAY_FILL, DAY_LABEL, LEGEND_KINDS, isBlankDay,
  shiftMonth, monthTitle, firstWeekdayOfMonth, dayOfMonth, DAY_INITIALS,
} from '@/lib/marketing/attendanceStatus';

/**
 * MK-003.3 monthly calendar and MK-003.4 summary report.
 *
 * Both read the SERVER's calculation. Nothing on this page recomputes a status,
 * a count or a percentage — the requirement is that the calendar, the table and
 * the spreadsheet agree, and the only way to guarantee that is to have exactly
 * one calculation, which lives in the backend.
 */

const apiError = (e: unknown): string | undefined =>
  (e as { details?: { error?: string } } | null)?.details?.error;

/** An instant → local clock time. Never used to derive a calendar day. */
const clock = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';

type Tab = 'calendar' | 'summary';

export default function MarketingAttendanceReportPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('calendar');
  // Seeded from the server's first response so the client's clock never decides
  // which month "now" is.
  const [month, setMonth] = useState<string>('');
  const [staffId, setStaffId] = useState<number | null>(null);

  const [monthData, setMonthData] = useState<AttendanceMonth | null>(null);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [detail, setDetail] = useState<{ member: MemberMonth; day: MonthDayCell } | null>(null);

  const loadMonth = useCallback(async (m: string) => {
    setLoadingMonth(true);
    setError(null);
    try {
      const data = await fetchAttendanceMonth(m || new Date().toISOString().slice(0, 7));
      setMonthData(data);
      setMonth(data.month);
      // Keep the selected member across month changes; only fall back when the
      // current selection is not in scope.
      setStaffId((cur) => (cur && data.roster.some((r) => r.id === cur) ? cur : data.roster[0]?.id ?? null));
    } catch (err) {
      setMonthData(null);
      setError(apiError(err) || 'Unable to load the attendance calendar');
    } finally {
      setLoadingMonth(false);
    }
  }, []);

  const loadSummary = useCallback(async (m: string) => {
    if (!m) return;
    setLoadingSummary(true);
    try {
      setSummary(await fetchAttendanceSummary(m));
    } catch (err) {
      setSummary(null);
      toast(apiError(err) || 'Unable to load the attendance summary', 'error');
    } finally {
      setLoadingSummary(false);
    }
  }, [toast]);

  useEffect(() => { void loadMonth(''); }, [loadMonth]);
  useEffect(() => { if (month) void loadMonth(month); }, [month]);        // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'summary' && month) void loadSummary(month); }, [tab, month, loadSummary]);

  const onExport = async () => {
    if (!month || exporting) return;
    setExporting(true);
    try {
      // The SERVER builds the file from the same calculation the table shows.
      await downloadAttendanceSummaryXlsx(month);
      toast('Attendance summary exported successfully', 'success');
    } catch (err) {
      toast(apiError(err) || 'Unable to export the attendance summary', 'error');
    } finally {
      setExporting(false);
    }
  };

  const member = monthData?.members.find((m) => m.userId === staffId) ?? monthData?.members[0] ?? null;

  return (
    <div className="space-y-4">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Attendance Report</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Monthly calendar and summary for the Marketing team.{' '}
              <Link href="/dashboard/marketing/attendance" className="font-semibold text-cyan-700 hover:underline dark:text-cyan-400">
                Today&apos;s attendance
              </Link>
            </p>
          </div>
        </div>

        <div role="tablist" aria-label="Report view" className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
          {([['calendar', 'Calendar', CalendarDays], ['summary', 'Summary', Table2]] as const).map(([key, label, Icon]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={classNames(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                tab === key ? 'bg-cyan-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Month bar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Previous month" disabled={!month}
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-1.5 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Next month" disabled={!month}
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="rounded-lg border border-gray-200 dark:border-gray-700 p-1.5 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="ml-2 text-sm font-bold text-gray-800 dark:text-gray-100">
            {month ? monthTitle(month) : '—'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tab === 'calendar' && monthData && monthData.roster.length > 1 && (
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
              <Users className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={staffId ?? ''}
                onChange={(e) => setStaffId(Number(e.target.value))}
                aria-label="Team member"
                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none"
              >
                {monthData.roster.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
          )}
          {tab === 'summary' && (
            <Button onClick={() => void onExport()} isLoading={exporting} disabled={!month || loadingSummary}>
              <Download className="mr-1.5 h-4 w-4" /> Export Excel
            </Button>
          )}
        </div>
      </div>

      {/* ── Calendar ─────────────────────────────────────────────────────────── */}
      {tab === 'calendar' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
          {loadingMonth ? (
            <div className="space-y-2" aria-busy="true">
              <div className="h-5 w-40 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
              <button type="button" onClick={() => void loadMonth(month)}
                className="mt-2 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-400">Try again</button>
            </div>
          ) : !member ? (
            <div className="px-4 py-12 text-center">
              <Users className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">No Marketing team members found.</p>
              <p className="mt-0.5 text-xs text-gray-400">Attendance appears here once the team has members.</p>
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{member.userName}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {LEGEND_KINDS.map((k) => (
                    <span key={k} className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                      <span className={classNames('h-2.5 w-2.5 rounded-sm', DAY_FILL[k])} /> {DAY_LABEL[k]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[320px]">
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAY_INITIALS.map((d, i) => (
                      <div key={i} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wide text-gray-400">{d}</div>
                    ))}
                    {/* Leading blanks so the 1st lands on its real weekday. */}
                    {Array.from({ length: firstWeekdayOfMonth(month) }).map((_, i) => <div key={`pad-${i}`} />)}
                    {member.days.map((day) => {
                      const blank = isBlankDay(day.kind);
                      return (
                        <button
                          key={day.date}
                          type="button"
                          onClick={() => setDetail({ member, day })}
                          aria-label={`${day.date} — ${DAY_LABEL[day.kind] ?? day.kind}`}
                          className={classNames(
                            'flex aspect-square min-h-[34px] flex-col items-center justify-center rounded-lg text-[11px] font-bold transition-transform hover:scale-[1.04]',
                            blank
                              // A future or pre-join day is drawn as an empty
                              // outline — never as an absence.
                              ? 'border border-dashed border-gray-200 dark:border-gray-800 text-gray-300 dark:text-gray-700'
                              : DAY_FILL[day.kind] ?? DAY_FILL.absent,
                          )}
                        >
                          {dayOfMonth(day.date)}
                          {day.persisted && !blank && <span className="mt-0.5 h-1 w-1 rounded-full bg-current opacity-70" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* The server's totals, shown verbatim. */}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 dark:border-gray-800 pt-3 sm:grid-cols-4 lg:grid-cols-7">
                {([
                  ['Present', member.totals.present], ['Half-Day', member.totals.halfDay],
                  ['Absent', member.totals.absent], ['Leave', member.totals.leave],
                  ['Holidays', member.totals.holidays], ['Working days', member.totals.countedDays],
                ] as const).map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-gray-50 dark:bg-gray-800/60 px-2 py-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{value}</p>
                  </div>
                ))}
                <div className="rounded-lg bg-cyan-50 dark:bg-cyan-950/30 px-2 py-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-400">Attendance</p>
                  <p className="text-sm font-bold text-cyan-800 dark:text-cyan-300">
                    {/* null means "nothing to divide" — shown as — , never 0%. */}
                    {member.totals.attendancePercent === null ? '—' : `${member.totals.attendancePercent}%`}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Summary ──────────────────────────────────────────────────────────── */}
      {tab === 'summary' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {loadingSummary ? (
            <div className="space-y-2 p-4" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : !summary || summary.rows.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Table2 className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">No attendance records found.</p>
              <p className="mt-0.5 text-xs text-gray-400">No Marketing team member has data for {month ? monthTitle(month) : 'this month'}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    {/* Columns come from the API so the table and the export share
                        one definition of what the report contains. */}
                    {summary.columns.map((c) => (
                      <th key={c.key} className={classNames('px-4 py-2', c.key !== 'userName' && 'text-right')}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {summary.rows.map((r) => (
                    <tr key={r.userId}>
                      <td className="px-4 py-2">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{r.userName}</div>
                        {r.joinDate && (
                          <div className="text-[10px] text-gray-400">Joined {r.joinDate}</div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{r.present}</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{r.halfDay}</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{r.absent}</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{r.leave}</td>
                      <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">{r.holidays}</td>
                      <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">{r.countedDays}</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-800 dark:text-gray-100">
                        {r.attendancePercent === null ? '—' : `${r.attendancePercent}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {detail && (
        <Modal isOpen onClose={() => setDetail(null)} title={`${detail.member.userName} — ${detail.day.date}`} size="sm">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={classNames('rounded-full px-2.5 py-0.5 text-xs font-bold uppercase',
                isBlankDay(detail.day.kind) ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' : DAY_FILL[detail.day.kind])}>
                {DAY_LABEL[detail.day.kind] ?? detail.day.kind}
              </span>
              {!detail.day.persisted && !isBlankDay(detail.day.kind) && detail.day.kind === 'absent' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400">
                  <Info className="h-3 w-3" /> No record — this is the default.
                </span>
              )}
              {detail.day.overriddenBy && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <ShieldAlert className="h-2.5 w-2.5" /> Manager override
                </span>
              )}
            </div>

            {isBlankDay(detail.day.kind) ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {detail.day.kind === 'future'
                  ? 'This day has not happened yet, so there is nothing to report.'
                  : 'This date is before the member joined.'}
              </p>
            ) : (
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">Checked in</dt>
                  <dd className="font-semibold text-gray-800 dark:text-gray-200">{clock(detail.day.checkIn)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">Checked out</dt>
                  <dd className="font-semibold text-gray-800 dark:text-gray-200">{clock(detail.day.checkOut)}</dd>
                </div>
                {detail.day.leaveType && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500 dark:text-gray-400">Leave type</dt>
                    <dd className="font-semibold text-gray-800 dark:text-gray-200">{detail.day.leaveType}</dd>
                  </div>
                )}
                {detail.day.holidayName && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500 dark:text-gray-400">Holiday</dt>
                    <dd className="font-semibold text-gray-800 dark:text-gray-200">{detail.day.holidayName}</dd>
                  </div>
                )}
                {detail.day.notes && (
                  <div className="pt-1">
                    <dt className="text-gray-500 dark:text-gray-400">Notes</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-gray-700 dark:text-gray-300">{detail.day.notes}</dd>
                  </div>
                )}
                {detail.day.overrideReason && (
                  <div className="pt-1">
                    <dt className="text-gray-500 dark:text-gray-400">Override reason</dt>
                    <dd className="mt-0.5 text-amber-700 dark:text-amber-400">{detail.day.overrideReason}</dd>
                  </div>
                )}
              </dl>
            )}

            <div className="flex justify-end pt-1">
              <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
