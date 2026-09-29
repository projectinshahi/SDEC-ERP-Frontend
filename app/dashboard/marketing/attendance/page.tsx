'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { CalendarCheck, LogIn, LogOut, Users, ShieldAlert, Info } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useToast } from '@/lib/hooks/useToast';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/marketing/FieldError';
import {
  collect, hasErrors, requiredText, fieldErrorsFromApi, invalidInputCls, type FieldErrors,
} from '@/lib/marketing/contentValidation';
import {
  fetchMyAttendance, checkIn, checkOut, fetchTeamAttendance, overrideAttendance,
  type MyAttendance, type TeamAttendance, type TeamAttendanceRecord, type StatusOption,
} from '@/lib/api/marketingAttendance';

/**
 * MK-003.2 — daily attendance.
 *
 * Self-service is current-day only and carries no timestamp: the server stamps
 * the time and decides what "today" is, so a client in another timezone — or a
 * crafted request — cannot back-date a check-in.
 */

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30';
const labelCls = 'mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300';

const apiError = (e: unknown): string | undefined =>
  (e as { details?: { error?: string } } | null)?.details?.error;

const STATUS_TONE: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  absent: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  half_day: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  on_leave: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

/** An instant → local clock time. Never used to derive a calendar day. */
const clock = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';

