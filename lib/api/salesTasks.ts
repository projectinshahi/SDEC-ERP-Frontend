/**
 * SE-023 / SE-024 — Sales Task API. Wrappers over `/sales/tasks`.
 */
import { apiClient } from './api-client';
import type {
  SalesTask,
  SalesTaskFilters,
  CreateSalesTaskPayload,
  UpdateSalesTaskPayload,
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
