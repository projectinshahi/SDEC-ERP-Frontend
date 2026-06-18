/**
 * SE-042 — Incentive slab API. Wrappers over `/sales/incentive-slabs`.
 */
import { apiClient } from './api-client';
import type { IncentiveSlab, IncentiveSlabPayload } from '@/lib/types/salesExecution';

export async function fetchIncentiveSlabs(ownerId?: number): Promise<IncentiveSlab[]> {
  const qs = ownerId != null ? `?ownerId=${ownerId}` : '';
  const res = await apiClient.get<IncentiveSlab[]>(`/sales/incentive-slabs${qs}`);
  return res.data;
}

export async function createIncentiveSlab(payload: IncentiveSlabPayload): Promise<IncentiveSlab> {
  const res = await apiClient.post<IncentiveSlab>('/sales/incentive-slabs', payload);
  return res.data;
}

export async function updateIncentiveSlab(id: number, payload: Partial<IncentiveSlabPayload>): Promise<IncentiveSlab> {
  const res = await apiClient.put<IncentiveSlab>(`/sales/incentive-slabs/${id}`, payload);
  return res.data;
}

export async function deleteIncentiveSlab(id: number): Promise<void> {
  await apiClient.delete(`/sales/incentive-slabs/${id}`);
}
