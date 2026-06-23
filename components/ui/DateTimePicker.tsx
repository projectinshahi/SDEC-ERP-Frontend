'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, isAfter, startOfDay,
} from 'date-fns';
import { classNames } from '@/lib/utils';

interface DateTimePickerProps {
  id: string;
  label: string;
  /** datetime-local string: 'YYYY-MM-DDTHH:mm'. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Latest allowed datetime ('YYYY-MM-DDTHH:mm'); later days are disabled. */
  max?: string;
  required?: boolean;
  disabled?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
// Approximate popover size — used only to decide up/down placement.
const POPOVER_W = 300;
const POPOVER_H = 392;

/** Parse a 'YYYY-MM-DDTHH:mm' string into a LOCAL Date (no timezone shift). */
function parseValue(s?: string): Date | null {
  if (!s) return null;
  const [datePart, timePart] = s.split('T');
  const [y, mo, d] = (datePart || '').split('-').map(Number);
  const [h, mi] = (timePart || '00:00').split(':').map(Number);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d, h || 0, mi || 0);
}

function toValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Custom date & time picker rendered in a portal so it is never clipped by a
 * modal/dialog, with dynamic placement: it opens UPWARD when there isn't enough
 * room below (and stays within the viewport). Replaces the native
 * datetime-local input, whose popup can't be repositioned.
 */
export function DateTimePicker({ id, label, value, onChange, error, max, required, disabled }: DateTimePickerProps) {
  const selected = parseValue(value);
  const maxDate = parseValue(max);

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(selected ?? new Date());
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Position the popover above or below the trigger based on available space.
  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const placeAbove = spaceBelow < POPOVER_H + margin && spaceAbove > spaceBelow;
    const top = placeAbove ? Math.max(margin, r.top - POPOVER_H - margin) : r.bottom + margin;
    let left = r.left;
    if (left + POPOVER_W > window.innerWidth - margin) left = window.innerWidth - POPOVER_W - margin;
    if (left < margin) left = margin;
    setCoords({ top, left, placement: placeAbove ? 'top' : 'bottom' });
  }, []);

  const openPicker = () => {
    if (disabled) return;
    setViewMonth(selected ?? new Date());
    reposition(); // compute before first render so there's no flash
    setOpen(true);
  };

  // While open: keep positioned on scroll/resize, close on outside-click, and
  // close on Escape (capture + stopPropagation so the parent modal stays open).
  useEffect(() => {
    if (!open) return;
    const onScrollResize = () => reposition();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, reposition]);

  const base = selected ?? new Date();
  const emit = (d: Date) => onChange(toValue(d));

  const pickDay = (day: Date) => {
    const d = new Date(day);
    d.setHours(base.getHours(), base.getMinutes(), 0, 0);
    emit(d);
  };
  const setHour = (h: number) => { const d = new Date(base); d.setHours(h); emit(d); };
  const setMinute = (mi: number) => { const d = new Date(base); d.setMinutes(mi); emit(d); };
  const setNow = () => { const n = new Date(); n.setSeconds(0, 0); setViewMonth(n); emit(n); };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth)),
    end: endOfWeek(endOfMonth(viewMonth)),
  });
  const dayDisabled = (d: Date) => (maxDate ? isAfter(startOfDay(d), startOfDay(maxDate)) : false);
  const display = selected ? format(selected, 'MMM d, yyyy · h:mm a') : 'Select date & time';

  return (
    <div className="space-y-1.5 w-full">
      <label htmlFor={id} className={classNames('block text-sm font-semibold', error ? 'text-red-500' : 'text-gray-700 dark:text-gray-300')}>
        {label}{required && <span className="text-red-500 ml-1 font-bold">*</span>}
      </label>

      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={classNames(
          'w-full flex items-center gap-2 py-2.5 px-3.5 rounded-xl border text-sm font-medium text-left transition-all bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
          error ? 'border-red-300 text-red-900' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-900 dark:text-gray-100',
          disabled && 'bg-gray-50 text-gray-400 cursor-not-allowed',
        )}
      >
        <CalendarIcon size={16} className="text-gray-400 shrink-0" />
        <span className={classNames('flex-1', !selected && 'text-gray-400')}>{display}</span>
      </button>

      {error && (
        <p id={`${id}-error`} role="alert" className="text-red-500 text-xs font-semibold flex items-center gap-1 mt-1">
          <AlertCircle size={12} className="inline flex-shrink-0" />{error}
        </p>
      )}

      {open && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`${label} picker`}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: POPOVER_W, maxHeight: 'calc(100vh - 16px)', overflowY: 'auto' }}
          className="z-[1000] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl p-3 animate-scale-in"
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" aria-label="Previous month" onClick={() => setViewMonth(subMonths(viewMonth, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{format(viewMonth, 'MMMM yyyy')}</span>
            <button type="button" aria-label="Next month" onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w) => <div key={w} className="text-center text-[11px] font-semibold text-gray-400 py-1">{w}</div>)}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d) => {
              const isSel = selected ? isSameDay(d, selected) : false;
              const muted = !isSameMonth(d, viewMonth);
              const dis = dayDisabled(d);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  disabled={dis}
                  onClick={() => pickDay(d)}
                  className={classNames(
                    'h-8 rounded-lg text-xs font-medium transition-colors',
                    isSel
                      ? 'bg-blue-600 text-white'
                      : muted
                        ? 'text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
                    dis && 'opacity-30 cursor-not-allowed hover:bg-transparent',
                  )}
                >
                  {format(d, 'd')}
                </button>
              );
            })}
          </div>

          {/* Time selectors */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs font-semibold text-gray-500">Time</span>
            <select
              aria-label="Hour"
              value={base.getHours()}
              onChange={(e) => setHour(Number(e.target.value))}
              className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
            >
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{pad(h)}</option>)}
            </select>
            <span className="text-gray-400 font-semibold">:</span>
            <select
              aria-label="Minute"
              value={base.getMinutes()}
              onChange={(e) => setMinute(Number(e.target.value))}
              className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
            >
              {Array.from({ length: 60 }, (_, mi) => <option key={mi} value={mi}>{pad(mi)}</option>)}
            </select>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            <button type="button" onClick={setNow} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Now</button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Done</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
