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
  address: string | null;
  emergency_contact: string | null;
  salary: number;
  employment_status: string; 
  join_date: string;
  date_of_birth: string | null;
  manager_id: number | null;
}

export interface ApiAvailableUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface CreateEmployeePayload {
  user_id: number;
  department: string;        // required — selected from dropdown
  designation: string;       // job title
  phone?: string;
  address?: string;
  emergency_contact?: string;
  salary?: number;
  join_date: string;
  date_of_birth: string;
  employment_status?: string;
  manager_id?: number;
}

export interface UpdateEmployeePayload {
  department?: string;
  designation?: string;
  phone?: string;
  address?: string;
  emergency_contact?: string;
  salary?: number;
  date_of_birth?: string;
  employment_status?: string;
  manager_id?: number;
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
 * Fetch available users who are not linked to an employee profile.
 * GET /hr/available-users
 */
export async function fetchAvailableUsers(): Promise<ApiAvailableUser[]> {
  const res = await apiClient.get<{ success: boolean; data: ApiAvailableUser[] }>('/hr/available-users');
  return res.data?.data ?? [];
}

/**
 * Create a new user account inline from the employee onboarding modal.
 * POST /hr/users
 */
export async function createInlineUser(data: {
  name: string;
  email: string;
  role: string;
}): Promise<{ success: boolean; data: ApiAvailableUser }> {
  const res = await apiClient.post<{ success: boolean; data: ApiAvailableUser }>('/hr/users', data);
  return res.data;
}

/**
 * Create an employee record linked to an existing user.
 * POST /hr/employees
 */
export async function createEmployee(data: CreateEmployeePayload): Promise<any> {
  const res = await apiClient.post('/hr/employees', data);
  return res.data;
}

/**
 * Update the employee row.
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