export default function MarketingAttendancePage() {
  const { toast } = useToast();
  const [me, setMe] = useState<MyAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'in' | 'out' | null>(null);
  /* `busy` is React STATE, so three clicks in one tick all read it as null and
     all POST. The server rejects the duplicates and only one row is ever
     created — but three requests still go out, so the guard is a ref, which
     updates synchronously. */
  const actingRef = useRef(false);

  const [team, setTeam] = useState<TeamAttendance | null>(null);
  const [teamDate, setTeamDate] = useState<string>('');
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [override, setOverride] = useState<TeamAttendanceRecord | null>(null);

  const loadMe = useCallback(async () => {
    try {
      const data = await fetchMyAttendance();
      setMe(data);
      // The server's day is authoritative; seed the team view from it.
      setTeamDate((d) => d || data.today);
    } catch (err) {
      toast(apiError(err) || 'Unable to load your attendance', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadTeam = useCallback(async (date: string) => {
    if (!date) return;
    setLoadingTeam(true);
    try {
      setTeam(await fetchTeamAttendance(date));
    } catch (err) {
      setTeam(null);
      // A member without the team key simply has no team panel — not an error.
      if ((err as { status?: number })?.status !== 403) {
        toast(apiError(err) || 'Unable to load team attendance', 'error');
      }
    } finally {
      setLoadingTeam(false);
    }
  }, [toast]);

  useEffect(() => { void loadMe(); }, [loadMe]);
  useEffect(() => {
    if (me?.canViewTeam && teamDate) void loadTeam(teamDate);
  }, [me?.canViewTeam, teamDate, loadTeam]);

  const onCheckIn = async () => {
    if (actingRef.current) return;
    actingRef.current = true;
    setBusy('in');
    try {
      const rec = await checkIn();
      // Trust the server's record rather than optimistically painting Present.
      setMe((m) => (m ? { ...m, attendance: rec } : m));
      toast('Checked in successfully', 'success');
      if (me?.canViewTeam && teamDate) void loadTeam(teamDate);
    } catch (err) {
      toast(apiError(err) || 'Unable to record your check-in', 'error');
      void loadMe();                       // resync with whatever the server holds
    } finally {
      actingRef.current = false;
      setBusy(null);
    }
  };

  const onCheckOut = async () => {
    if (actingRef.current) return;
    actingRef.current = true;
    setBusy('out');
    try {
      const rec = await checkOut();
      setMe((m) => (m ? { ...m, attendance: rec } : m));
      toast('Checked out successfully', 'success');
      if (me?.canViewTeam && teamDate) void loadTeam(teamDate);
    } catch (err) {
      toast(apiError(err) || 'Unable to record your check-out', 'error');
      void loadMe();
    } finally {
      actingRef.current = false;
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-56 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  const a = me?.attendance;
  const checkedIn = !!a?.checkIn;
  const checkedOut = !!a?.checkOut;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
          <CalendarCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Attendance</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Your day, and the Marketing team&apos;s.</p>
        </div>
      </div>

      {/* ── Today ────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Today · {me?.today}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={classNames('rounded-full px-2.5 py-0.5 text-xs font-bold uppercase', STATUS_TONE[a?.status ?? 'absent'])}>
                {a?.statusLabel}
              </span>
              {/* The difference the spec insists on: a default, not a record. */}
              {!a?.persisted && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400">
                  <Info className="h-3 w-3" /> No attendance record yet — this is the default.
                </span>
              )}
              {a?.overriddenBy && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <ShieldAlert className="h-2.5 w-2.5" /> Manager override
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Checked in <b>{clock(a?.checkIn ?? null)}</b> · Checked out <b>{clock(a?.checkOut ?? null)}</b>
            </p>
            {me?.approvedLeave && (
              <p className="mt-1 text-[11px] font-medium text-blue-600 dark:text-blue-300">
                You have approved {me.approvedLeave.leaveType} leave covering today.
              </p>
            )}
          </div>

          {me?.canSelfAttend && (
            <div className="flex gap-2">
              <Button onClick={() => void onCheckIn()} disabled={checkedIn || busy !== null} isLoading={busy === 'in'}>
                <LogIn className="mr-1.5 h-4 w-4" /> Check in
              </Button>
              <Button variant="secondary" onClick={() => void onCheckOut()}
                disabled={!checkedIn || checkedOut || busy !== null} isLoading={busy === 'out'}>
                <LogOut className="mr-1.5 h-4 w-4" /> Check out
              </Button>
            </div>
          )}
        </div>

        {checkedOut && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            Your day is recorded. Ask a manager if anything needs correcting.
          </p>
        )}
      </div>

      {/* ── Team ─────────────────────────────────────────────────────────────── */}
      {me?.canViewTeam && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
              <Users className="h-4 w-4 text-cyan-600" /> Team attendance
            </h2>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
              Date
              <input type="date" value={teamDate} max={me.today} onChange={(e) => setTeamDate(e.target.value)}
                className={classNames(inputCls, 'w-auto py-1')} />
            </label>
          </div>

          {loadingTeam ? (
            <div className="space-y-2 p-4" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : !team || team.records.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Users className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">No attendance record for this day.</p>
              <p className="mt-0.5 text-xs text-gray-400">Nobody in the Marketing roster has a record for {teamDate}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-2">Member</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">In</th>
                    <th className="px-4 py-2">Out</th>
                    {team.canOverride && <th className="px-4 py-2 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {team.records.map((r) => (
                    <tr key={r.userId}>
                      <td className="px-4 py-2">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{r.userName}</div>
                        {r.overrideReason && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400" title={r.overrideReason}>
                            Override: {r.overrideReason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className={classNames('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', STATUS_TONE[r.status])}>
                          {r.statusLabel}
                        </span>
                        {!r.persisted && <span className="ml-1.5 text-[10px] text-gray-400">(no record)</span>}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300">{clock(r.checkIn)}</td>
                      <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300">{clock(r.checkOut)}</td>
                      {team.canOverride && (
                        <td className="px-4 py-2 text-right">
                          <button type="button" onClick={() => setOverride(r)}
                            className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {override && team && (
        <OverrideModal
          key={`${override.userId}-${team.date}`}
          record={override}
          date={team.date}
          statuses={team.statuses}
          onClose={() => setOverride(null)}
          onSaved={async () => { setOverride(null); await loadTeam(team.date); await loadMe(); }}
        />
      )}
    </div>
  );
}

/* ── Manager override ────────────────────────────────────────────────────── */

function OverrideModal({ record, date, statuses, onClose, onSaved }: {
  record: TeamAttendanceRecord; date: string; statuses: StatusOption[];
  onClose: () => void; onSaved: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ status: record.status, reason: '', notes: record.notes ?? '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  /* `saving` is React STATE: two clicks landing in the same tick both read it
     as false and both fire. The ref updates synchronously, so the second click
     sees the first. */
  const submittingRef = useRef(false);


  const submit = async () => {
    if (submittingRef.current) return;
    // The reason is mandatory — checked here so the field is marked, and again
    // on the server, which is what actually enforces it.
    const errs = collect({ reason: requiredText(form.reason, 'Reason') });
    setErrors(errs);
    if (hasErrors(errs)) return;

    submittingRef.current = true;
    setSaving(true);
    try {
      await overrideAttendance(record.userId, date, {
        status: form.status,
        reason: form.reason.trim(),
        notes: form.notes.trim() || null,
      });
      toast('Attendance updated successfully', 'success');
      await onSaved();
    } catch (err) {
      const mapped = fieldErrorsFromApi(err);
      setErrors(mapped);
      if (!hasErrors(mapped)) toast(apiError(err) || 'Unable to update the attendance record', 'error');
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal confirmDiscard isOpen onClose={onClose} busy={saving} title={`Edit attendance — ${record.userName}`} size="md">
      <div className="space-y-3">
        <p className="rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
          {date} · currently <b>{record.statusLabel}</b>
          {!record.persisted && ' (no record — this is the default)'}
        </p>
        <div>
          <label htmlFor="ov-status" className={labelCls}>Status</label>
          <select id="ov-status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            aria-invalid={!!errors.status} className={classNames(inputCls, errors.status && invalidInputCls)}>
            {statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <FieldError message={errors.status} />
          <p className="mt-1 text-[11px] text-gray-400">
            On Leave requires an approved leave request covering this date.
          </p>
        </div>
        <div>
          <label htmlFor="ov-reason" className={labelCls}>Reason <span className="text-rose-500">*</span></label>
          <input id="ov-reason" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            aria-invalid={!!errors.reason}
            className={classNames(inputCls, errors.reason && invalidInputCls)}
            placeholder="Why this record is being changed" />
          <FieldError message={errors.reason} />
          <p className="mt-1 text-[11px] text-gray-400">Recorded against your name in the audit trail.</p>
        </div>
        <div>
          <label htmlFor="ov-notes" className={labelCls}>Notes</label>
          <textarea id="ov-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2} className={classNames(inputCls, 'resize-y')} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void submit()} isLoading={saving}>Save attendance</Button>
        </div>
      </div>
    </Modal>
  );
}
