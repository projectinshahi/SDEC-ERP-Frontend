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
  DealDetail,
  DealActivityLog,
  DealNote,
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

/** Payload for creating / editing a deal (all optional except the create-required title/customerId/amount). */
export interface DealFormPayload {
  title: string;
  customerId: number;
  amount: number;
  stage?: string;
  ownerId?: number;
  probability?: number;
  expectedCloseDate?: string | null;
  notes?: string | null;
  description?: string | null;
  currency?: string;
}

/** POST /sales/deals — create a new deal (requires sales.create). */
export async function createDeal(payload: DealFormPayload): Promise<Deal> {
  const res = await apiClient.post<Deal>('/sales/deals', payload);
  return res.data;
}

/** PUT /sales/deals/:id — update an existing deal (requires sales.edit). */
export async function updateDeal(id: number | string, payload: Partial<DealFormPayload>): Promise<Deal> {
  const res = await apiClient.put<Deal>(`/sales/deals/${id}`, payload);
  return res.data;
}

/** Account/Contact options for the deal "Linked Account" picker (GET /sales/customers). */
export interface CustomerOption {
  id: number;
  name: string;
  company?: string | null;
}
export async function fetchSalesCustomers(): Promise<CustomerOption[]> {
  const res = await apiClient.get<CustomerOption[]>('/sales/customers');
  return res.data;
}

// ── Deal Details (360° view) ────────────────────────────────────────────────

/** GET /sales/deals/:id — full deal (customer, owner, lead, activity, forecast). */
export async function fetchDeal(id: number | string): Promise<DealDetail> {
  const res = await apiClient.get<DealDetail>(`/sales/deals/${id}`);
  return res.data;
}

/** POST /sales/deals/:id/activity — append a Note/Call/Meeting/Proposal entry. */
export async function logDealActivity(
  id: number | string,
  payload: { type: 'note' | 'call' | 'meeting' | 'proposal'; description: string },
): Promise<DealActivityLog> {
  const res = await apiClient.post<DealActivityLog>(`/sales/deals/${id}/activity`, payload);
  return res.data;
}

/** DELETE /sales/deals/:id — permanently delete a deal (requires sales.delete). */
export async function deleteDeal(id: number | string): Promise<void> {
  await apiClient.delete(`/sales/deals/${id}`);
}

// ── Deal Notes (editable add/edit/delete) ────────────────────────────────────

export async function fetchDealNotes(dealId: number | string): Promise<DealNote[]> {
  const res = await apiClient.get<DealNote[]>(`/sales/deals/${dealId}/notes`);
  return res.data;
}
export async function createDealNote(dealId: number | string, content: string): Promise<DealNote> {
  const res = await apiClient.post<DealNote>(`/sales/deals/${dealId}/notes`, { content });
  return res.data;
}
export async function updateDealNote(dealId: number | string, noteId: number, content: string): Promise<DealNote> {
  const res = await apiClient.put<DealNote>(`/sales/deals/${dealId}/notes/${noteId}`, { content });
  return res.data;
}
export async function deleteDealNote(dealId: number | string, noteId: number): Promise<void> {
  await apiClient.delete(`/sales/deals/${dealId}/notes/${noteId}`);
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
