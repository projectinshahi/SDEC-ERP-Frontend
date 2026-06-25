'use client';

import React from 'react';
import { Clock, Download, Plus, Calendar } from 'lucide-react';

interface AttendanceHeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function AttendanceHeader({ selectedDate, onDateChange }: AttendanceHeaderProps) {
  const formatted = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      {/* Left: title block */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300 mb-3 border border-violet-100 dark:border-violet-900/30">
          <Clock size={12} />
          Attendance Module
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Attendance Tracking
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
          Track daily punch-in / out logs and workforce attendance status.
        </p>
      </div>

      {/* Right: date picker + action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Date picker */}
        <div className="relative">
          <Calendar
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
          />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            title={formatted}
            className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition-all duration-200"
          />
        </div>

        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
          <Download size={15} />
          <span>Export</span>
        </button>

        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition shadow-sm shadow-violet-500/20">
          <Plus size={15} />
          <span>Add Record</span>
        </button>
      </div>
    </div>
  );
}
