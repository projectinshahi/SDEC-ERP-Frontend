'use client';

import { Search, Calendar, RefreshCw } from 'lucide-react';
import { LeaveFilters as FiltersType } from '@/lib/hr/leave.types';
import { LEAVE_DEPARTMENTS, LEAVE_TYPES, LEAVE_STATUSES } from '@/lib/hr/leave.mock';
import { Card, CardBody } from '@/components/Card';

interface LeaveFiltersProps {
  filters: FiltersType;
  onChange: (next: Partial<FiltersType>) => void;
  userRole: 'admin' | 'staff';
}

export function LeaveFilters({ filters, onChange, userRole }: LeaveFiltersProps) {
  const handleReset = () => {
    onChange({
      search: '',
      department: 'All',
      leaveType: 'All',
      status: 'All',
      startDate: '',
      endDate: '',
    });
  };

  const hasActiveFilters = 
    filters.search !== '' ||
    filters.department !== 'All' ||
    filters.leaveType !== 'All' ||
    filters.status !== 'All' ||
    filters.startDate !== '' ||
    filters.endDate !== '';

  return (
    <Card className="border border-gray-100 dark:border-gray-850 shadow-sm">
      <CardBody className="p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          {/* Main Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            
            {/* Search Input (Admin sees "Search employee / reason", Staff sees "Search reason") */}
            <div className={userRole === 'admin' ? 'lg:col-span-3' : 'lg:col-span-4'}>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5 uppercase tracking-wider">
                Search
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={userRole === 'admin' ? "Search employee, ID or reason..." : "Search reason..."}
                  value={filters.search}
                  onChange={(e) => onChange({ search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50/50 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/50 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-1 focus:ring-teal-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Department (Admin only) */}
            {userRole === 'admin' && (
              <div className="lg:col-span-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5 uppercase tracking-wider">
                  Department
                </label>
                <select
                  value={filters.department}
                  onChange={(e) => onChange({ department: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-850 rounded-xl text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all shadow-2xs"
                >
                  {LEAVE_DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Leave Type */}
            <div className={userRole === 'admin' ? 'lg:col-span-2' : 'lg:col-span-2'}>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5 uppercase tracking-wider">
                Leave Type
              </label>
              <select
                value={filters.leaveType}
                onChange={(e) => onChange({ leaveType: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-850 rounded-xl text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all shadow-2xs"
              >
                {LEAVE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5 uppercase tracking-wider">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => onChange({ status: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-850 rounded-xl text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all shadow-2xs"
              >
                {LEAVE_STATUSES.map(stat => (
                  <option key={stat} value={stat}>{stat}</option>
                ))}
              </select>
            </div>

            {/* Date Filters */}
            <div className={userRole === 'admin' ? 'lg:col-span-3' : 'lg:col-span-4'}>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5 uppercase tracking-wider">
                Date Range
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => onChange({ startDate: e.target.value })}
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-850 rounded-xl text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-2xs"
                  />
                </div>
                <span className="text-gray-400 text-xs">to</span>
                <div className="relative flex-1">
                  <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => onChange({ endDate: e.target.value })}
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-850 rounded-xl text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Reset Filters / Indicator Row */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-850 pt-3">
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                Filters are active. Results are filtered down.
              </span>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/20 rounded-lg transition-all"
              >
                <RefreshCw size={12} className="shrink-0 animate-spin-hover" />
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
