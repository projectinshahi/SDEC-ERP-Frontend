'use client';

import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { AttendanceRecord } from '@/lib/hr/attendance.types';

interface AttendanceInlineActionsProps {
  record: AttendanceRecord;
  onEdit: (record: AttendanceRecord) => void;
  onRemove: (id: string) => void;
}

export function AttendanceActionMenu({
  record,
  onEdit,
  onRemove,
}: AttendanceInlineActionsProps) {
  const isVirtual = record.id.startsWith('virtual-');

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Edit or Add */}
      <button
        onClick={() => onEdit(record)}
        title={isVirtual ? "Add attendance record" : "Edit record"}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-100 dark:border-blue-900/30 transition-colors"
      >
        <Pencil size={12} />
        {isVirtual ? 'Add Attendance' : 'Edit'}
      </button>

      {/* Delete (only for non-virtual records) */}
      {!isVirtual && (
        <button
          onClick={() => onRemove(record.id)}
          title="Delete record"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-100 dark:border-rose-900/30 transition-colors"
        >
          <Trash2 size={12} />
          Delete
        </button>
      )}
    </div>
  );
}

