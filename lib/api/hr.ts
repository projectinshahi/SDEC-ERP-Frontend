import { apiClient } from './api-client';

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface ApiEmployee {
  id: number;
  user_id: number | null;
  employee_code: string;
  name: string;
  email: string;
  department: string;
  designation: string;       
  role: string;              
  phone: string | null;
  salary: number;
  employment_status: string; 
  join_date: string;
}

export interface CreateEmployeePayload {
  name: string;
  email: string;
  role: string;              // system role name (from roles table)
  designation: string;       // job title — backend derives department from this
  phone?: string;
  salary?: number;
  join_date: string;
  employment_status?: string;
}

export interface UpdateEmployeePayload {
  name?: string;
  email?: string;
  role?: string;
  designation: string;
  phone?: string;
  salary?: number;
  employment_status?: string;
}

/* ── API functions ──────────────────────────────────────────────────────── */

/**
 * Fetch all employees joined with their user records.
 * GET /hr/employees
 */
export async function fetchEmployees(): Promise<ApiEmployee[]> {
  const res = await apiClient.get<{ success: boolean; data: ApiEmployee[] }>('/hr/employees');
  return res.data?.data ?? [];
}

/**
 * Atomically create a user + employee record on the backend.
 * POST /hr/employees
 */
export async function createEmployee(data: CreateEmployeePayload): Promise<any> {
  const res = await apiClient.post('/hr/employees', data);
  return res.data;
}

/**
 * Update both the employee row and the linked users row.
 * PUT /hr/employees/:id
 */
export async function updateEmployee(id: number, data: UpdateEmployeePayload): Promise<any> {
  const res = await apiClient.put(`/hr/employees/${id}`, data);
  return res.data;
}

/**
 * Remove the employee record and soft-deactivate the linked user.
 * DELETE /hr/employees/:id
 */
export async function deleteEmployee(id: number): Promise<any> {
  const res = await apiClient.delete(`/hr/employees/${id}`);
  return res.data;
}
