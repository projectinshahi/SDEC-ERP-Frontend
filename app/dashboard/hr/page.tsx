'use client';

import { useState } from 'react';
import {
  Users,
  UserCheck,
  CalendarDays,
  Clock,
  UserPlus,
  Briefcase,
  Banknote,
  Calendar,
} from 'lucide-react';

import { KPIStatCard } from '@/components/hr/KPIStatCard';
import { AttendanceTable } from '@/components/hr/AttendanceTable';
import { LeaveRequestsCard } from '@/components/hr/LeaveRequestsCard';
import { RecruitmentPipeline } from '@/components/hr/RecruitmentPipeline';
import { UpcomingInterviews } from '@/components/hr/UpcomingInterviews';
import { AttendanceSummaryChart } from '@/components/hr/AttendanceSummaryChart';
import { PayrollOverview } from '@/components/hr/PayrollOverview';
import { QuickActions } from '@/components/hr/QuickActions';

export default function HRDashboard() {
  const [selectedDate, setSelectedDate] = useState('2026-06-24');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300 mb-3">
            Human Resource Management
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            HR Dashboard
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Welcome back, HR Admin! Here’s what’s happening today.
          </p>
        </div>

        {/* Date Picker */}
        <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-300">
            <Calendar size={16} />
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        <KPIStatCard
          label="Total Employees"
          value="48"
          subtitle="View all employees"
          icon={Users}
          variant="indigo"
        />

        <KPIStatCard
          label="Present Today"
          value="35"
          subtitle="72.9% of total"
          icon={UserCheck}
          variant="emerald"
        />

        <KPIStatCard
          label="On Leave"
          value="6"
          subtitle="12.5% of total"
          icon={CalendarDays}
          variant="rose"
        />

        <KPIStatCard
          label="Late Check-ins"
          value="4"
          subtitle="8.3% of present"
          icon={Clock}
          variant="amber"
        />

        <KPIStatCard
          label="New Joiners"
          value="3"
          subtitle="This Month"
          icon={UserPlus}
          variant="violet"
        />

        <KPIStatCard
          label="Open Positions"
          value="7"
          subtitle="View all jobs"
          icon={Briefcase}
          variant="blue"
        />

        <KPIStatCard
          label="Pending Interviews"
          value="11"
          subtitle="View all"
          icon={CalendarDays}
          variant="sky"
        />

        <KPIStatCard
          label="Payroll Pending"
          value="₹8,45,000"
          subtitle="For 12 Employees"
          icon={Banknote}
          variant="teal"
        />
      </div>

      {/* Main Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <AttendanceTable />
        </div>

        <div className="lg:col-span-4">
          <LeaveRequestsCard />
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RecruitmentPipeline />
        <UpcomingInterviews />
        <AttendanceSummaryChart />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <PayrollOverview />
        </div>

        <div className="lg:col-span-4">
          <QuickActions />
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-6 border-t border-gray-200 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          <p>© 2026 SKPC Solutions Pvt Ltd. All rights reserved.</p>

          <div className="flex items-center gap-4">
            <a
              href="#"
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Privacy Policy
            </a>

            <span className="text-gray-300 dark:text-gray-700">|</span>

            <a
              href="#"
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}