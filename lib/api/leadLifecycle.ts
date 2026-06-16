/**
 * Lead Lifecycle API service: history, disqualification, conversion, aging,
 * deals + deal stages, and bulk import (preview + mapped import).
 */

import { apiClient } from './api-client';
import type {
  HistoryEntry,
  AgingReport,
  Deal,
  DealStage,
  ImportPreview,
  ImportResult,
  ImportMapping,
} from '@/lib/types/leadLifecycle';

// ── Follow-up history ───────────────────────────────────────────────────────

export async function fetchLeadHistory(leadId: number | string): Promise<HistoryEntry[]> {
  const res = await apiClient.get<HistoryEntry[]>(`/sales/leads/${leadId}/history`);
  return res.data;
}

// ── Disqualification ────────────────────────────────────────────────────────

export async function disqualifyLead(leadId: number | string, reason: string) {
  const res = await apiClient.put(`/sales/leads/${leadId}/disqualify`, { reason });
  return res.data;
}

// ── Conversion ──────────────────────────────────────────────────────────────

export async function convertLeadToDeal(leadId: number | string, amount?: number): Promise<Deal> {
  const res = await apiClient.post<Deal>(`/sales/leads/${leadId}/convert`, { amount });
  return res.data;
}

// ── Aging ───────────────────────────────────────────────────────────────────

export async function fetchLeadAging(days: number): Promise<AgingReport> {
  const res = await apiClient.get<AgingReport>(`/sales/leads/aging?days=${days}`);
  return res.data;
}

// ── Deals + stages ──────────────────────────────────────────────────────────

export interface DealFilters {
  stage?: string;
  ownerId?: string | number;
  search?: string;
}

export async function fetchDeals(filters: DealFilters = {}): Promise<Deal[]> {
  const params = new URLSearchParams();
  if (filters.stage && filters.stage !== 'all') params.set('stage', String(filters.stage));
  if (filters.ownerId && filters.ownerId !== 'all') params.set('ownerId', String(filters.ownerId));
  if (filters.search && filters.search.trim()) params.set('search', filters.search.trim());
  const qs = params.toString();
  const res = await apiClient.get<Deal[]>(`/sales/deals${qs ? `?${qs}` : ''}`);
  return res.data;
}

export async function fetchDealStages(): Promise<DealStage[]> {
  const res = await apiClient.get<DealStage[]>('/sales/deal-stages');
  return res.data;
}

export async function moveDealStage(id: number | string, stage: string, orderIndex?: number): Promise<Deal> {
  const res = await apiClient.put<Deal>(`/sales/deals/${id}/stage`, { stage, orderIndex });
  return res.data;
}

// ── Bulk import (preview + mapped import) ────────────────────────────────────

export async function previewLeadImport(file: File, mapping?: ImportMapping): Promise<ImportPreview> {
  const data = new FormData();
  data.append('file', file);
  if (mapping) data.append('mapping', JSON.stringify(mapping));
  const res = await apiClient.post<ImportPreview>('/sales/leads/import/preview', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function importLeads(file: File, mapping?: ImportMapping): Promise<ImportResult> {
  const data = new FormData();
  data.append('file', file);
  if (mapping) data.append('mapping', JSON.stringify(mapping));
  const res = await apiClient.post<ImportResult>('/sales/leads/import', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
