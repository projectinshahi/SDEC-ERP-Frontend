'use client';

import React, { useState, useEffect } from 'react';
import {
  ClipboardEdit, Loader2, CheckCircle2, AlertCircle, ChevronDown, Calendar,
  LogIn, Coffee, UtensilsCrossed, LogOut,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/Card';
import { ApiEmployee } from '@/lib/api/hr';
import { ApiAttendanceRecord } from '@/lib/api/hr-attendance';

/* ── Time format helpers ──────────────────────────────────────────────────── */

/** "09:30" (24h) → "09:30 AM" | "14:15" → "02:15 PM"  (for display preview) */
function to12hDisplay(val: string): string {
  if (!val || !val.includes(':')) return '';
  const [hStr, mStr] = val.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const mer = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2, '0')}:${m} ${mer}`;
}

/** "09:30 AM" | "02:15 PM" → "09:30" | "14:15" (for pre-fill from existing record) */
function to24h(val: string | null | undefined): string {
  if (!val) return '';
  const cleaned = val.trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (!match) return '';
  let h = parseInt(match[1], 10);
  const m = match[2];
  const mer = match[3];
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
}

/* ── Types ───────────────────────────────────────────────────────────────── */

export interface AttendanceFormValues {
  employeeId: number | null;
  date: string;       // YYYY-MM-DD
  checkIn: string;    // 24h "HH:MM" — converted to AM/PM before sending to backend
  lunchOut: string;
  lunchIn: string;
  checkOut: string;
  notes?: string;
}

interface AttendanceFormPanelProps {
  employees: ApiEmployee[];
  allRecords: ApiAttendanceRecord[];
  /** Pre-fill form with this existing record (edit mode). */
  editRecord?: ApiAttendanceRecord | null;
  isSaving: boolean;
  saveError: string | null;
  successMsg: string | null;
  onSave: (values: AttendanceFormValues) => void;
  /** When true, renders bare form without Card shell (modal provides its own shell). */
  inModal?: boolean;
}

/* ── Time field config ────────────────────────────────────────────────────── */

const TIME_FIELDS = [
  {
    key: 'checkIn' as const,
    label: 'Check In',
    Icon: LogIn,
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'lunchOut' as const,
    label: 'Lunch Out',
    Icon: Coffee,
    color: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'lunchIn' as const,
    label: 'Lunch In',
    Icon: UtensilsCrossed,
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'checkOut' as const,
    label: 'Check Out',
    Icon: LogOut,
    color: 'text-rose-600 dark:text-rose-400',
  },
] as const;

const TODAY = new Date().toISOString().split('T')[0];

/* ── Component ───────────────────────────────────────────────────────────── */

export function AttendanceFormPanel({
  employees,
  allRecords,
  editRecord,
  isSaving,
  saveError,
  successMsg,
  onSave,
  inModal = false,
}: AttendanceFormPanelProps) {
  const [employeeId, setEmployeeId] = useState<number | null>(employees[0]?.id ?? null);
  const [date, setDate] = useState(TODAY);
  const [checkIn, setCheckIn] = useState('');
  const [lunchOut, setLunchOut] = useState('');
  const [lunchIn, setLunchIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [notes, setNotes] = useState('');

  const setters = { checkIn: setCheckIn, lunchOut: setLunchOut, lunchIn: setLunchIn, checkOut: setCheckOut };
  const values = { checkIn, lunchOut, lunchIn, checkOut };

  /* Auto-populate from existing record when employee or date changes */
  useEffect(() => {
    if (employeeId == null) return;
    // editRecord prop takes priority (direct edit from table row)
    if (editRecord) {
      const to24hLocal = (val: string | null | undefined) => {
        if (!val) return '';
        const cleaned = val.trim().toUpperCase();
        const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
        if (!match) return '';
        let h = parseInt(match[1], 10);
        const m = match[2];
        const mer = match[3];
        if (mer === 'PM' && h !== 12) h += 12;
        if (mer === 'AM' && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${m}`;
      };
      setEmployeeId(editRecord.employee_id);
      setDate(editRecord.date ? editRecord.date.split('T')[0] : TODAY);
      setCheckIn(to24hLocal(editRecord.check_in));
      setLunchOut(to24hLocal(editRecord.lunch_out));
      setLunchIn(to24hLocal(editRecord.lunch_in));
      setCheckOut(to24hLocal(editRecord.check_out));
      setNotes(editRecord.notes ?? '');
      return;
    }
    const existing = allRecords.find(
      r => r.employee_id === employeeId && r.date?.split('T')[0] === date
    );
    setCheckIn(to24h(existing?.check_in));
    setLunchOut(to24h(existing?.lunch_out));
    setLunchIn(to24h(existing?.lunch_in));
    setCheckOut(to24h(existing?.check_out));
    setNotes(existing?.notes ?? '');
  }, [employeeId, date, allRecords, editRecord]);

  /* Seed first employee once list loads */
  useEffect(() => {
    if (employeeId == null && employees.length > 0) {
      setEmployeeId(employees[0].id);
    }
  }, [employees]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !date) return;
    onSave({ employeeId, date, checkIn, lunchOut, lunchIn, checkOut, notes });
  };

  const labelCls = 'flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider';
  const isTimeDisabled = false;

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-4">

          {/* Employee */}
          <div className="space-y-1.5">
            <label className={labelCls}>Employee</label>
            <div className="relative">
              <select
                value={employeeId ?? ''}
                onChange={e => setEmployeeId(Number(e.target.value))}
                required
                disabled={!!editRecord}
                className="w-full appearance-none pl-3 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-850 disabled:cursor-not-allowed transition"
              >
                <option value="">— Select employee —</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_code} — {emp.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className={labelCls}>
              <Calendar size={11} />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              disabled={!!editRecord}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-850 disabled:cursor-not-allowed transition"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-gray-850" />

          {/* Time pickers */}
          {TIME_FIELDS.map(({ key, label, Icon, color }) => (
            <div key={key} className="space-y-1.5">
              <label className={labelCls}>
                <Icon size={11} className={color} />
                {label}
                <span className="text-gray-300 dark:text-gray-600 font-normal normal-case tracking-normal ml-auto font-mono text-[10px]">
                  {values[key] && !isTimeDisabled ? `→ ${to12hDisplay(values[key])}` : ''}
                </span>
              </label>
              <input
                type="time"
                value={values[key]}
                onChange={e => setters[key](e.target.value)}
                disabled={isTimeDisabled}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-800/60 disabled:cursor-not-allowed transition"
              />
            </div>
          ))}

          {/* Notes (Optional) */}
          <div className="space-y-1.5">
            <label className={labelCls}>Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Enter notes..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition resize-none"
            />
          </div>

          {/* Success */}
          {successMsg && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{successMsg}</p>
            </div>
          )}

          {/* Error */}
          {saveError && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
              <AlertCircle size={13} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">{saveError}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSaving || !employeeId || !date}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-sm shadow-blue-500/20"
          >
            {isSaving ? (
              <><Loader2 size={14} className="animate-spin" />Saving…</>
            ) : (
              'Save Attendance'
            )}
          </button>
    </form>
  );

  if (inModal) {
    return formBody;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center">
            <ClipboardEdit size={16} className="text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Attendance Entry</h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
              Add or edit for any date
            </p>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {formBody}
      </CardBody>
    </Card>
  );
}
