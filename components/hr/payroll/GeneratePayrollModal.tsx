'use client';

import React, { useState, useEffect } from 'react';
import { X, Wallet, Loader2, AlertCircle } from 'lucide-react';
import { ApiEmployee } from '@/lib/api/hr';
import { ApiPayrollRecord, SavePayrollPayload } from '@/lib/api/hr-payroll';

interface GeneratePayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: ApiEmployee[];
  activeRecord: ApiPayrollRecord | null;
  onSave: (payload: SavePayrollPayload) => Promise<void>;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS = ['2025', '2026', '2027', '2028'];

export function GeneratePayrollModal({
  isOpen,
  onClose,
  employees,
  activeRecord,
  onSave,
}: GeneratePayrollModalProps) {
  const [employeeId, setEmployeeId] = useState<number | ''>('');
  const [selectedMonth, setSelectedMonth] = useState('June');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [basicSalary, setBasicSalary] = useState('');
  const [bonus, setBonus] = useState('0');
  const [deduction, setDeduction] = useState('0');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync edit record details
  useEffect(() => {
    if (isOpen) {
      if (activeRecord) {
        setEmployeeId(activeRecord.employee_id);
        setBasicSalary(String(activeRecord.basic_salary));
        setBonus(String(activeRecord.bonus));
        setDeduction(String(activeRecord.deduction));
        
        const parts = activeRecord.month.split(' ');
        if (parts.length === 2) {
          setSelectedMonth(parts[0]);
          setSelectedYear(parts[1]);
        }
      } else {
        setEmployeeId(employees[0]?.id ?? '');
        setBasicSalary(employees[0]?.salary ? String(employees[0].salary) : '');
        setBonus('0');
        setDeduction('0');
        setSelectedMonth('June');
        setSelectedYear('2026');
      }
      setErrorMsg(null);
    }
  }, [isOpen, activeRecord, employees]);

  // Pre-fill salary when employee is selected in creation mode
  const handleEmployeeChange = (empIdVal: number) => {
    setEmployeeId(empIdVal);
    if (!activeRecord) {
      const emp = employees.find(e => e.id === empIdVal);
      if (emp) {
        setBasicSalary(String(emp.salary || ''));
      }
    }
  };

  // Auto calculate net salary for read-only preview
  const netSalary = (Number(basicSalary) || 0) + (Number(bonus) || 0) - (Number(deduction) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setErrorMsg('Please select an employee.');
      return;
    }
    if (!basicSalary || isNaN(Number(basicSalary)) || Number(basicSalary) <= 0) {
      setErrorMsg('Please enter a valid Basic Salary.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const monthStr = `${selectedMonth} ${selectedYear}`;
      const payload: SavePayrollPayload = {
        employee_id: Number(employeeId),
        basic_salary: Number(basicSalary),
        bonus: Number(bonus) || 0,
        deduction: Number(deduction) || 0,
        month: monthStr,
      };
      await onSave(payload);
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Failed to save payroll record.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 flex items-center justify-center text-violet-500">
              <Wallet size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                {activeRecord ? 'Edit Payroll Record' : 'Generate Payroll'}
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                {activeRecord ? 'Modify generated payroll fields' : 'Generate manual payroll for an employee'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-250 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Employee Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Employee *</label>
            <select
              value={employeeId}
              onChange={e => handleEmployeeChange(Number(e.target.value))}
              disabled={!!activeRecord}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 font-medium outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-850 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <option value="" disabled>— Select Employee —</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_code} — {emp.name} ({emp.designation})
                </option>
              ))}
            </select>
          </div>

          {/* Month / Year Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Payroll Month *</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                disabled={!!activeRecord}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 font-medium outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 cursor-pointer disabled:opacity-50 transition"
              >
                {MONTHS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Payroll Year *</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                disabled={!!activeRecord}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 font-medium outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 cursor-pointer disabled:opacity-50 transition"
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Basic Salary */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Basic Salary *</label>
            <input
              type="number"
              required
              min="0"
              value={basicSalary}
              onChange={e => setBasicSalary(e.target.value)}
              placeholder="e.g. 45000"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition"
            />
          </div>

          {/* Bonus and Deduction Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Bonus (Optional)</label>
              <input
                type="number"
                min="0"
                value={bonus}
                onChange={e => setBonus(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Deduction (Optional)</label>
              <input
                type="number"
                min="0"
                value={deduction}
                onChange={e => setDeduction(e.target.value)}
                placeholder="e.g. 2000"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition"
              />
            </div>
          </div>

          {/* Net Salary Preview (Calculated) */}
          <div className="space-y-1.5 bg-gray-50 dark:bg-gray-800/30 p-4.5 rounded-xl border border-gray-100 dark:border-gray-800/40">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Salary (Calculated)</span>
              <span className="text-lg font-black text-violet-600 dark:text-violet-400 tabular-nums">
                ₹{netSalary.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              Formula: Basic Salary ({basicSalary || 0}) + Bonus ({bonus || 0}) - Deduction ({deduction || 0})
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-205 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-850 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-sm shadow-violet-500/20"
            >
              {isSaving ? (
                <><Loader2 size={15} className="animate-spin" /> Saving…</>
              ) : (
                'Save Payroll'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
