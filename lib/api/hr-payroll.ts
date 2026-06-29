import { apiClient } from './api-client';

export interface ApiPayrollRecord {
  id: number;
  employee_id: number;
  basic_salary: number;
  bonus: number;
  deduction: number;
  net_salary: number;
  month: string;
  status: string;
  created_at: string;
  employee_code: string;
  designation: string;
  name: string | null;
}

export interface SavePayrollPayload {
  employee_id: number;
  basic_salary: number;
  bonus?: number;
  deduction?: number;
  month: string;
  status?: string;
}

/** Fetch all payroll records */
export async function fetchPayroll(): Promise<ApiPayrollRecord[]> {
  const res = await apiClient.get<{ success: boolean; data: ApiPayrollRecord[] }>('/hr/payroll');
  return res.data?.data ?? [];
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
