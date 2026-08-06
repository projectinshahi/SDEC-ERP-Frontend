/**
 * Shared status colour / label helpers for the Employee drill-down (M3.3).
 * The palette mirrors the AttendanceStatusBadge / StatusDistributionDonut colour
 * language (present=emerald, late=amber, half=sky, full-leave=blue, absent=rose)
 * so the drawer stays visually consistent with the rest of the ERP.
 */
import React from 'react';
import { ApiAttendanceSettings } from '@/lib/api/hr-attendance-settings';

export function getSettingColor(status: string, settings: ApiAttendanceSettings | null): string | null {
  if (!settings) return null;
  const normalized = status.toLowerCase().replace(/ /g, '_');
  switch (normalized) {
    case 'present': return settings.present_color;
    case 'late':
    case 'late_after_lunch': return settings.late_color;
    case 'leave_full_day':
    case 'full_day_leave':
    case 'leave_half_day':
    case 'half_day_leave':
    case 'on_leave': return settings.leave_color;
    case 'half_day': return settings.half_day_color;
    case 'absent': return settings.absent_color;
    default: return null;
  }
}

export const STATUS_LABEL: Record<string, string> = {
  present: 'Present',
  late: 'Late',
  late_after_lunch: 'Late (after lunch)',
  leave_half_day: 'Half Day Leave',
  leave_full_day: 'Full Day Leave',
  half_day: 'Half Day',
  absent: 'Absent',
};

/** Human-readable label for any status/leave value (falls back to Title Case). */
export function prettyLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? prettyLabel(status);
}

/** Badge/chip classes per status (light + dark). */
const STATUS_CHIP: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  late: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  late_after_lunch: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  leave_full_day: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  leave_half_day: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  half_day: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  absent: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};
export function chipClass(status: string): string {
  return STATUS_CHIP[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
}
export function chipStyle(status: string, settings: ApiAttendanceSettings | null): React.CSSProperties {
  const color = getSettingColor(status, settings);
  if (color) return { backgroundColor: `${color}20`, color: color };
  return {};
}

/** Solid calendar-cell fill classes per status. */
const STATUS_CELL: Record<string, string> = {
  present: 'bg-emerald-500 text-white',
  late: 'bg-amber-500 text-white',
  late_after_lunch: 'bg-orange-500 text-white',
  leave_full_day: 'bg-blue-500 text-white',
  leave_half_day: 'bg-sky-500 text-white',
  half_day: 'bg-violet-500 text-white',
  absent: 'bg-rose-500 text-white',
};
export function cellClass(status: string): string {
  return STATUS_CELL[status] ?? 'bg-gray-400 text-white';
}
export function cellStyle(status: string, settings: ApiAttendanceSettings | null): React.CSSProperties {
  const color = getSettingColor(status, settings);
  if (color) return { backgroundColor: color, color: '#ffffff' };
  return {};
}

/** Small dot colour per status (for legends). */
const STATUS_DOT: Record<string, string> = {
  present: 'bg-emerald-500',
  late: 'bg-amber-500',
  late_after_lunch: 'bg-orange-500',
  leave_full_day: 'bg-blue-500',
  leave_half_day: 'bg-sky-500',
  half_day: 'bg-violet-500',
  absent: 'bg-rose-500',
};
export function dotClass(status: string): string {
  return STATUS_DOT[status] ?? 'bg-gray-400';
}
export function dotStyle(status: string, settings: ApiAttendanceSettings | null): React.CSSProperties {
  const color = getSettingColor(status, settings);
  if (color) return { backgroundColor: color };
  return {};
}

// ── Date formatting (timezone-safe: parses the YYYY-MM-DD parts directly) ──────

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** 'YYYY-MM-DD' → "Mon, 07 Jul 2026" without crossing timezones. */
export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DOW_SHORT[dow]}, ${String(d).padStart(2, '0')} ${MONTHS_SHORT[m - 1]} ${y}`;
}

/** 'YYYY-MM-DD' → "07 Jul 2026". */
export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS_SHORT[m - 1]} ${y}`;
}
