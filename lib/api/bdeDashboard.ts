/**
 * SE-025/040/041/043 — BDE Dashboard + Targets API. Wrappers over `/sales/bde/*`
 * and `/sales/targets`.
 */
import { apiClient } from './api-client';
import type {
  BdeDashboard, SalesTarget, TargetType, PeriodType, TargetHistoryResponse,
  TargetListResponse, TargetFilters, TargetDetail,
} from '@/lib/types/salesExecution';

export async function fetchBdeDashboard(ownerId?: number): Promise<BdeDashboard> {
  const qs = ownerId != null ? `?ownerId=${ownerId}` : '';
  const res = await apiClient.get<BdeDashboard>(`/sales/bde/dashboard${qs}`);
  return res.data;
}

export interface FetchTargetOpts {
  type?: TargetType;
  period?: string;
  periodType?: PeriodType;
  ownerId?: number;
}

export async function fetchMyTarget(opts: FetchTargetOpts = {}): Promise<SalesTarget> {
  const params = new URLSearchParams();
  if (opts.type) params.set('type', opts.type);
  if (opts.period) params.set('period', opts.period);
  if (opts.periodType) params.set('periodType', opts.periodType);
  if (opts.ownerId != null) params.set('ownerId', String(opts.ownerId));
  const qs = params.toString();
  const res = await apiClient.get<SalesTarget>(`/sales/targets/my${qs ? `?${qs}` : ''}`);
  return res.data;
}

export interface SetTargetPayload {
  targetAmount: number;
  type?: TargetType;
  period?: string;
  periodType?: PeriodType;
  ownerId?: number;
  name?: string | null;
  description?: string | null;
}

export async function setTarget(payload: SetTargetPayload): Promise<SalesTarget> {
  const res = await apiClient.put<SalesTarget>('/sales/targets', payload);
  return res.data;
}

export async function fetchTargetHistory(ownerId?: number): Promise<TargetHistoryResponse> {
  const qs = ownerId != null ? `?ownerId=${ownerId}` : '';
  const res = await apiClient.get<TargetHistoryResponse>(`/sales/targets/history${qs}`);
  return res.data;
}

/** Target Management — list targets in scope with live achievement + summary. */
export async function fetchTargets(filters: TargetFilters = {}): Promise<TargetListResponse> {
  const params = new URLSearchParams();
  if (filters.ownerId != null) params.set('ownerId', String(filters.ownerId));
  if (filters.period) params.set('period', filters.period);
  if (filters.periodType) params.set('periodType', filters.periodType);
  if (filters.type) params.set('type', filters.type);
  if (filters.status) params.set('status', filters.status);
  if (filters.search && filters.search.trim()) params.set('search', filters.search.trim());
  const qs = params.toString();
  const res = await apiClient.get<TargetListResponse>(`/sales/targets${qs ? `?${qs}` : ''}`);
  return res.data;
}

export async function fetchTargetById(id: number): Promise<TargetDetail> {
  const res = await apiClient.get<TargetDetail>(`/sales/targets/${id}`);
  return res.data;
}

export async function deleteTarget(id: number): Promise<void> {
  await apiClient.delete(`/sales/targets/${id}`);
}
