import { apiClient } from './api-client';

export interface ApiLeaveRecord {
  id: number;
  employee_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  employee_code?: string;
  department?: string;
  designation?: string;
  name?: string;
}

export interface ApiLeaveStats {
  pending: number;
  approved: number;
  rejected: number;
}

export interface CreateLeavePayload {
  employee_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
}

/**
 * Fetch all leaves joined with employee/user data
 */
export async function fetchLeaves(): Promise<ApiLeaveRecord[]> {
  const res = await apiClient.get<{ success: boolean; data: ApiLeaveRecord[] }>('/hr/leaves');
  return res.data?.data ?? [];
}

/**
 * Fetch leave counts grouped by status
 */
export async function fetchLeaveStats(): Promise<ApiLeaveStats> {
  const res = await apiClient.get<{ success: boolean; data: ApiLeaveStats }>('/hr/leaves/stats');
  return res.data?.data ?? { pending: 0, approved: 0, rejected: 0 };
}

/**
 * Create a new leave request
 */
export async function createLeave(payload: CreateLeavePayload): Promise<void> {
  await apiClient.post<{ success: boolean }>('/hr/leaves', payload);
}

/**
 * Approve a leave request
 */
export async function approveLeave(id: number): Promise<void> {
  await apiClient.put<{ success: boolean }>(`/hr/leaves/${id}/approve`);
}

/**
 * Reject a leave request
 */
export async function rejectLeave(id: number): Promise<void> {
  await apiClient.put<{ success: boolean }>(`/hr/leaves/${id}/reject`);
}
