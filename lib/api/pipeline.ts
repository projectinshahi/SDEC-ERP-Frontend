/**
 * SE-020.1 / SE-021.1 — Advanced pipeline filtering + stalled-threshold config.
 * Wrappers over `/sales/pipeline/deals` and `/sales/stage-config`.
 */
import { apiClient } from './api-client';
import type { PipelineFilters, PipelineResponse, DealStageConfig } from '@/lib/types/salesExecution';

/** Builds the query string from a (possibly partial) filter set. */
function toParams(filters: PipelineFilters): string {
  const params = new URLSearchParams();
  const set = (k: string, v: unknown) => {
    if (v !== undefined && v !== null && String(v).trim() !== '' && v !== 'all') {
      params.set(k, String(v));
    }
  };
  set('valueMin', filters.valueMin);
  set('valueMax', filters.valueMax);
  set('stage', filters.stage);
  set('ownerId', filters.ownerId);
  set('closeMonth', filters.closeMonth);
  set('probabilityMin', filters.probabilityMin);
  set('probabilityMax', filters.probabilityMax);
  set('source', filters.source);
  set('company', filters.company);
  set('status', filters.status);
  set('search', filters.search);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchPipelineDeals(filters: PipelineFilters = {}): Promise<PipelineResponse> {
  const res = await apiClient.get<PipelineResponse>(`/sales/pipeline/deals${toParams(filters)}`);
  return res.data;
}

export async function fetchStageConfig(): Promise<DealStageConfig[]> {
  const res = await apiClient.get<DealStageConfig[]>('/sales/stage-config');
  return res.data;
}

export async function updateStageConfig(
  thresholds: Record<string, number>,
): Promise<DealStageConfig[]> {
  const res = await apiClient.put<DealStageConfig[]>('/sales/stage-config', { thresholds });
  return res.data;
}
