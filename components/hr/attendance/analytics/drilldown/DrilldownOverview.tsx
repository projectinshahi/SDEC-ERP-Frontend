'use client';

import {
  Percent,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarClock,
  CalendarOff,
  CalendarRange,
  BadgeCheck,
  CalendarDays,
} from 'lucide-react';
import { KpiCard, type Tone } from '@/components/sales-reports-exec/reportShared';
import type { AttendanceMetrics, EmployeeProfile } from '@/lib/hr/attendanceAnalytics.types';
import { formatDateShort } from './statusMeta';

/** Small profile fact (label over value). */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{value}</p>
    </div>
  );
}

export function DrilldownOverview({
  profile,
  metrics,
}: {
  profile: EmployeeProfile;
  metrics: AttendanceMetrics;
}) {
  const cards: { label: string; value: React.ReactNode; sub?: string; icon: typeof Percent; tone: Tone }[] = [
    { label: 'Attendance %', value: `${metrics.attendancePct}%`, sub: `${metrics.punctualityPct}% punctual`, icon: Percent, tone: 'indigo' },
    { label: 'Working Days', value: metrics.workingDays, sub: 'Mon–Sat calendar', icon: CalendarRange, tone: 'blue' },
    { label: 'Present', value: metrics.present, icon: CheckCircle2, tone: 'emerald' },
    { label: 'Absent', value: metrics.absent, icon: XCircle, tone: 'rose' },
    { label: 'Late', value: metrics.late, icon: Clock, tone: 'amber' },
    { label: 'Half Day Leave', value: metrics.halfDay, icon: CalendarClock, tone: 'violet' },
    { label: 'Full Day Leave', value: metrics.fullDayLeave, icon: CalendarOff, tone: 'blue' },
    { label: 'Payable Days*', value: metrics.payableDays, sub: `LOP ${metrics.lopDays}`, icon: CalendarDays, tone: 'emerald' },
  ];

  return (
    <div className="space-y-5">
      {/* Profile facts */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Fact label="Department" value={profile.department} />
          <Fact label="Designation" value={profile.designation} />
          <Fact label="Employee Code" value={profile.employeeCode || '—'} />
          <Fact label="Join Date" value={profile.joinDate ? formatDateShort(profile.joinDate) : '—'} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Status</p>
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium capitalize text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <BadgeCheck size={12} /> {profile.employmentStatus}
            </span>
          </div>
          {profile.phone && <Fact label="Phone" value={profile.phone} />}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((c) => (
          <KpiCard key={c.label} label={c.label} value={c.value} sub={c.sub} icon={c.icon} tone={c.tone} />
        ))}
      </div>

      <p className="text-[11px] text-gray-400">
        * Payable / LOP days are <span className="font-medium">Estimated for Payroll Reference</span> (attendance-derived).
      </p>
    </div>
  );
}
