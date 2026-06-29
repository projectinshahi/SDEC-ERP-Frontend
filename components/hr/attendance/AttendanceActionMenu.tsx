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
  return (
    <div className="flex items-center justify-end gap-1">
      {/* Edit */}
      <button
        onClick={() => onEdit(record)}
        title="Edit record"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-100 dark:border-violet-900/30 transition-colors"
      >
        <Pencil size={12} />
        Edit
      </button>

      {/* Delete */}
      <button
        onClick={() => onRemove(record.id)}
        title="Delete record"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-100 dark:border-rose-900/30 transition-colors"
      >
        <Trash2 size={12} />
        Delete
      </button>
    </div>
  );
}
