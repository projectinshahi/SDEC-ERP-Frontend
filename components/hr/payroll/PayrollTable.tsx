'use client';

import React from 'react';
import { Pencil, Trash2, CheckCircle2, Inbox, FileText } from 'lucide-react';
import { PayrollRecord } from '@/lib/hr/payroll.types';
import { money, dayFmt } from '@/lib/hr/payrollFormat';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';

interface PayrollTableProps {
  records: PayrollRecord[];
  onEdit: (record: PayrollRecord) => void;
  onDelete: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onViewPayslip: (record: PayrollRecord) => void;
}

// Legacy rows (created before the attendance-based model) have no snapshot →
// office_working_days is 0. Show "--" for snapshot-only fields; render the fields
// legacy rows genuinely have (Basic / Bonus / Net / flat Deduction) as normal.
const isLegacy = (r: PayrollRecord) => r.officeWorkingDays <= 0;
const mSnap = (r: PayrollRecord, v: number) => (isLegacy(r) ? '--' : money(v));
const dSnap = (r: PayrollRecord, v: number) => (isLegacy(r) ? '--' : dayFmt(v));

type Align = 'left' | 'center' | 'right';
type Group = 'Employee' | 'Attendance' | 'Salary' | 'Allowances' | 'Deductions' | 'Final Salary';
interface Col {
  label: string;
  group: Group;
  align: Align;
  render: (r: PayrollRecord) => React.ReactNode;
  strong?: boolean;
  tone?: 'rose';
  highlight?: boolean; // strong visual highlight (Gross / Net)
  sticky?: 'l0' | 'l1'; // frozen left columns
}

// Full payroll snapshot, grouped in display order. Money = right + 2dp; days = center.
const COLUMNS: Col[] = [
  // Employee Information
  { label: 'Employee', group: 'Employee', align: 'left', sticky: 'l0', render: (r) => <span title={r.name} className="block max-w-[168px] truncate font-bold text-gray-900 dark:text-white">{r.name || '--'}</span> },
  { label: 'Employee Code', group: 'Employee', align: 'left', sticky: 'l1', render: (r) => <span className="font-mono text-gray-500 dark:text-gray-400">{r.employeeCode || '--'}</span> },
  { label: 'Designation', group: 'Employee', align: 'left', render: (r) => r.role || '--' },
  { label: 'Department', group: 'Employee', align: 'left', render: (r) => r.department || '--' },
  { label: 'Month', group: 'Employee', align: 'left', render: (r) => r.month || '--' },
  // Attendance Snapshot
  { label: 'Calendar Days', group: 'Attendance', align: 'center', render: (r) => dSnap(r, r.calendarDays) },
  { label: 'Office Working Days', group: 'Attendance', align: 'center', render: (r) => dSnap(r, r.officeWorkingDays) },
  { label: 'Worked Days', group: 'Attendance', align: 'center', render: (r) => dSnap(r, r.workedDays) },
  { label: 'Paid Leave Days', group: 'Attendance', align: 'center', render: (r) => dSnap(r, r.paidLeaveDays) },
  { label: 'Unpaid Leave Days', group: 'Attendance', align: 'center', render: (r) => dSnap(r, r.unpaidLeaveDays) },
  { label: 'Loss Of Pay', group: 'Attendance', align: 'center', render: (r) => dSnap(r, r.lop) },
  // Salary Structure
  { label: 'Basic Salary', group: 'Salary', align: 'right', render: (r) => money(r.basicSalary) },
  { label: 'Dearness Allowance', group: 'Salary', align: 'right', render: (r) => mSnap(r, r.da) },
  { label: 'Payable Basic Salary', group: 'Salary', align: 'right', render: (r) => mSnap(r, r.payableBasic) },
  { label: 'Payable Dearness Allowance', group: 'Salary', align: 'right', render: (r) => mSnap(r, r.payableDa) },
  // Allowances (manual additions)
  { label: 'Bonus', group: 'Allowances', align: 'right', render: (r) => money(r.bonus) },
  { label: 'Incentive', group: 'Allowances', align: 'right', render: (r) => mSnap(r, r.incentive) },
  { label: 'Arrears', group: 'Allowances', align: 'right', render: (r) => mSnap(r, r.arrears) },
  { label: 'Special Allowance', group: 'Allowances', align: 'right', render: (r) => mSnap(r, r.specialAllowance) },
  // Deductions
  { label: 'Fine', group: 'Deductions', align: 'right', tone: 'rose', render: (r) => mSnap(r, r.fine) },
  { label: 'Provident Fund', group: 'Deductions', align: 'right', tone: 'rose', render: (r) => mSnap(r, r.pf) },
  { label: 'Employee State Insurance', group: 'Deductions', align: 'right', tone: 'rose', render: (r) => mSnap(r, r.esi) },
  { label: 'Total Deductions', group: 'Deductions', align: 'right', tone: 'rose', strong: true, render: (r) => money(isLegacy(r) ? r.deduction : r.totalDeductions) },
  // Final Salary
  { label: 'Gross Salary', group: 'Final Salary', align: 'right', strong: true, highlight: true, render: (r) => mSnap(r, r.gross) },
  { label: 'Net Salary', group: 'Final Salary', align: 'right', strong: true, highlight: true, render: (r) => money(r.netSalary) },
];

