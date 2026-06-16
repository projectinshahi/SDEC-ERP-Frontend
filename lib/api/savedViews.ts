/**
 * SE-020.1 — Saved Pipeline View API. Thin wrappers over `/sales/views`.
 */
import { apiClient } from './api-client';
import type { SavedView, SavedViewEntity, SavedViewScope, PipelineFilters } from '@/lib/types/salesExecution';

export async function fetchSavedViews(entity: SavedViewEntity = 'deal'): Promise<SavedView[]> {
  const res = await apiClient.get<SavedView[]>(`/sales/views?entity=${entity}`);
  return res.data;
}

export interface CreateViewPayload {
  name: string;
  entity?: SavedViewEntity;
  scope?: SavedViewScope;
  filters: PipelineFilters;
}

export async function createSavedView(payload: CreateViewPayload): Promise<SavedView> {
  const res = await apiClient.post<SavedView>('/sales/views', payload);
  return res.data;
}

export async function updateSavedView(
  id: number,
  payload: Partial<CreateViewPayload>,
): Promise<SavedView> {
  const res = await apiClient.put<SavedView>(`/sales/views/${id}`, payload);
  return res.data;
}

export async function deleteSavedView(id: number): Promise<void> {
  await apiClient.delete(`/sales/views/${id}`);
}
