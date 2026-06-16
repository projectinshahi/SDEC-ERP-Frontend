/**
 * SE-025.1 — BDE Dashboard + Targets API. Wrappers over `/sales/bde/*` and
 * `/sales/targets`.
 */
import { apiClient } from './api-client';
import type { BdeDashboard, SalesTarget } from '@/lib/types/salesExecution';

export async function fetchBdeDashboard(ownerId?: number): Promise<BdeDashboard> {
  const qs = ownerId != null ? `?ownerId=${ownerId}` : '';
  const res = await apiClient.get<BdeDashboard>(`/sales/bde/dashboard${qs}`);
  return res.data;
}

export async function fetchMyTarget(period?: string): Promise<SalesTarget> {
  const qs = period ? `?period=${period}` : '';
  const res = await apiClient.get<SalesTarget>(`/sales/targets/my${qs}`);
  return res.data;
}

export async function setTarget(targetAmount: number, period?: string, ownerId?: number): Promise<SalesTarget> {
  const res = await apiClient.put<SalesTarget>('/sales/targets', { targetAmount, period, ownerId });
  return res.data;
}
