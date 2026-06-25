'use client';

import { FileText, Clock, CheckCircle2, XCircle, CalendarDays, Percent } from 'lucide-react';
import { KPIStatCard } from '@/components/hr/KPIStatCard';
import { LeaveStats as LeaveStatsType } from '@/lib/hr/leave.types';

interface LeaveStatsProps {
  stats: LeaveStatsType;
  userRole: 'admin' | 'staff';
}

export function LeaveStats({ stats, userRole }: LeaveStatsProps) {
  // Stats are primarily for Admin. In Staff mode, we could show staff-specific KPI values,
  // but let's conditionally show this panel only for HR Admin to keep the interface highly tailored.
  if (userRole !== 'admin') return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <KPIStatCard
        label="Total Requests"
        value={stats.totalRequests}
        subtitle="Cumulative applications"
        icon={FileText}
        variant="blue"
      />

      <KPIStatCard
        label="Pending"
        value={stats.pendingRequests}
        subtitle="Requires HR action"
        icon={Clock}
        variant="amber"
      />

      <KPIStatCard
        label="Approved"
        value={stats.approvedRequests}
        subtitle="Completed approvals"
        icon={CheckCircle2}
        variant="emerald"
      />

      <KPIStatCard
        label="Rejected"
        value={stats.rejectedRequests}
        subtitle="Declined applications"
        icon={XCircle}
        variant="rose"
      />

      <KPIStatCard
        label="On Leave Today"
        value={stats.employeesOnLeaveToday}
        subtitle="Active absences today"
        icon={CalendarDays}
        variant="violet"
      />

      <KPIStatCard
        label="Approval Rate"
        value={`${stats.approvalRate}%`}
        subtitle="Approved vs. Rejected"
        icon={Percent}
        variant="teal"
      />
    </div>
  );
}
