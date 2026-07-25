import { apiClient } from './api-client';

export interface ApiPayrollRecord {
  id: number;
  employee_id: number;
  basic_salary: number;
  bonus: number;
  deduction: number; // legacy: mirrors total_deductions on new records
  net_salary: number;
  month: string;
  status: string;
  created_at: string;
  employee_code: string;
  designation: string;
  name: string | null;
  // Snapshot fields (present on new records; may be 0/undefined on legacy rows).
  da?: number;
  calendar_days?: number;
  office_working_days?: number;
  worked_days?: number;
  lop?: number;
  paid_leave_days?: number;
  unpaid_leave_days?: number;
  payable_basic?: number;
  payable_da?: number;
  gross?: number;
  esi?: number;
  fine?: number;
  special_allowance?: number;
  pf?: number;
  incentive?: number;
  arrears?: number;
  total_deductions?: number;
}

export interface SavePayrollPayload {
  employee_id: number;
  month: string;
  basic_salary: number;
  da?: number;
  fine?: number;
  special_allowance?: number;
  pf?: number;
  bonus?: number;
  incentive?: number;
  arrears?: number;
  status?: string;
  /** @deprecated legacy flat deduction — ignored by the new backend */
  deduction?: number;
}

/** Read-only attendance day snapshot + suggested 75/25 split for the generate form. */
export interface ApiPayrollPreview {
  calendarDays: number;
  officeWorkingDays: number;
  employeeWorkedDays: number;
  lossOfPay: number;
  presentDays: number;
  approvedLeaveDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  totalSalary: number;
  suggestedBasicSalary: number;
  suggestedDearnessAllowance: number;
}

/** Fetch all payroll records */
export async function fetchPayroll(): Promise<ApiPayrollRecord[]> {
  const res = await apiClient.get<{ success: boolean; data: ApiPayrollRecord[] }>('/hr/payroll');
  return res.data?.data ?? [];
}

/** Read-only day snapshot + suggested split for an employee + month (CREATE flow only). */
export async function fetchPayrollAttendancePreview(
  employeeId: number,
  month: string,
): Promise<ApiPayrollPreview> {
  const res = await apiClient.get<{ success: boolean; data: ApiPayrollPreview }>(
    `/hr/payroll/attendance-preview?employee_id=${employeeId}&month=${encodeURIComponent(month)}`,
  );
  return res.data.data;
}

/** Create a new payroll record */
export async function createPayroll(payload: SavePayrollPayload): Promise<any> {
  const res = await apiClient.post('/hr/payroll', payload);
  return res.data;
}

/** Update an existing payroll record */
export async function updatePayroll(id: number, payload: SavePayrollPayload): Promise<any> {
  const res = await apiClient.put(`/hr/payroll/${id}`, payload);
  return res.data;
}

/** Update payroll status */
export async function updatePayrollStatus(id: number, status: string): Promise<any> {
  const res = await apiClient.patch(`/hr/payroll/${id}/status`, { status });
  return res.data;
}

/** Delete a payroll record */
export async function deletePayroll(id: number): Promise<any> {
  const res = await apiClient.delete(`/hr/payroll/${id}`);
  return res.data;
}
