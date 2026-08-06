'use client';

import React from 'react';
import { AttendanceStatus } from '@/lib/hr/attendance.types';
import { useAttendanceSettings } from '@/lib/hr/useAttendanceSettings';
import { getSettingColor } from './analytics/drilldown/statusMeta';

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
  /** Overrides the displayed text while keeping the status-based colour. */
  label?: string;
}

const BADGE_MAP: Record<
  AttendanceStatus,
  { dot: string; bg: string; text: string; border: string }
> = {
  Present: {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-100 dark:border-emerald-900/30',
  },
  Absent: {
    dot: 'bg-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/20',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-100 dark:border-rose-900/30',
  },
  Late: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-100 dark:border-amber-900/30',
  },
  'Late After Lunch': {
    dot: 'bg-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-100 dark:border-orange-900/30',
  },
  'Full Day Leave': {
    dot: 'bg-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-100 dark:border-blue-900/30',
  },
  'Half Day Leave': {
    dot: 'bg-sky-500',
    bg: 'bg-sky-50 dark:bg-sky-950/20',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-100 dark:border-sky-900/30',
  },
  'Half Day': {
    dot: 'bg-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-100 dark:border-blue-900/30',
  },
  'On Leave': {
    dot: 'bg-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-100 dark:border-blue-900/30',
  },
};

export function AttendanceStatusBadge({ status, label }: AttendanceStatusBadgeProps) {
  const { settings } = useAttendanceSettings();
  const styles = BADGE_MAP[status] ?? BADGE_MAP['Absent'];
  const customColor = getSettingColor(status, settings);

  if (customColor) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border`}
        style={{ backgroundColor: `${customColor}20`, color: customColor, borderColor: `${customColor}30` }}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0`} style={{ backgroundColor: customColor }} />
        {label ?? status}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${styles.bg} ${styles.text} ${styles.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot} shrink-0`} />
      {label ?? status}
    </span>
  );
}
