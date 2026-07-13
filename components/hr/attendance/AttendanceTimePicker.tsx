'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Compact 12-hour time picker (Hour 01–12 · Minute 00–59 · AM/PM) built from
 * styled native <select>s — keyboard accessible, never clipped inside a
 * scrollable modal, and no extra dependency.
 *
 * Drop-in replacement for <input type="time">: the external `value` and
 * `onChange` both use the 24-hour "HH:MM" form-state format, so the surrounding
 * form architecture (and its to12h() → API conversion) is unchanged.
 */
interface AttendanceTimePickerProps {
  /** 24h "HH:MM" (e.g. "13:00"), or '' when unset. */
  value: string;
  /** Emits 24h "HH:MM" (or '' when the time is incomplete). */
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

type Period = 'AM' | 'PM';
interface Parts { hour: string; minute: string; period: Period }

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')); // 01..12
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));    // 00..59

/** 24h "HH:MM" → { hour(12h), minute, period }. */
function parse(value: string): Parts {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  if (!m) return { hour: '', minute: '', period: 'AM' };
  let h = parseInt(m[1], 10);
  const period: Period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return { hour: String(h).padStart(2, '0'), minute: m[2], period };
}

/** { hour(12h), minute, period } → 24h "HH:MM" ('' when hour/minute missing). */
function build({ hour, minute, period }: Parts): string {
  if (!hour || !minute) return '';
  let h = parseInt(hour, 10) % 12;
  if (period === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${minute}`;
}

const selectCls =
  'appearance-none rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-3 pr-7 text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-800/60 disabled:cursor-not-allowed transition';

export function AttendanceTimePicker({ value, onChange, disabled, id }: AttendanceTimePickerProps) {
  // Local part-state so a partial selection (e.g. hour chosen, minute not yet)
  // is preserved instead of collapsing back to empty. Re-sync only when the
  // external value changes for a reason other than our own emit.
  const [parts, setParts] = useState<Parts>(() => parse(value));
  const lastEmitted = useRef<string>(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setParts(parse(value));
      lastEmitted.current = value;
    }
  }, [value]);

  const update = (next: Partial<Parts>) => {
    const merged = { ...parts, ...next };
    setParts(merged);
    const built = build(merged);
    lastEmitted.current = built;
    onChange(built);
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Hour */}
      <div className="relative">
        <select
          id={id}
          aria-label="Hour"
          disabled={disabled}
          value={parts.hour}
          onChange={(e) => update({ hour: e.target.value })}
          className={`${selectCls} w-[64px]`}
        >
          <option value="">HH</option>
          {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>

      <span className="text-sm font-bold text-gray-400 dark:text-gray-500">:</span>

      {/* Minute */}
      <div className="relative">
        <select
          aria-label="Minute"
          disabled={disabled}
          value={parts.minute}
          onChange={(e) => update({ minute: e.target.value })}
          className={`${selectCls} w-[64px]`}
        >
          <option value="">MM</option>
          {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>

      {/* AM / PM */}
      <div className="relative">
        <select
          aria-label="AM or PM"
          disabled={disabled}
          value={parts.period}
          onChange={(e) => update({ period: e.target.value as Period })}
          className={`${selectCls} w-[68px]`}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
        <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>
    </div>
  );
}
