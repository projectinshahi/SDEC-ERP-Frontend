/**
 * SE-027 — Recurring task rule API. Wrappers over `/sales/tasks/recurring`.
 */
import { apiClient } from './api-client';
import type { RecurrenceRule, CreateRecurrenceRulePayload } from '@/lib/types/salesExecution';

export async function fetchRecurrenceRules(
  filters: { dealId?: number; leadId?: number; assigneeId?: number; active?: boolean } = {},
): Promise<RecurrenceRule[]> {
  const params = new URLSearchParams();
  if (filters.dealId != null) params.set('dealId', String(filters.dealId));
  if (filters.leadId != null) params.set('leadId', String(filters.leadId));
  if (filters.assigneeId != null) params.set('assigneeId', String(filters.assigneeId));
  if (filters.active != null) params.set('active', String(filters.active));
  const qs = params.toString();
  const res = await apiClient.get<RecurrenceRule[]>(`/sales/tasks/recurring${qs ? `?${qs}` : ''}`);
  return res.data;
}

export async function createRecurrenceRule(payload: CreateRecurrenceRulePayload): Promise<RecurrenceRule> {
  const res = await apiClient.post<RecurrenceRule>('/sales/tasks/recurring', payload);
  return res.data;
}

export async function updateRecurrenceRule(
  id: number,
  payload: Partial<CreateRecurrenceRulePayload> & { active?: boolean },
): Promise<RecurrenceRule> {
  const res = await apiClient.put<RecurrenceRule>(`/sales/tasks/recurring/${id}`, payload);
  return res.data;
}

export async function deleteRecurrenceRule(id: number): Promise<void> {
  await apiClient.delete(`/sales/tasks/recurring/${id}`);
}
