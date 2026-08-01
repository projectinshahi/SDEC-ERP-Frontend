'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Wallet, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { ApiEmployee } from '@/lib/api/hr';
import {
  ApiPayrollRecord,
  SavePayrollPayload,
  fetchPayrollAttendancePreview,
} from '@/lib/api/hr-payroll';
import { computePayroll, PAYROLL_CALC_CONFIG } from '@/lib/hr/payrollCalc';
import { money, dayFmt, round2 } from '@/lib/hr/payrollFormat';

interface GeneratePayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: ApiEmployee[];
  activeRecord: ApiPayrollRecord | null;
  onSave: (payload: SavePayrollPayload) => Promise<void>;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const YEARS = ['2025', '2026', '2027', '2028'];

/**
 * Default the generate form to the PREVIOUS completed month — that's the month
 * payroll is normally run for and the month whose attendance is finalized. A
 * hardcoded past month (e.g. "June") lands users on a month with no attendance,
 * where worked days = 0 makes Gross/PF/ESI compute to ₹0 for no obvious reason.
 */
function defaultPayrollMonth(): { month: string; year: string } {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { month: MONTHS[prev.getMonth()], year: String(prev.getFullYear()) };
}

interface DaySnapshot {
  calendarDays: number;
  officeWorkingDays: number;
  workedDays: number;
  lop: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
}
const ZERO_DAYS: DaySnapshot = {
  calendarDays: 0, officeWorkingDays: 0, workedDays: 0, lop: 0, paidLeaveDays: 0, unpaidLeaveDays: 0,
};

/** Read-only stat cell (day snapshot / computed money). */
function ReadonlyStat({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: 'blue' | 'rose' | 'emerald' }) {
  const color =
    accent === 'blue' ? 'text-blue-600 dark:text-blue-400'
      : accent === 'rose' ? 'text-rose-600 dark:text-rose-400'
        : accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-gray-900 dark:text-gray-100';
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</span>
      <span className={`tabular-nums ${strong ? 'text-sm font-black' : 'text-sm font-bold'} ${color}`}>{value}</span>
    </div>
  );
}

