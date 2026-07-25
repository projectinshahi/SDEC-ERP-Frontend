'use client';

import { useEffect } from 'react';
import { X, ArrowDownToLine, ReceiptText } from 'lucide-react';
import { PayrollRecord } from '@/lib/hr/payroll.types';
import { money, dayFmt } from '@/lib/hr/payrollFormat';
import { generatePayslipPdf } from '@/lib/hr/payrollHelper';

interface PayslipPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PayrollRecord | null;
}

function Line({ label, value, textClass, strong }: { label: string; value: string; textClass?: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-850/40 pb-2">
      <span className="text-xs font-semibold text-gray-450 dark:text-gray-500">{label}</span>
      <span className={`text-xs font-mono ${strong ? 'font-black' : 'font-bold'} ${textClass ?? 'text-gray-800 dark:text-gray-200'}`}>{value}</span>
    </div>
  );
}

export function PayslipPreviewModal({ isOpen, onClose, record }: PayslipPreviewModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const isLegacy = record.officeWorkingDays <= 0;

  const dayItems: [string, string][] = [
    ['Calendar Days', dayFmt(record.calendarDays)],
    ['Office Working Days', dayFmt(record.officeWorkingDays)],
    ['Employee Worked Days', dayFmt(record.workedDays)],
    ['Loss Of Pay', dayFmt(record.lop)],
    ['Paid Leave Days', dayFmt(record.paidLeaveDays)],
    ['Unpaid Leave Days', dayFmt(record.unpaidLeaveDays)],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-150 dark:border-gray-850 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Banner */}
        <div className="bg-blue-600 dark:bg-gray-800 p-6 text-white shrink-0 relative">
          <button onClick={onClose} aria-label="Close payslip" className="absolute top-4 right-4 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition">
            <X size={16} />
          </button>
          <div className="flex items-center gap-2">
            <ReceiptText size={18} />
            <h2 className="text-sm font-bold tracking-wider uppercase font-mono">Salary Payslip</h2>
          </div>
          <h3 className="text-lg font-black tracking-tight mt-2">{record.name}</h3>
          <p className="text-xs text-white/80 font-medium mt-0.5">{record.role} ({record.employeeCode})</p>
        </div>

        {/* Details */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/20 p-4 rounded-xl border border-gray-150 dark:border-gray-850/40 text-xs font-semibold text-gray-800 dark:text-gray-200">
            <div>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Payroll Period</span>
              <span>{record.month}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Payment Status</span>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                record.status === 'Paid'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                  : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
              }`}>{record.status}</span>
            </div>
          </div>

          {isLegacy ? (
            /* Legacy record (no attendance snapshot) */
            <div className="space-y-3.5">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Salary Computation</span>
              <Line label="Base Basic Salary" value={money(record.basicSalary)} />
              <Line label="Allowances / Bonuses" value={`+ ${money(record.bonus)}`} textClass="text-emerald-600 dark:text-emerald-400" />
              <Line label="Deductions / Penalties" value={`- ${money(record.deduction)}`} textClass="text-rose-600 dark:text-rose-400" />
            </div>
          ) : (
            <>
              {/* Attendance snapshot */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">Attendance</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 bg-gray-50 dark:bg-gray-800/20 p-3.5 rounded-xl border border-gray-150 dark:border-gray-850/40">
                  {dayItems.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-450 dark:text-gray-500">{label}</span>
                      <span className="text-[11px] font-bold font-mono tabular-nums text-gray-800 dark:text-gray-200">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Earnings */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Earnings</span>
                <Line label="Basic Salary" value={money(record.basicSalary)} />
                <Line label="Dearness Allowance" value={money(record.da)} />
                <Line label="Payable Basic Salary" value={money(record.payableBasic)} />
                <Line label="Payable Dearness Allowance" value={money(record.payableDa)} />
                <Line label="Gross Salary" value={money(record.gross)} strong textClass="text-blue-600 dark:text-blue-400" />
              </div>

              {/* Deductions */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Deductions</span>
                <Line label="Fine" value={money(record.fine)} textClass="text-rose-600 dark:text-rose-400" />
                <Line label="Special Allowance" value={money(record.specialAllowance)} textClass="text-rose-600 dark:text-rose-400" />
                <Line label="Employee State Insurance" value={money(record.esi)} textClass="text-rose-600 dark:text-rose-400" />
                <Line label="Provident Fund" value={money(record.pf)} textClass="text-rose-600 dark:text-rose-400" />
                <Line label="Total Deductions" value={money(record.totalDeductions)} strong textClass="text-rose-600 dark:text-rose-400" />
              </div>

              {/* Additions */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Additions</span>
                <Line label="Bonus" value={`+ ${money(record.bonus)}`} textClass="text-emerald-600 dark:text-emerald-400" />
                <Line label="Incentive" value={`+ ${money(record.incentive)}`} textClass="text-emerald-600 dark:text-emerald-400" />
                <Line label="Arrears" value={`+ ${money(record.arrears)}`} textClass="text-emerald-600 dark:text-emerald-400" />
              </div>
            </>
          )}

          {/* Net */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Net Take-Home Salary</span>
            <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">{money(record.netSalary)}</span>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-800/10 rounded-xl text-center border border-dashed border-gray-200 dark:border-gray-850">
            <p className="text-[9.5px] leading-relaxed font-semibold text-gray-400 dark:text-gray-550">
              This is a digital document verified by human resources. Download as PDF for a hardcopy statement.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-150 dark:border-gray-850/80 bg-gray-50/50 dark:bg-gray-900 shrink-0 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-850 transition">
            Close
          </button>
          <button onClick={() => generatePayslipPdf(record)} className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-850 text-white text-xs font-bold transition shadow-sm shadow-blue-500/20">
            <ArrowDownToLine size={13.5} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
