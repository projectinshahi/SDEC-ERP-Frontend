'use client';

import React from 'react';
import { Pencil, Trash2, CheckCircle2, Inbox, FileText } from 'lucide-react';
import { PayrollRecord } from '@/lib/hr/payroll.types';

interface PayrollTableProps {
  records: PayrollRecord[];
  onEdit: (record: PayrollRecord) => void;
  onDelete: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onViewPayslip: (record: PayrollRecord) => void;
}

export function PayrollTable({
  records,
  onEdit,
  onDelete,
  onMarkPaid,
  onViewPayslip,
}: PayrollTableProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900/10">
        <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-700 stroke-[1.5]" />
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-3">No matching payroll records</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try adjusting your filters or generate a new payroll record.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-150 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-4">Employee</th>
              <th className="px-6 py-4">Designation</th>
              <th className="px-6 py-4">Month</th>
              <th className="px-6 py-4 text-right">Basic Salary</th>
              <th className="px-6 py-4 text-right">Bonus</th>
              <th className="px-6 py-4 text-right">Deduction</th>
              <th className="px-6 py-4 text-right font-black">Net Salary</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-350">
            {records.map((record) => (
              <tr 
                key={record.id}
                className="hover:bg-gray-50/40 dark:hover:bg-gray-850/20 transition-colors"
              >
                {/* Employee details */}
                <td className="px-6 py-4.5">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 dark:text-white">{record.name}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{record.employeeCode}</span>
                  </div>
                </td>

                {/* Designation */}
                <td className="px-6 py-4.5 font-medium text-gray-500 dark:text-gray-450">
                  {record.role}
                </td>

                {/* Month */}
                <td className="px-6 py-4.5 font-medium text-gray-850 dark:text-gray-200">
                  {record.month}
                </td>

                {/* Basic Salary */}
                <td className="px-6 py-4.5 text-right font-mono tabular-nums text-gray-550 dark:text-gray-400">
                  ₹{record.basicSalary.toLocaleString('en-IN')}
                </td>

                {/* Bonus */}
                <td className="px-6 py-4.5 text-right font-mono tabular-nums text-emerald-650 dark:text-emerald-400">
                  {record.bonus > 0 ? `+₹${record.bonus.toLocaleString('en-IN')}` : '—'}
                </td>

                {/* Deduction */}
                <td className="px-6 py-4.5 text-right font-mono tabular-nums text-rose-650 dark:text-rose-400">
                  {record.deduction > 0 ? `-₹${record.deduction.toLocaleString('en-IN')}` : '—'}
                </td>

                {/* Net Salary */}
                <td className="px-6 py-4.5 text-right font-bold font-mono tabular-nums text-gray-905 dark:text-white">
                  ₹{record.netSalary.toLocaleString('en-IN')}
                </td>

                {/* Status Badge */}
                <td className="px-6 py-4.5 text-center">
                  <span 
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      record.status === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                        : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                    }`}
                  >
                    {record.status}
                  </span>
                </td>

                {/* Action Buttons */}
                <td className="px-6 py-4.5">
                  <div className="flex items-center justify-center gap-1">
                    {/* Mark Paid Action */}
                    {record.status === 'Pending' ? (
                      <button
                        onClick={() => onMarkPaid(record.id)}
                        title="Mark as Paid"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-100 dark:border-violet-900/30 transition-colors"
                      >
                        <CheckCircle2 size={12} />
                        <span>Mark Paid</span>
                      </button>
                    ) : (
                      <span className="w-[78px] block text-center text-[10px] font-bold text-gray-400">Completed</span>
                    )}

                    {/* View Payslip */}
                    <button
                      onClick={() => onViewPayslip(record)}
                      title="View Payslip Preview"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors"
                    >
                      <FileText size={13.5} />
                    </button>

                    {/* Edit Action */}
                    <button
                      onClick={() => onEdit(record)}
                      title="Edit record"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <Pencil size={13} />
                    </button>

                    {/* Delete Action */}
                    <button
                      onClick={() => onDelete(record.id)}
                      title="Delete record"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
