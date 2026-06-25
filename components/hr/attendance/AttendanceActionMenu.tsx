'use client';

import React from 'react';
import { MoreVertical, Eye, Edit, MessageSquare, Trash2 } from 'lucide-react';
import { AttendanceRecord } from '@/lib/hr/attendance.types';

interface AttendanceActionMenuProps {
  record: AttendanceRecord;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onView: (record: AttendanceRecord) => void;
  onEdit: (record: AttendanceRecord) => void;
  onNote: (record: AttendanceRecord) => void;
  onRemove: (id: string) => void;
}

export function AttendanceActionMenu({
  record,
  isOpen,
  onToggle,
  onClose,
  onView,
  onEdit,
  onNote,
  onRemove,
}: AttendanceActionMenuProps) {
  return (
    <div className="relative inline-block text-left">
      <button
        onClick={onToggle}
        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition"
        aria-label="Actions"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <>
          {/* Click-outside overlay */}
          <div className="fixed inset-0 z-30" onClick={onClose} />

          <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-xl shadow-xl z-40 py-1.5 overflow-hidden">
            <button
              onClick={() => { onView(record); onClose(); }}
              className="w-full px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition flex items-center gap-2"
            >
              <Eye size={13} />
              View Details
            </button>
            <button
              onClick={() => { onEdit(record); onClose(); }}
              className="w-full px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition flex items-center gap-2"
            >
              <Edit size={13} />
              Edit Record
            </button>
            <button
              onClick={() => { onNote(record); onClose(); }}
              className="w-full px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition flex items-center gap-2"
            >
              <MessageSquare size={13} />
              Add Note
            </button>
            <div className="border-t border-gray-100 dark:border-gray-700/60 my-1" />
            <button
              onClick={() => { onRemove(record.id); onClose(); }}
              className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition flex items-center gap-2"
            >
              <Trash2 size={13} />
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  );
}
