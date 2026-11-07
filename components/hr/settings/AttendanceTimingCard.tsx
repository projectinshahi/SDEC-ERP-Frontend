'use client';

import React, { useEffect, useState } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle2, RotateCcw, Clock } from 'lucide-react';
import { ApiAttendanceSettings, fetchAttendanceSettings, updateAttendanceSettings } from '@/lib/api/hr-attendance-settings';
import { primeAttendanceSettings } from '@/lib/hr/useAttendanceSettings';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { AttendanceTimePicker } from '@/components/hr/attendance/AttendanceTimePicker';

type Timing = Pick<ApiAttendanceSettings, 'lunch_start_time' | 'lunch_end_time'>;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

/** Client-side mirror of the backend rule (the backend re-validates on PUT). */
function validationError(t: Timing): string | null {
  if (!HHMM.test(t.lunch_start_time) || !HHMM.test(t.lunch_end_time)) return 'Both lunch times are required.';
  if (toMinutes(t.lunch_start_time) >= toMinutes(t.lunch_end_time)) return 'Lunch break start must be earlier than lunch break end.';
  return null;
}

function TimeRow({ label, hint, value, onChange, disabled }: {
  label: string; hint: string; value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 py-3 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">{label}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{hint}</p>
      </div>
      <AttendanceTimePicker value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

/**
 * HR Settings → Attendance Timing Configuration.
 * Org-level scheduled lunch timings: the entry-form defaults (Lunch Out / Lunch In)
 * and the late-after-lunch threshold used by the backend status calculation.
 * Saved values are defaults/expected times — never recorded punch data.
 */
export function AttendanceTimingCard() {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('hr.settings.edit');

  const [saved, setSaved] = useState<Timing | null>(null);
  const [draft, setDraft] = useState<Timing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAttendanceSettings()
      .then((s) => {
        if (cancelled) return;
        const t = { lunch_start_time: s.lunch_start_time, lunch_end_time: s.lunch_end_time };
        setSaved(t); setDraft(t);
      })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load attendance timing settings'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 3000);
    return () => clearTimeout(t);
  }, [justSaved]);

  const dirty = !!saved && !!draft && (saved.lunch_start_time !== draft.lunch_start_time || saved.lunch_end_time !== draft.lunch_end_time);
  const invalid = draft ? validationError(draft) : null;

  const handleSave = async () => {
    if (!draft || invalid) return;
    setSaving(true); setError(null);
    try {
      const updated = await updateAttendanceSettings(draft);
      const t = { lunch_start_time: updated.lunch_start_time, lunch_end_time: updated.lunch_end_time };
      setSaved(t); setDraft(t); setJustSaved(true);
      primeAttendanceSettings(updated); // every mounted badge / entry form picks the new timings up at once
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save attendance timing settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex justify-center py-12 shadow-sm">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm flex items-center gap-2 border border-red-100 dark:border-red-900/30">
        <AlertCircle size={16} /> {error ?? 'Attendance timing settings unavailable.'}
      </div>
    );
  }

  const disabled = !canEdit || saving;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-zinc-500 dark:text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Attendance Timing Configuration</h2>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Scheduled lunch break used as the default Lunch Out / Lunch In when adding attendance, and as the
          late-after-lunch threshold. Actual punch times are always recorded as entered; saved records are not changed.
        </p>
      </div>

      <div className="p-4 sm:p-5">
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100 dark:border-red-900/30">
            <AlertCircle size={16} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <TimeRow
          label="Lunch Break Start"
          hint="Default Lunch Out time for new attendance entries."
          value={draft.lunch_start_time}
          onChange={(v) => setDraft((d) => (d ? { ...d, lunch_start_time: v } : d))}
          disabled={disabled}
        />
        <TimeRow
          label="Lunch Break End / Expected Return"
          hint="Default Lunch In time; returning after this time is marked Late After Lunch."
          value={draft.lunch_end_time}
          onChange={(v) => setDraft((d) => (d ? { ...d, lunch_end_time: v } : d))}
          disabled={disabled}
        />

        {invalid && dirty && (
          <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertCircle size={13} className="shrink-0" /> {invalid}
          </p>
        )}
      </div>

      <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-3">
        {canEdit ? (
          <>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 min-h-[20px]">
              {justSaved && <><CheckCircle2 size={14} /> Saved</>}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => saved && setDraft(saved)}
                disabled={!dirty || saving}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || !!invalid || saving}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              >
                {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : <><Save size={15} /> Save Settings</>}
              </button>
            </div>
          </>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium text-right w-full">You have view-only access to attendance settings.</p>
        )}
      </div>
    </div>
  );
}
