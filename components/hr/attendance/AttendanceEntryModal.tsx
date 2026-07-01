'use client';

import React, { useEffect } from 'react';
import { X, ClipboardEdit } from 'lucide-react';
import { ApiEmployee } from '@/lib/api/hr';
import { ApiAttendanceRecord } from '@/lib/api/hr-attendance';
import { AttendanceFormPanel, AttendanceFormValues } from './AttendanceActionPanel';

interface AttendanceEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: ApiEmployee[];
  allRecords: ApiAttendanceRecord[];
  /** When set, the form pre-fills with this record's data (edit mode). */
  editRecord: ApiAttendanceRecord | null;
  isSaving: boolean;
  saveError: string | null;
  successMsg: string | null;
  onSave: (values: AttendanceFormValues) => void;
}

export function AttendanceEntryModal({
  isOpen,
  onClose,
  employees,
  allRecords,
  editRecord,
  isSaving,
  saveError,
  successMsg,
  onSave,
}: AttendanceEntryModalProps) {
  /* Close on Escape key */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  /* Prevent body scroll while open */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      aria-modal="true"
      role="dialog"
    >
      {/* Click-outside overlay */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-850 flex flex-col max-h-[90vh]">

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-850 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center">
              <ClipboardEdit size={16} className="text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                {editRecord ? 'Edit Attendance' : 'Attendance Entry'}
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                {editRecord ? 'Update existing record' : 'Add or edit for any date'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="overflow-y-auto flex-1 p-5">
          <AttendanceFormPanel
            employees={employees}
            allRecords={allRecords}
            editRecord={editRecord}
            isSaving={isSaving}
            saveError={saveError}
            successMsg={successMsg}
            onSave={onSave}
            inModal
          />
        </div>
      </div>
    </div>
  );
}
