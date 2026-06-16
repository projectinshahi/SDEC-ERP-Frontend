/**
 * Lead Management API service.
 *
 * Thin wrappers over the shared apiClient that mirror the `/sales/leads`
 * backend routes. Keeps components free of raw URL strings.
 */

import { apiClient } from './api-client';
import type {
  Lead,
  LeadDetail,
  LeadNote,
  LeadStage,
  AssignableUser,
  StageAnalytics,
  UpdateLeadPayload,
} from '@/lib/types/lead';

export interface LeadFilters {
  source?: string;
  stage?: string;
  status?: string;
  ownerId?: string | number;
  search?: string;
}

/** Fetch leads, optionally filtered. Used by the list and pipeline board. */
export async function fetchLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  const params = new URLSearchParams();
  if (filters.source && filters.source !== 'all') params.set('source', String(filters.source));
  if (filters.stage && filters.stage !== 'all') params.set('stage', String(filters.stage));
  if (filters.status && filters.status !== 'all') params.set('status', String(filters.status));
  if (filters.ownerId && filters.ownerId !== 'all') params.set('ownerId', String(filters.ownerId));
  if (filters.search && filters.search.trim()) params.set('search', filters.search.trim());
  const qs = params.toString();
  const res = await apiClient.get<Lead[]>(`/sales/leads${qs ? `?${qs}` : ''}`);
  return res.data;
}

export async function fetchLead(id: number | string): Promise<LeadDetail> {
  const res = await apiClient.get<LeadDetail>(`/sales/leads/${id}`);
  return res.data;
}

export async function updateLead(id: number | string, payload: UpdateLeadPayload): Promise<Lead> {
  const res = await apiClient.put<Lead>(`/sales/leads/${id}`, payload);
  return res.data;
}

export async function fetchLeadStages(): Promise<LeadStage[]> {
  const res = await apiClient.get<LeadStage[]>('/sales/lead-stages');
  return res.data;
}

export async function fetchAssignableUsers(): Promise<AssignableUser[]> {
  const res = await apiClient.get<AssignableUser[]>('/sales/assignable-users');
  return res.data;
}

export async function fetchStageAnalytics(): Promise<StageAnalytics> {
  const res = await apiClient.get<StageAnalytics>('/sales/leads/analytics/stage');
  return res.data;
}

/** Move a lead to a target pipeline stage (drag-and-drop). */
export async function moveLeadStage(
  id: number | string,
  stage: string,
  orderIndex?: number
): Promise<Lead> {
  const res = await apiClient.put<Lead>(`/sales/leads/${id}/stage`, { stage, orderIndex });
  return res.data;
}

// ── Notes ─────────────────────────────────────────────────────────────────

export async function fetchLeadNotes(leadId: number | string): Promise<LeadNote[]> {
  const res = await apiClient.get<LeadNote[]>(`/sales/leads/${leadId}/notes`);
  return res.data;
}

export async function createLeadNote(leadId: number | string, content: string): Promise<LeadNote> {
  const res = await apiClient.post<LeadNote>(`/sales/leads/${leadId}/notes`, { content });
  return res.data;
}

export async function updateLeadNote(
  leadId: number | string,
  noteId: number,
  content: string
): Promise<LeadNote> {
  const res = await apiClient.put<LeadNote>(`/sales/leads/${leadId}/notes/${noteId}`, { content });
  return res.data;
}

export async function deleteLeadNote(leadId: number | string, noteId: number): Promise<void> {
  await apiClient.delete(`/sales/leads/${leadId}/notes/${noteId}`);
}
