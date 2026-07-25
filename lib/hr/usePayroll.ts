'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PayrollRecord } from './payroll.types';
import {
  fetchPayroll,
  createPayroll,
  updatePayroll,
  updatePayrollStatus,
  deletePayroll,
  ApiPayrollRecord,
  SavePayrollPayload,
} from '../api/hr-payroll';
import { fetchEmployees, ApiEmployee } from '../api/hr';

export function adaptPayrollRecord(p: ApiPayrollRecord): PayrollRecord {
  const num = (v: number | undefined | null) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    id: String(p.id),
    employeeId: p.employee_id,
    employeeCode: p.employee_code ?? '',
    name: p.name ?? '',
    role: p.designation ?? '',
    basicSalary: num(p.basic_salary),
    bonus: num(p.bonus),
    deduction: num(p.deduction),
    netSalary: num(p.net_salary),
    month: p.month,
    status: p.status === 'Paid' ? 'Paid' : 'Pending',
    createdAt: p.created_at,
    // Snapshot fields — default 0 so legacy rows render gracefully.
    da: num(p.da),
    calendarDays: num(p.calendar_days),
    officeWorkingDays: num(p.office_working_days),
    workedDays: num(p.worked_days),
    lop: num(p.lop),
    paidLeaveDays: num(p.paid_leave_days),
    unpaidLeaveDays: num(p.unpaid_leave_days),
    payableBasic: num(p.payable_basic),
    payableDa: num(p.payable_da),
    gross: num(p.gross),
    esi: num(p.esi),
    fine: num(p.fine),
    specialAllowance: num(p.special_allowance),
    pf: num(p.pf),
    incentive: num(p.incentive),
    arrears: num(p.arrears),
    totalDeductions: num(p.total_deductions),
  };
}

export function usePayroll() {
  const [payrollRecords, setPayrollRecords] = useState<ApiPayrollRecord[]>([]);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Entry Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<ApiPayrollRecord | null>(null);

  // Payslip Preview Modal State
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [payrollData, employeesData] = await Promise.all([
        fetchPayroll(),
        fetchEmployees(),
      ]);
      setPayrollRecords(payrollData);
      setEmployees(employeesData);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? 'Failed to load payroll data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived adapted payroll records
  const records = useMemo(() => {
    return payrollRecords.map(adaptPayrollRecord);
  }, [payrollRecords]);

  // Unique list of months present in the records (for filter dropdown)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    records.forEach(r => {
      if (r.month) monthsSet.add(r.month);
    });
    return Array.from(monthsSet).sort();
  }, [records]);

  // Filtered Payroll Records for display in table
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch =
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
        r.role.toLowerCase().includes(search.toLowerCase());

      const matchesMonth = filterMonth === 'All' || r.month === filterMonth;
      const matchesStatus = filterStatus === 'All' || r.status === filterStatus;

      return matchesSearch && matchesMonth && matchesStatus;
    });
  }, [records, search, filterMonth, filterStatus]);

  // Compute live high-fidelity analytics stats
  const stats = useMemo(() => {
    const totalAmount = records.reduce((sum, r) => sum + r.netSalary, 0);
    const paidCount = records.filter(r => r.status === 'Paid').length;
    const pendingCount = records.filter(r => r.status === 'Pending').length;

    // Monthly Expense: use active month filter if not 'All', otherwise fallback to most recent month in records, or default to "June 2026"
    let expenseMonthName = filterMonth;
    if (expenseMonthName === 'All') {
      expenseMonthName = availableMonths[availableMonths.length - 1] ?? 'June 2026';
    }
    const monthlyExpense = records
      .filter(r => r.month === expenseMonthName)
      .reduce((sum, r) => sum + r.netSalary, 0);

    return {
      totalAmount,
      paidCount,
      pendingCount,
      monthlyExpense,
      expenseMonthName,
    };
  }, [records, filterMonth, availableMonths]);

  // Add/Edit Save Payroll Record
  const handleSavePayroll = async (payload: SavePayrollPayload) => {
    try {
      if (activeRecord) {
        await updatePayroll(activeRecord.id, {
          ...payload,
          status: activeRecord.status, // preserve status on edit
        });
      } else {
        await createPayroll(payload);
      }
      setIsModalOpen(false);
      setActiveRecord(null);
      await loadData();
    } catch (err: any) {
      throw new Error(err?.response?.data?.message ?? err?.message ?? 'Failed to save payroll record');
    }
  };

  // Update Status (Mark Paid)
  const handleChangeStatus = async (recordId: string, status: 'Pending' | 'Paid') => {
    try {
      const id = Number(recordId);
      if (isNaN(id)) return;
      await updatePayrollStatus(id, status);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? err?.message ?? 'Failed to update payroll status');
    }
  };

  // Delete Payroll
  const handleDeletePayroll = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this payroll record?')) return;
    try {
      const id = Number(recordId);
      if (isNaN(id)) return;
      await deletePayroll(id);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? err?.message ?? 'Failed to delete payroll record');
    }
  };

  const handleOpenAdd = () => {
    setActiveRecord(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: PayrollRecord) => {
    const raw = payrollRecords.find((r) => String(r.id) === record.id) ?? null;
    if (raw) {
      setActiveRecord(raw);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveRecord(null);
  };

  // Payslip Preview Handlers
  const handleOpenPayslip = (record: PayrollRecord) => {
    setSelectedPayslip(record);
    setIsPayslipOpen(true);
  };

  const handleClosePayslip = () => {
    setSelectedPayslip(null);
    setIsPayslipOpen(false);
  };

  return {
    records,
    filteredRecords,
    employees,
    availableMonths,
    stats,
    isLoading,
    error,
    search,
    setSearch,
    filterMonth,
    setFilterMonth,
    filterStatus,
    setFilterStatus,
    isModalOpen,
    activeRecord,
    isPayslipOpen,
    selectedPayslip,
    handleSavePayroll,
    handleChangeStatus,
    handleDeletePayroll,
    handleOpenAdd,
    handleOpenEdit,
    handleCloseModal,
    handleOpenPayslip,
    handleClosePayslip,
    refresh: loadData,
  };
}
