'use client';

import { Users, UserCheck, UserX, Clock, PieChart, CalendarOff, Percent, CalendarDays } from 'lucide-react';
import { KpiCard, type Tone } from '@/components/sales-reports-exec/reportShared';
import type { AnalyticsSummary } from '@/lib/hr/attendanceAnalytics.types';

/** KPI card row for the Attendance Analytics tab — reuses the Sales KpiCard. */
export function AnalyticsKpiCards({ summary }: { summary: AnalyticsSummary }) {
  const cards: { label: string; value: React.ReactNode; sub: string; icon: typeof Users; tone: Tone }[] = [
    { label: 'Total Employees', value: summary.totalEmployees, sub: 'Active in scope', icon: Users, tone: 'indigo' },
    { label: 'Present', value: summary.present, sub: 'Present days', icon: UserCheck, tone: 'emerald' },
    { label: 'Absent', value: summary.absent, sub: 'Absent days', icon: UserX, tone: 'rose' },
    { label: 'Late', value: summary.late, sub: 'Late arrivals', icon: Clock, tone: 'amber' },
    { label: 'Half Day Leave', value: summary.halfDay, sub: 'Half-day leaves', icon: PieChart, tone: 'blue' },
    { label: 'Full Day Leave', value: summary.fullDayLeave, sub: 'Full-day leaves', icon: CalendarOff, tone: 'violet' },
    { label: 'Attendance %', value: `${summary.attendancePct}%`, sub: `${summary.workingDays} working days`, icon: Percent, tone: 'emerald' },
    { label: 'Working Days', value: summary.workingDays, sub: 'Mon–Sat basis', icon: CalendarDays, tone: 'blue' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {cards.map((c) => (
        <KpiCard key={c.label} label={c.label} value={c.value} sub={c.sub} icon={c.icon} tone={c.tone} />
      ))}
    </div>
  );
}