/** Editable money input with an associated label. */
function MoneyInput({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  const id = `pay-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {label}{required ? ' *' : ''}
      </label>
      <input
        id={id}
        type="number"
        min="0"
        step="0.01"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition"
      />
    </div>
  );
}

export function GeneratePayrollModal({ isOpen, onClose, employees, activeRecord, onSave }: GeneratePayrollModalProps) {
  const isEdit = !!activeRecord;

  const [employeeId, setEmployeeId] = useState<number | ''>('');
  const [selectedMonth, setSelectedMonth] = useState(() => defaultPayrollMonth().month);
  const [selectedYear, setSelectedYear] = useState(() => defaultPayrollMonth().year);

  // Editable earnings + manual adjustments (strings for inputs)
  const [basicSalary, setBasicSalary] = useState('');
  const [dearnessAllowance, setDearnessAllowance] = useState('');
  const [fine, setFine] = useState('0');
  const [specialAllowance, setSpecialAllowance] = useState('0');
  const [providentFund, setProvidentFund] = useState('0');
  const [bonus, setBonus] = useState('0');
  const [incentive, setIncentive] = useState('0');
  const [arrears, setArrears] = useState('0');

  // Day snapshot (from Attendance Preview on CREATE, from stored record on EDIT)
  const [days, setDays] = useState<DaySnapshot>(ZERO_DAYS);

  // Applied rates. pfRatePct null → PF is a manual amount (legacy record edit);
  // non-null → PF is auto-computed (Gross × pfRatePct). esiRatePct always applies.
  const [pfRatePct, setPfRatePct] = useState<number | null>(PAYROLL_CALC_CONFIG.providentFundRatePct);
  const [esiRatePct, setEsiRatePct] = useState<number>(PAYROLL_CALC_CONFIG.esiRatePct);
  const pfIsAuto = pfRatePct != null;

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Initialise on open / mode change.
  useEffect(() => {
    if (!isOpen) return;
    if (activeRecord) {
      // EDIT — populate from the stored (frozen) snapshot; never fetch preview.
      setEmployeeId(activeRecord.employee_id);
      const parts = activeRecord.month.split(' ');
      if (parts.length === 2) { setSelectedMonth(parts[0]); setSelectedYear(parts[1]); }
      setBasicSalary(String(activeRecord.basic_salary ?? 0));
      setDearnessAllowance(String(activeRecord.da ?? 0));
      setFine(String(activeRecord.fine ?? 0));
      setSpecialAllowance(String(activeRecord.special_allowance ?? 0));
      setProvidentFund(String(activeRecord.pf ?? 0));
      setBonus(String(activeRecord.bonus ?? 0));
      setIncentive(String(activeRecord.incentive ?? 0));
      setArrears(String(activeRecord.arrears ?? 0));
      // Reuse the record's own rates so the preview matches how the backend will
      // recompute it: new records (pf_pct set) → auto PF; legacy (null) → manual PF.
      setPfRatePct(activeRecord.pf_pct ?? null);
      setEsiRatePct(activeRecord.esi_pct ?? 0.75);
      setDays({
        calendarDays: activeRecord.calendar_days ?? 0,
        officeWorkingDays: activeRecord.office_working_days ?? 0,
        workedDays: activeRecord.worked_days ?? 0,
        lop: activeRecord.lop ?? 0,
        paidLeaveDays: activeRecord.paid_leave_days ?? 0,
        unpaidLeaveDays: activeRecord.unpaid_leave_days ?? 0,
      });
      setPreviewError(null);
      setPreviewLoading(false);
    } else {
      // CREATE — reset; the preview effect fills day snapshot + Basic/DA.
      const def = defaultPayrollMonth();
      setEmployeeId(employees[0]?.id ?? '');
      setSelectedMonth(def.month);
      setSelectedYear(def.year);
      setBasicSalary('');
      setDearnessAllowance('');
      setFine('0'); setSpecialAllowance('0'); setProvidentFund('0');
      setBonus('0'); setIncentive('0'); setArrears('0');
      setDays(ZERO_DAYS);
    }
    setErrorMsg(null);
  }, [isOpen, activeRecord, employees]);

  // CREATE only: load attendance preview → day snapshot + auto-fill Basic/DA (75/25).
  useEffect(() => {
    if (!isOpen || isEdit || !employeeId) return;
    const month = `${selectedMonth} ${selectedYear}`;
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    fetchPayrollAttendancePreview(Number(employeeId), month)
      .then((p) => {
        if (cancelled) return;
        setDays({
          calendarDays: p.calendarDays,
          officeWorkingDays: p.officeWorkingDays,
          workedDays: p.employeeWorkedDays,
          lop: p.lossOfPay,
          paidLeaveDays: p.paidLeaveDays,
          unpaidLeaveDays: p.unpaidLeaveDays,
        });
        setBasicSalary(String(round2(p.suggestedBasicSalary)));
        setDearnessAllowance(String(round2(p.suggestedDearnessAllowance)));
        setPfRatePct(p.providentFundRatePct);
        setEsiRatePct(p.esiRatePct);
      })
      .catch((e: any) => {
        if (!cancelled) setPreviewError(e?.response?.data?.message ?? e?.message ?? 'Failed to load attendance preview');
      })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, isEdit, employeeId, selectedMonth, selectedYear, reloadKey]);

  // Live money preview (mirror of the backend formula; backend stays authoritative).
  const calc = useMemo(
    () => computePayroll(
      {
        basicSalary: Number(basicSalary) || 0,
        dearnessAllowance: Number(dearnessAllowance) || 0,
        officeWorkingDays: days.officeWorkingDays,
        employeeWorkedDays: days.workedDays,
        fine: Number(fine) || 0,
        specialAllowance: Number(specialAllowance) || 0,
        providentFund: Number(providentFund) || 0, // used only when pfRatePct is null (legacy)
        bonus: Number(bonus) || 0,
        incentive: Number(incentive) || 0,
        arrears: Number(arrears) || 0,
      },
      { ...PAYROLL_CALC_CONFIG, esiRatePct, providentFundRatePct: pfRatePct },
    ),
    [basicSalary, dearnessAllowance, days, fine, specialAllowance, providentFund, bonus, incentive, arrears, esiRatePct, pfRatePct],
  );

  const canSave = !isSaving && (isEdit || (!previewLoading && !previewError));

  // The month has working days but the employee has zero attendance → worked days
  // is 0, so Gross (and the PF/ESI derived from it) legitimately compute to ₹0.
  // Surface this so an empty-month zero isn't mistaken for a broken calculation.
  const noAttendance =
    !isEdit && !previewLoading && !previewError && days.officeWorkingDays > 0 && days.workedDays === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) { setErrorMsg('Please select an employee.'); return; }
    if (basicSalary === '' || isNaN(Number(basicSalary))) {
      setErrorMsg('Please enter a valid Basic Salary.'); return;
    }
    // No field may be negative (Save sits outside the form, so native min="0" isn't enforced).
    const amounts: [string, string][] = [
      ['Basic Salary', basicSalary],
      ['Dearness Allowance', dearnessAllowance],
      ['Fine', fine],
      ['Special Allowance', specialAllowance],
      ['Provident Fund', providentFund],
      ['Bonus', bonus],
      ['Incentive', incentive],
      ['Arrears', arrears],
    ];
    for (const [label, val] of amounts) {
      if (val !== '' && (isNaN(Number(val)) || Number(val) < 0)) {
        setErrorMsg(`${label} cannot be negative.`); return;
      }
    }
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const payload: SavePayrollPayload = {
        employee_id: Number(employeeId),
        month: `${selectedMonth} ${selectedYear}`,
        basic_salary: Number(basicSalary) || 0,
        da: Number(dearnessAllowance) || 0,
        fine: Number(fine) || 0,
        special_allowance: Number(specialAllowance) || 0,
        pf: Number(providentFund) || 0,
        bonus: Number(bonus) || 0,
        incentive: Number(incentive) || 0,
        arrears: Number(arrears) || 0,
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
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-850 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-850 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-500">
              <Wallet size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                {isEdit ? 'Edit Payroll Record' : 'Generate Payroll'}
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                {isEdit ? 'Edit adjustments — attendance days are frozen from generation' : 'Attendance-driven payroll for an employee'}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-250 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Employee + Month + Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="pay-employee" className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Employee *</label>
              <select
                id="pay-employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(Number(e.target.value))}
                disabled={isEdit}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 font-medium outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-850 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <option value="" disabled>— Select Employee —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.employee_code} — {emp.name} ({emp.designation})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pay-month" className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Payroll Month *</label>
              <select id="pay-month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} disabled={isEdit}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 font-medium outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 cursor-pointer disabled:opacity-50 transition">
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pay-year" className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Payroll Year *</label>
              <select id="pay-year" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} disabled={isEdit}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 font-medium outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 cursor-pointer disabled:opacity-50 transition">
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Attendance day snapshot (read-only) */}
          <div className="rounded-xl border border-gray-100 dark:border-gray-850/60 bg-gray-50 dark:bg-gray-800/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Attendance Snapshot {isEdit && <span className="text-gray-400 dark:text-gray-500 normal-case font-medium">(frozen at generation)</span>}
              </span>
              {previewLoading && <Loader2 size={14} className="animate-spin text-blue-500" />}
            </div>

            {previewError && !isEdit ? (
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <span className="flex items-center gap-1.5"><AlertCircle size={13} /> {previewError}</span>
                <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition">
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                <ReadonlyStat label="Calendar Days" value={dayFmt(days.calendarDays)} />
                <ReadonlyStat label="Office Working Days" value={dayFmt(days.officeWorkingDays)} />
                <ReadonlyStat label="Employee Worked Days" value={dayFmt(days.workedDays)} accent="emerald" />
                <ReadonlyStat label="Loss Of Pay" value={dayFmt(days.lop)} accent="rose" />
                <ReadonlyStat label="Paid Leave Days" value={dayFmt(days.paidLeaveDays)} />
                <ReadonlyStat label="Unpaid Leave Days" value={dayFmt(days.unpaidLeaveDays)} />
              </div>
            )}
          </div>

          {/* Earnings */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Earnings</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MoneyInput label="Basic Salary" required value={basicSalary} onChange={setBasicSalary} />
              <MoneyInput label="Dearness Allowance" value={dearnessAllowance} onChange={setDearnessAllowance} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 rounded-xl border border-gray-100 dark:border-gray-850/60 bg-gray-50 dark:bg-gray-800/20 p-4">
              <ReadonlyStat label="Payable Basic Salary" value={money(calc.payableBasicSalary)} />
              <ReadonlyStat label="Payable Dearness Allow." value={money(calc.payableDearnessAllowance)} />
              <ReadonlyStat label="Gross Salary" value={money(calc.grossSalary)} strong accent="blue" />
            </div>
            {noAttendance && (
              <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                No attendance recorded for {selectedMonth} {selectedYear}, so worked days is 0 — Gross, PF and ESI compute to ₹0. Pick a month with attendance.
              </p>
            )}
          </div>

          {/* Deductions */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deductions</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MoneyInput label="Fine" value={fine} onChange={setFine} />
              <MoneyInput label="Special Allowance" value={specialAllowance} onChange={setSpecialAllowance} />
              {/* Legacy records edit PF manually; new records auto-compute it (below). */}
              {!pfIsAuto && <MoneyInput label="Provident Fund" value={providentFund} onChange={setProvidentFund} />}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 rounded-xl border border-gray-100 dark:border-gray-850/60 bg-gray-50 dark:bg-gray-800/20 p-4">
              {pfIsAuto && (
                <ReadonlyStat label={`Provident Fund (${pfRatePct}% of Gross)`} value={money(calc.providentFund)} accent="rose" />
              )}
              <ReadonlyStat label={`Employee State Insurance (${esiRatePct}%)`} value={money(calc.employeeStateInsurance)} />
              <ReadonlyStat label="Total Deductions" value={money(calc.totalDeductions)} strong accent="rose" />
            </div>
          </div>

          {/* Additions */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Additions</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MoneyInput label="Bonus" value={bonus} onChange={setBonus} />
              <MoneyInput label="Incentive" value={incentive} onChange={setIncentive} />
              <MoneyInput label="Arrears" value={arrears} onChange={setArrears} />
            </div>
          </div>

          {/* Net Salary */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30">
            <div>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Net Salary</span>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Gross − Total Deductions + Bonus + Incentive + Arrears</p>
            </div>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums">{money(calc.netSalary)}</span>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-850 shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-205 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Cancel
          </button>
          <button type="submit" onClick={handleSubmit} disabled={!canSave}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-850 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-sm shadow-blue-500/20">
            {isSaving ? (<><Loader2 size={15} className="animate-spin" /> Saving…</>) : 'Save Payroll'}
          </button>
        </div>
      </div>
    </div>
  );
}
