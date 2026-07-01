'use client';

import React, { useState } from 'react';
import { X, User, Calendar, Award } from 'lucide-react';
import { ApiEmployee } from '@/lib/api/hr';
import { ApiPerformanceCycle } from '@/lib/hr/performance.types';

interface AppraisalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { employee_id: number; cycle_id: number; evaluator_id?: number | null }) => Promise<void>;
  employees: ApiEmployee[];
  cycles: ApiPerformanceCycle[];
}

export function AppraisalModal({
  isOpen,
  onClose,
  onSubmit,
  employees,
  cycles,
}: AppraisalModalProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [evaluatorId, setEvaluatorId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !cycleId) {
      setError('Please select an employee and a review cycle.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        employee_id: Number(employeeId),
        cycle_id: Number(cycleId),
        evaluator_id: evaluatorId ? Number(evaluatorId) : null,
      });
      setEmployeeId('');
      setCycleId('');
      setEvaluatorId('');
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || 'Failed to assign appraisal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-amber-500 dark:bg-amber-600 px-6 py-6 text-white shrink-0 relative">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X size={16} />
          </button>
          
          <h2 className="text-lg font-black tracking-tight">Assign Appraisal Review</h2>
          <p className="text-xs text-white/80 font-medium mt-1">
            Initiate a performance evaluation for an employee.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold border border-red-100 dark:border-red-900/30">
              {error}
            </div>
          )}

          {/* Employee */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              Target Employee *
            </label>
            <div className="relative">
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition cursor-pointer appearance-none"
                required
              >
                <option value="" className="bg-white dark:bg-gray-900">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id} className="bg-white dark:bg-gray-900">
                    {emp.name} ({emp.employee_code}) — {emp.designation}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <User size={14} />
              </div>
            </div>
          </div>

          {/* Cycle */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              Review Cycle *
            </label>
            <div className="relative">
              <select
                value={cycleId}
                onChange={(e) => setCycleId(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition cursor-pointer appearance-none"
                required
              >
                <option value="" className="bg-white dark:bg-gray-900">Select Review Cycle</option>
                {cycles.map((cyc) => (
                  <option key={cyc.id} value={cyc.id} className="bg-white dark:bg-gray-900">
                    {cyc.title} ({cyc.status})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <Calendar size={14} />
              </div>
            </div>
          </div>

          {/* Evaluator */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              Evaluator / Reviewer (Optional)
            </label>
            <div className="relative">
              <select
                value={evaluatorId}
                onChange={(e) => setEvaluatorId(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition cursor-pointer appearance-none"
              >
                <option value="" className="bg-white dark:bg-gray-900">Reporting Manager (Auto)</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id} className="bg-white dark:bg-gray-900">
                    {emp.name} ({emp.employee_code})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <Award size={14} />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-normal">
              If left blank, the system automatically assigns the employee's Reporting Manager.
            </p>
          </div>

          {/* Footer Action */}
          <div className="flex gap-3 pt-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 dark:bg-amber-600 hover:bg-amber-600 dark:hover:bg-amber-700 text-sm font-semibold text-white transition shadow-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Assigning...' : 'Assign Appraisal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
