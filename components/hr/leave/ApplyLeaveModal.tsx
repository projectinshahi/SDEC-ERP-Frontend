'use client';

import React, { useState } from 'react';
import { X, Paperclip, AlertCircle, ChevronDown } from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/Card';
import { LEAVE_TYPES } from '@/lib/hr/leave.mock';
import { ApiEmployee } from '@/lib/api/hr';

interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: ApiEmployee[];
  isSelfService?: boolean;
  currentEmployeeId?: number;
  isSaving?: boolean;
  onSubmit: (data: {
    employeeId: number;
    leaveType: string;
    startDate: string;
    endDate: string;
    halfDay: boolean;
    halfPeriod?: 'first_half' | 'second_half' | null;
    reason: string;
    attachmentName?: string;
  }) => void;
}

export function ApplyLeaveModal({
  isOpen,
  onClose,
  employees,
  isSelfService = false,
  currentEmployeeId,
  isSaving = false,
  onSubmit,
}: ApplyLeaveModalProps) {
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  
  // Set employee ID based on role/props when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (isSelfService) {
        setEmployeeId(currentEmployeeId ?? 0);
      } else {
        setEmployeeId(employees[0]?.id ?? null);
      }
    }
  }, [isOpen, isSelfService, currentEmployeeId, employees]);

  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [halfDay, setHalfDay] = useState(false);
  const [halfPeriod, setHalfPeriod] = useState<'first_half' | 'second_half' | null>(null);
  const [reason, setReason] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isSelfService && !employeeId) {
      setError('Please select an employee.');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please select both Start Date and End Date.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      setError('End Date cannot be before Start Date.');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for your leave request.');
      return;
    }

    if (halfDay && !halfPeriod) {
      setError('Please choose First Half or Second Half for a half-day leave.');
      return;
    }

    onSubmit({
      employeeId: employeeId ?? 0,
      leaveType,
      startDate,
      endDate,
      halfDay,
      halfPeriod: halfDay ? halfPeriod : null,
      reason,
      attachmentName: attachmentName || undefined,
    });

    // Reset Form
    setLeaveType('Casual Leave');
    setStartDate('');
    setEndDate('');
    setHalfDay(false);
    setHalfPeriod(null);
    setReason('');
    setAttachmentName('');
  };

  const handleSimulateFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachmentName(e.target.files[0].name);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      {/* Modal Container Card */}
      <Card className="w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-200 dark:border-gray-850">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <CardHeader className="flex items-center justify-between pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Apply for Leave
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Submit a new leave request for review and approval.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
            >
              <X size={18} />
            </button>
          </CardHeader>

          {/* Body */}
          <CardBody className="space-y-4 py-4">
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 text-xs font-semibold text-rose-700 dark:text-rose-400">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Employee Select */}
            {!isSelfService && (
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1.5 uppercase tracking-wider">
                  Employee
                </label>
                <div className="relative">
                  <select
                    value={employeeId ?? ''}
                    onChange={(e) => setEmployeeId(Number(e.target.value))}
                    required
                    className="w-full appearance-none px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl text-gray-850 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
                  >
                    <option value="">— Select employee —</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employee_code} — {emp.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Leave Type Select */}
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1.5 uppercase tracking-wider">
                Leave Type
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
              >
                {LEAVE_TYPES.filter(type => type !== 'All').map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Date Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1.5 uppercase tracking-wider">
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1.5 uppercase tracking-wider">
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
                />
              </div>
            </div>

            {/* Duration Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1.5 uppercase tracking-wider">
                Duration Type
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="duration_type"
                    checked={!halfDay}
                    onChange={() => { setHalfDay(false); setHalfPeriod(null); }}
                    className="rounded-full border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  Full Day
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="duration_type"
                    checked={halfDay}
                    onChange={() => setHalfDay(true)}
                    className="rounded-full border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  Half Day
                </label>
              </div>
            </div>

            {/* Half-day session — shown only for Half Day, required before submit */}
            {halfDay && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1.5 uppercase tracking-wider">
                  Half-Day Session <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {([
                    { value: 'first_half' as const, title: 'First Half', time: '10:00 AM – 01:00 PM' },
                    { value: 'second_half' as const, title: 'Second Half', time: '02:00 PM – 05:30 PM' },
                  ]).map((opt) => {
                    const active = halfPeriod === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setHalfPeriod(opt.value)}
                        className={`flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                          active
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/20 ring-1 ring-teal-500/40'
                            : 'border-gray-200 dark:border-gray-850 bg-gray-50 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                      >
                        <span className={`text-xs font-bold ${active ? 'text-teal-700 dark:text-teal-300' : 'text-gray-700 dark:text-gray-200'}`}>
                          {opt.title}
                        </span>
                        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                          {opt.time}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reason Textarea */}
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1.5 uppercase tracking-wider">
                Reason for Leave
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Describe your reason for leave application..."
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-1 focus:ring-teal-500 transition-all"
              />
            </div>

            {/* Attachment (optional) */}
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1.5 uppercase tracking-wider">
                Attachment (Optional, e.g., Medical Certificate)
              </label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-200 dark:border-gray-850 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 hover:border-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer shadow-sm transition-all">
                  <Paperclip size={13} />
                  <span>Choose File</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleSimulateFile}
                  />
                </label>
                <span className="text-xs text-gray-450 dark:text-gray-500 truncate max-w-xs">
                  {attachmentName || 'No file selected'}
                </span>
              </div>
            </div>
          </CardBody>

          {/* Footer */}
          <CardFooter className="flex justify-end gap-3 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 dark:border-gray-850 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-305 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-gradient-to-r from-teal-700 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSaving ? 'Submitting...' : 'Submit Request'}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