// Ordered groups with a subtle tint for color separation between sections.
const GROUPS: { name: Group; tint: string }[] = [
  { name: 'Employee', tint: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-300' },
  { name: 'Attendance', tint: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' },
  { name: 'Salary', tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  { name: 'Allowances', tint: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' },
  { name: 'Deductions', tint: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  { name: 'Final Salary', tint: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' },
];

const alignCls = (a: Align) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

// Frozen-column geometry (fixed widths so the second sticky column's offset is exact).
const STICKY = {
  l0: 'sticky left-0 w-[200px] min-w-[200px] max-w-[200px]',
  l1: 'sticky left-[200px] w-[150px] min-w-[150px] max-w-[150px] shadow-[6px_0_8px_-6px_rgba(0,0,0,0.18)]',
};
const stickyRight = 'sticky right-0 shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.18)]';

// First column of each group gets a left divider for clean section separation.
const firstInGroup = new Set<string>();
COLUMNS.forEach((c, i) => {
  if (i === 0 || c.group !== COLUMNS[i - 1].group) firstInGroup.add(c.label);
});
const divider = (label: string) => (firstInGroup.has(label) && label !== 'Employee' ? 'border-l border-gray-200 dark:border-gray-800' : '');

export function PayrollTable({ records, onEdit, onDelete, onMarkPaid, onViewPayslip }: PayrollTableProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-200 dark:border-gray-850 rounded-2xl bg-white dark:bg-gray-900/10">
        <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-700 stroke-[1.5]" />
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-3">No matching payroll records</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try adjusting your filters or generate a new payroll record.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 shadow-sm">
      {/* Horizontal scroll container — the full snapshot is wide; scrolls both ways.
          Sticky columns carry edge shadows that indicate content scrolls beneath them. */}
      <div className="overflow-x-auto scroll-smooth">
        <table className="min-w-full border-collapse text-left">
          <thead>
            {/* Section grouping row */}
            <tr className="text-[10px] font-bold uppercase tracking-wider">
              {GROUPS.map((g) => {
                const span = COLUMNS.filter((c) => c.group === g.name).length;
                return (
                  <th key={g.name} colSpan={span} className={`h-9 px-4 sticky top-0 z-30 text-center border-l border-white/60 dark:border-gray-900 ${g.tint}`}>
                    {g.name}
                  </th>
                );
              })}
              <th className="h-9 px-4 sticky top-0 z-30 bg-gray-100 dark:bg-gray-900 border-l border-white/60 dark:border-gray-900" />
              <th className={`h-9 px-4 sticky top-0 z-40 bg-gray-100 dark:bg-gray-900 ${stickyRight}`} />
            </tr>
            {/* Column label row */}
            <tr className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-150 dark:border-gray-850">
              {COLUMNS.map((c) => (
                <th
                  key={c.label}
                  className={`whitespace-nowrap px-4 py-3 sticky top-9 bg-gray-50 dark:bg-gray-900 ${alignCls(c.align)} ${divider(c.label)} ${
                    c.sticky ? `${STICKY[c.sticky]} z-40` : 'z-30'
                  }`}
                >
                  {c.label}
                </th>
              ))}
              <th className="whitespace-nowrap px-4 py-3 sticky top-9 z-30 bg-gray-50 dark:bg-gray-900 text-center">Status</th>
              <th className={`whitespace-nowrap px-4 py-3 sticky top-9 z-40 bg-gray-50 dark:bg-gray-900 text-center ${stickyRight}`}>Actions</th>
            </tr>
          </thead>
          <tbody className="text-xs font-semibold text-gray-700 dark:text-gray-350">
            {records.map((record, idx) => {
              const rowBg = idx % 2 === 1 ? 'bg-gray-50 dark:bg-gray-850' : 'bg-white dark:bg-gray-900';
              const stickyBg = `${rowBg} group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40`;
              return (
                <tr
                  key={record.id}
                  className={`group border-b border-gray-100 dark:border-gray-850/60 transition-colors ${rowBg} hover:bg-blue-50 dark:hover:bg-blue-950/30`}
                >
                  {COLUMNS.map((c) => (
                    <td
                      key={c.label}
                      className={`whitespace-nowrap px-4 py-3.5 ${alignCls(c.align)} ${divider(c.label)} ${
                        c.align !== 'left' ? 'font-mono tabular-nums' : ''
                      } ${c.strong ? 'font-bold text-gray-900 dark:text-white' : ''} ${
                        c.tone === 'rose' ? 'text-rose-600 dark:text-rose-400' : ''
                      } ${c.highlight ? 'bg-indigo-50/70 dark:bg-indigo-950/25 text-indigo-700 dark:text-indigo-300' : ''} ${
                        c.sticky ? `${STICKY[c.sticky]} z-20 ${stickyBg}` : ''
                      }`}
                    >
                      {c.render(record)}
                    </td>
                  ))}

                  {/* Status Badge (existing) */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-center">
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

                  {/* Action Buttons (existing) — frozen to the right edge */}
                  <td className={`whitespace-nowrap px-4 py-3.5 z-20 ${stickyRight} ${stickyBg}`}>
                    <div className="flex items-center justify-center gap-1">
                      {/* Mark Paid — a payroll write action */}
                      <PermissionGuard require="hr.payroll.process">
                        {record.status === 'Pending' ? (
                          <button
                            onClick={() => onMarkPaid(record.id)}
                            title="Mark as Paid"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-100 dark:border-blue-900/30 transition-colors"
                          >
                            <CheckCircle2 size={12} />
                            <span>Mark Paid</span>
                          </button>
                        ) : (
                          <span className="w-[78px] block text-center text-[10px] font-bold text-gray-400">Completed</span>
                        )}
                      </PermissionGuard>

                      {/* View Payslip — read-only, always available on this (already gated) page */}
                      <button
                        onClick={() => onViewPayslip(record)}
                        title="View Payslip Preview"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                      >
                        <FileText size={13.5} />
                      </button>

                      {/* Edit disabled for legacy rows (no attendance snapshot): editing
                          would recompute Gross/Net against 0 working days and corrupt
                          the record. Delete + regenerate instead. */}
                      <PermissionGuard require="hr.payroll.process">
                        {record.officeWorkingDays > 0 ? (
                          <button
                            onClick={() => onEdit(record)}
                            title="Edit record"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                          >
                            <Pencil size={13} />
                          </button>
                        ) : (
                          <button
                            disabled
                            title="Legacy record — delete and regenerate to edit under the attendance-based model"
                            className="p-1.5 rounded-lg text-gray-300 dark:text-gray-700 cursor-not-allowed"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                      </PermissionGuard>

                      <PermissionGuard require="hr.payroll.process">
                        <button
                          onClick={() => onDelete(record.id)}
                          title="Delete record"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </PermissionGuard>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
