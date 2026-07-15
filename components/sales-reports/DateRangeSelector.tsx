'use client';

/**
 * SE-039.1 — Universal date-range filter, reusable across all sales report
 * pages. Exposes a controlled `{ value, onChange }` API operating on the API
 * `ReportWindow` (we emit concrete `{ from, to }` ISO dates so the backend
 * receives an unambiguous window).
 *
 * Named presets (Today … Last Month) compute concrete dates from `new Date()`.
 * "Custom Range" reveals two date inputs and validates `end >= start` — an
 * invalid range is blocked (not emitted) with an inline message.
 */

import { useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import type { ReportWindow } from '@/lib/api/salesReports';

export type RangePreset =
  | 'allTime'
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'thisYear'
  | 'custom';

const PRESET_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: 'allTime', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisQuarter', label: 'This Quarter' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

/** Format a Date as a local `YYYY-MM-DD` string (no UTC shift). */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Resolve a named preset to a concrete `{ from, to }` window. */
export function presetWindow(name: Exclude<RangePreset, 'custom'>): ReportWindow {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfDay(now);

  switch (name) {
    case 'today':
      return { from: toISODate(today), to: toISODate(today) };
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: toISODate(y), to: toISODate(y) };
    }
    case 'last7': {
      const from = new Date(today);
      from.setDate(from.getDate() - 6); // inclusive of today → 7 days
      return { from: toISODate(from), to: toISODate(today) };
    }
    case 'last30': {
      const from = new Date(today);
      from.setDate(from.getDate() - 29); // inclusive of today → 30 days
      return { from: toISODate(from), to: toISODate(today) };
    }
    case 'thisMonth': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: toISODate(from), to: toISODate(today) };
    }
    case 'lastMonth': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0); // last day of prev month
      return { from: toISODate(from), to: toISODate(to) };
    }
    case 'thisQuarter': {
      const currentQuarter = Math.floor(today.getMonth() / 3);
      const from = new Date(today.getFullYear(), currentQuarter * 3, 1);
      return { from: toISODate(from), to: toISODate(today) };
    }
    case 'thisYear': {
      const from = new Date(today.getFullYear(), 0, 1);
      return { from: toISODate(from), to: toISODate(today) };
    }
    case 'allTime':
      return { from: '', to: '' };
    default:
      return { from: toISODate(today), to: toISODate(today) };
  }
}

/** The default window the selector initialises to (Last 30 Days). */
export const defaultRangeWindow: ReportWindow = presetWindow('last30');

export function DateRangeSelector({
  value,
  onChange,
  defaultPreset = 'last30',
}: {
  value: ReportWindow;
  onChange: (w: ReportWindow) => void;
  defaultPreset?: RangePreset;
}) {
  const [preset, setPreset] = useState<RangePreset>(defaultPreset);
  // Local custom-range buffers — only committed to `onChange` once valid.
  const [customStart, setCustomStart] = useState<string>(value.from ?? '');
  const [customEnd, setCustomEnd] = useState<string>(value.to ?? '');

  const rangeError = useMemo(() => {
    if (preset !== 'custom') return '';
    if (!customStart || !customEnd) return '';
    return customEnd < customStart ? 'End date must be on or after the start date.' : '';
  }, [preset, customStart, customEnd]);

  const handlePreset = (next: RangePreset) => {
    setPreset(next);
    if (next !== 'custom') {
      onChange(presetWindow(next));
    } else if (customStart && customEnd && customEnd >= customStart) {
      onChange({ from: customStart, to: customEnd });
    }
  };

  const commitCustom = (start: string, end: string) => {
    if (start && end && end >= start) {
      onChange({ from: start, to: end });
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-3 print:hidden">
      <div className="w-48">
        <SelectField
          id="report-date-range"
          label="Date Range"
          icon={CalendarRange}
          options={PRESET_OPTIONS}
          value={preset}
          onChange={(v) => handlePreset(v as RangePreset)}
        />
      </div>

      {preset === 'custom' && (
        <>
          <div className="w-44">
            <InputField
              id="report-range-start"
              label="Start"
              type="date"
              value={customStart}
              max={customEnd || undefined}
              onChange={(v) => {
                setCustomStart(v);
                commitCustom(v, customEnd);
              }}
            />
          </div>
          <div className="w-44">
            <InputField
              id="report-range-end"
              label="End"
              type="date"
              value={customEnd}
              min={customStart || undefined}
              error={rangeError || undefined}
              onChange={(v) => {
                setCustomEnd(v);
                commitCustom(customStart, v);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
