import { apiClient } from './api-client';
import { ApiPerformanceCycle, ApiAppraisal, ApiGoal, PerformanceStats } from '../hr/performance.types';

// Cycles
export async function fetchCycles(): Promise<ApiPerformanceCycle[]> {
  const res = await apiClient.get<{ success: boolean; data: ApiPerformanceCycle[] }>('/hr/performance/cycles');
  return res.data?.data ?? [];
}

export async function createCycle(payload: { title: string; start_date: string; end_date: string; status?: string }): Promise<any> {
  const res = await apiClient.post('/hr/performance/cycles', payload);
  return res.data;
}

// Appraisals
export async function fetchAppraisals(): Promise<ApiAppraisal[]> {
  const res = await apiClient.get<{ success: boolean; data: ApiAppraisal[] }>('/hr/performance');
  return res.data?.data ?? [];
}

export async function fetchAppraisalById(id: number): Promise<ApiAppraisal | null> {
  const res = await apiClient.get<{ success: boolean; data: ApiAppraisal }>(`/hr/performance/${id}`);
  return res.data?.data ?? null;
}

export async function createAppraisal(payload: { employee_id: number; cycle_id: number; evaluator_id?: number | null }): Promise<any> {
  const res = await apiClient.post('/hr/performance', payload);
  return res.data;
}

export async function updateAppraisal(id: number, payload: { evaluator_id: number; cycle_id: number }): Promise<any> {
  const res = await apiClient.put(`/hr/performance/${id}`, payload);
  return res.data;
}

export async function updateAppraisalStatus(id: number, payload: { status: string; final_comments?: string | null }): Promise<any> {
  const res = await apiClient.patch(`/hr/performance/${id}/status`, payload);
  return res.data;
}

export async function deleteAppraisal(id: number): Promise<any> {
  const res = await apiClient.delete(`/hr/performance/${id}`);
  return res.data;
}

// Self review
export async function submitSelfReview(
  id: number,
  payload: {
    self_rating_tech: number;
    self_rating_comm: number;
    self_rating_team: number;
    self_rating_prod: number;
    self_rating_solve: number;
    self_rating_lead?: number | null;
    self_comments?: string | null;
    is_draft?: boolean;
  }
): Promise<any> {
  const res = await apiClient.patch(`/hr/performance/${id}/self-review`, payload);
  return res.data;
}

// Manager review
export async function submitManagerReview(
  id: number,
  payload: {
    manager_rating_tech: number;
    manager_rating_comm: number;
    manager_rating_team: number;
    manager_rating_prod: number;
    manager_rating_solve: number;
    manager_rating_lead?: number | null;
    manager_comments?: string | null;
    strengths?: string | null;
    improvement_areas?: string | null;
    promotion_recommendation?: string | null;
    is_draft?: boolean;
  }
): Promise<any> {
  const res = await apiClient.patch(`/hr/performance/${id}/manager-review`, payload);
  return res.data;
}

export async function approveAppraisal(id: number, final_comments?: string | null): Promise<any> {
  const res = await apiClient.patch(`/hr/performance/${id}/approve`, { final_comments });
  return res.data;
}

export async function rejectAppraisal(id: number, comments?: string | null): Promise<any> {
  const res = await apiClient.patch(`/hr/performance/${id}/reject`, { comments });
  return res.data;
}

// Stats
export async function fetchPerformanceStats(): Promise<PerformanceStats> {
  const res = await apiClient.get<{ success: boolean; data: PerformanceStats }>('/hr/performance/stats');
  return res.data?.data ?? { active: 0, self_pending: 0, manager_pending: 0, completed: 0 };
}

// Goals
export async function fetchGoals(params?: { employee_id?: number; appraisal_id?: number }): Promise<ApiGoal[]> {
  const res = await apiClient.get<{ success: boolean; data: ApiGoal[] }>('/hr/performance/goals', { params });
  return res.data?.data ?? [];
}

export async function createGoal(payload: {
  employee_id: number;
  appraisal_id?: number | null;
  title: string;
  description?: string | null;
  weight?: number;
  progress_pct?: number;
  score?: number;
  target_date?: string | null;
}): Promise<any> {
  const res = await apiClient.post('/hr/performance/goals', payload);
  return res.data;
}

export async function updateGoal(
  id: number,
  payload: {
    title: string;
    description?: string | null;
    weight?: number;
    progress_pct?: number;
    score?: number;
    target_date?: string | null;
  }
): Promise<any> {
  const res = await apiClient.put(`/hr/performance/goals/${id}`, payload);
  return res.data;
}

export async function deleteGoal(id: number): Promise<any> {
  const res = await apiClient.delete(`/hr/performance/goals/${id}`);
  return res.data;
}
