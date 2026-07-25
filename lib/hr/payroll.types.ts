export interface PayrollRecord {
  id: string;
  employeeId: number;
  employeeCode: string;
  name: string;
  role: string;
  basicSalary: number;
  bonus: number;
  deduction: number; // legacy: equals totalDeductions on new records
  netSalary: number;
  month: string; // Format: "June 2026"
  status: 'Pending' | 'Paid';
  createdAt: string;
  // Snapshot fields (default 0 on legacy rows — render gracefully).
  da: number;
  calendarDays: number;
  officeWorkingDays: number;
  workedDays: number;
  lop: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  payableBasic: number;
  payableDa: number;
  gross: number;
  esi: number;
  fine: number;
  specialAllowance: number;
  pf: number;
  incentive: number;
  arrears: number;
  totalDeductions: number;
}
