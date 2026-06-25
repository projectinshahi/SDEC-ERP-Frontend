'use client';

import React from 'react';
import { ClipboardList } from 'lucide-react';

export function AttendanceEmptyState() {
  return (
    <tr>
      <td colSpan={8} className="py-20 text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 flex items-center justify-center text-gray-300 dark:text-gray-600 mb-4">
            <ClipboardList size={26} />
          </div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
            No attendance records found
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 max-w-xs leading-relaxed">
            No records match your current filters. Try adjusting the search
            term, department, or status.
          </p>
        </div>
      </td>
    </tr>
  );
}
