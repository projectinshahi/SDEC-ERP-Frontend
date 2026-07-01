'use client';

import { Plus, Download, Shield, User } from 'lucide-react';
import { ApiEmployee } from '@/lib/api/hr';

interface LeaveHeaderProps {
  userRole: 'admin' | 'staff';
  selectedEmployeeId: string;
  onRoleToggle: () => void;
  onEmployeeChange: (id: string) => void;
  onApplyLeaveClick: () => void;
  onExportClick: () => void;
  employees: ApiEmployee[];
  isSelfService?: boolean;
}

export function LeaveHeader({
  userRole,
  selectedEmployeeId,
  onRoleToggle,
  onEmployeeChange,
  onApplyLeaveClick,
  onExportClick,
  employees,
  isSelfService = false,
}: LeaveHeaderProps) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-gray-100 dark:border-gray-850/60 pb-6">
      {/* Title & Subtitle */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-300 mb-3 border border-teal-100 dark:border-teal-900/30">
          <Shield size={12} className="shrink-0" />
          Workforce Operations
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Leave Management
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {isSelfService || userRole === 'staff'
            ? 'View your remaining leave balance, submit requests, and check leave application status.'
            : 'Track employee absence, approve requests, and manage leave balances enterprise-wide.'}
        </p>
      </div>

      {/* Role Context Switcher & Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Role Toggle Switcher */}
        {!isSelfService && (
          <div className="inline-flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
            <button
              onClick={onRoleToggle}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                userRole === 'admin'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
              }`}
            >
              <Shield size={13} />
              HR Admin
            </button>
            <button
              onClick={onRoleToggle}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                userRole === 'staff'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
              }`}
            >
              <User size={13} />
              Staff User
            </button>
          </div>
        )}

        {/* Staff Switcher Dropdown (only visible in staff mode for admins) */}
        {!isSelfService && userRole === 'staff' && (
          <select
            value={selectedEmployeeId}
            onChange={(e) => onEmployeeChange(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-sm"
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.department})
              </option>
            ))}
          </select>
        )}

        {/* Export Button (HR only) */}
        {!isSelfService && userRole === 'admin' && (
          <button
            onClick={onExportClick}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-850 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-sm transition-all"
          >
            <Download size={15} />
            <span>Export</span>
          </button>
        )}

        {/* Apply Leave Button (Always visible) */}
        <button
          onClick={onApplyLeaveClick}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all border border-teal-600/10"
        >
          <Plus size={16} />
          <span>Apply Leave</span>
        </button>
      </div>
    </div>
  );
}
