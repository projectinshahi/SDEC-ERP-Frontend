/**
 * SE-025/040/041/043 — BDE Dashboard + Targets API. Wrappers over `/sales/bde/*`
 * and `/sales/targets`.
 */
import { apiClient } from './api-client';
import type {
  BdeDashboard, SalesTarget, TargetType, PeriodType, TargetHistoryResponse,
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
