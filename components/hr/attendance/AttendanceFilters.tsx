'use client';

import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Card } from '@/components/Card';
import { AttendanceFilters } from '@/lib/hr/attendance.types';
import { ATTENDANCE_DEPARTMENTS, ATTENDANCE_STATUSES } from '@/lib/hr/attendance.mock';

interface AttendanceFiltersBarProps {
  filters: AttendanceFilters;
  onChange: (next: Partial<AttendanceFilters>) => void;
  totalResults: number;
  filteredResults: number;
}

export function AttendanceFiltersBar({
  filters,
  onChange,
  totalResults,
  filteredResults,
}: AttendanceFiltersBarProps) {
  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          {/* Search input */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
            />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              placeholder="Search by name, ID, or department…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-200"
            />
          </div>

          {/* Department filter */}
          <select
            value={filters.department}
            onChange={(e) => onChange({ department: e.target.value })}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition md:w-44"
          >
            {ATTENDANCE_DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept === 'All' ? 'All Departments' : dept}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value })}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition md:w-40"
          >
            {ATTENDANCE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Statuses' : s}
              </option>
            ))}
          </select>

          {/* Results badge */}
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal size={14} className="text-gray-400 dark:text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {filteredResults} / {totalResults} records
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
