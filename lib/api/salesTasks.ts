/**
 * SE-023 / SE-024 — Sales Task API. Wrappers over `/sales/tasks`.
 */
import { apiClient } from './api-client';
import type {
  SalesTask,
  SalesTaskFilters,
  CreateSalesTaskPayload,
  UpdateSalesTaskPayload,
  SalesTaskOutcome,
  TeamTasksResponse,
} from '@/lib/types/salesExecution';

export async function fetchSalesTasks(filters: SalesTaskFilters = {}): Promise<SalesTask[]> {
  const params = new URLSearchParams();
  if (filters.dealId != null) params.set('dealId', String(filters.dealId));
  if (filters.leadId != null) params.set('leadId', String(filters.leadId));
  if (filters.assigneeId != null) params.set('assigneeId', String(filters.assigneeId));
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);
  if (filters.blocked) params.set('blocked', 'true');
  if (filters.scope) params.set('scope', filters.scope);
  if (filters.due) params.set('due', filters.due);
  const qs = params.toString();
  const res = await apiClient.get<SalesTask[]>(`/sales/tasks${qs ? `?${qs}` : ''}`);
  return res.data;
}

export async function createSalesTask(payload: CreateSalesTaskPayload): Promise<SalesTask> {
  const res = await apiClient.post<SalesTask>('/sales/tasks', payload);
  return res.data;
}

export async function updateSalesTask(id: number, payload: UpdateSalesTaskPayload): Promise<SalesTask> {
  const res = await apiClient.put<SalesTask>(`/sales/tasks/${id}`, payload);
  return res.data;
}

export async function setSalesTaskBlocked(
  id: number,
  blocked: boolean,
  blockerReason?: string,
): Promise<SalesTask> {
  const res = await apiClient.put<SalesTask>(`/sales/tasks/${id}/block`, { blocked, blockerReason });
  return res.data;
}

export async function deleteSalesTask(id: number): Promise<void> {
  await apiClient.delete(`/sales/tasks/${id}`);
}

/** SE-026.1 — complete a task with an outcome + optional notes. */
export async function completeSalesTask(
  id: number,
  outcome: SalesTaskOutcome,
  completionNotes?: string,
): Promise<SalesTask> {
  const res = await apiClient.put<SalesTask>(`/sales/tasks/${id}/complete`, { outcome, completionNotes });
  return res.data;
}

/** SE-028.1 — manager team task view (KPIs + per-member rollup + task list). */
export async function fetchTeamTasks(
  filters: { userId?: number; status?: string; priority?: string } = {},
): Promise<TeamTasksResponse> {
  const params = new URLSearchParams();
  if (filters.userId != null) params.set('userId', String(filters.userId));
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  const qs = params.toString();
  const res = await apiClient.get<TeamTasksResponse>(`/sales/tasks/team${qs ? `?${qs}` : ''}`);
  return res.data;
}
