/**
 * Lead Management API service.
 *
 * Thin wrappers over the shared apiClient that mirror the `/sales/leads`
 * backend routes. Keeps components free of raw URL strings.
 */

import { apiClient } from './api-client';
import type { LeadTemperature } from '@/lib/data/leadTemperature';
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

// ── Manual lead creation ────────────────────────────────────────────────────

/** Optional initial "next action" created together with a new lead. */
export interface CreateLeadNextAction {
  type: string;
  title: string;
  description?: string;
  /** Owner of the follow-up; defaults to the lead owner when omitted. */
  assignedTo?: number;
  /** ISO timestamp for the due date & time. */
  dueDate: string;
  priority?: string;
}

export interface CreateLeadPayload {
  name: string;
  /** Explicit Opportunity Name → lead title (falls back to name — company when omitted). */
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  /** Contact designation / job title. */
  designation?: string;
  /** Contact WhatsApp number. */
  whatsapp?: string;
  source: string;
  referralName?: string;
  /** Owner of the new lead; defaults to the creator when omitted. */
  ownerId?: number;
  industry?: string;
  website?: string;
  /** Maps to the customer's address (shown as Location). */
  address?: string;
  leadValue?: string;
  /** Optional link to an existing normalized Company (CRM account). */
  companyId?: number;
  priority?: string;
  /** Customer district (CR-01) — optional. */
  district?: string;
  /** Manual lead classification (COLD / WARM / HOT); defaults to COLD. */
  temperature?: LeadTemperature;
  /** Free-text notes — stored as an editable lead note. */
  notes?: string;
  nextAction?: CreateLeadNextAction;
}

/** Create a lead by hand. Persists notes + an optional first action server-side. */
export async function createManualLead(payload: CreateLeadPayload): Promise<Lead> {
  const res = await apiClient.post<Lead>('/sales/leads/manual', payload);
  return res.data;
}

/** Live duplicate check by email / phone while capturing a lead. */
export async function checkLeadDuplicate(
  email: string,
  phone: string,
): Promise<{ duplicate: boolean; message: string | null }> {
  const res = await apiClient.post<{ duplicate: boolean; message: string | null }>(
    '/sales/leads/check-duplicate',
    { email, phone },
  );
  return res.data;
}

export async function updateLead(id: number | string, payload: UpdateLeadPayload): Promise<Lead> {
  const res = await apiClient.put<Lead>(`/sales/leads/${id}`, payload);
  return res.data;
}

/**
 * Permanently delete a lead and its dependent records. Requires the
 * `sales.leads.delete` permission — the backend returns 403 otherwise.
 */
export async function deleteLead(id: number | string): Promise<void> {
  await apiClient.delete(`/sales/leads/${id}`);
}

export async function fetchLeadStages(): Promise<LeadStage[]> {
  const res = await apiClient.get<LeadStage[]>('/sales/lead-stages');
  return res.data;
}

// ── Pipeline stage management (board columns) ───────────────────────────────

/** Create a custom pipeline stage (appended as the last column). */
export async function createLeadStage(name: string): Promise<LeadStage> {
  const res = await apiClient.post<LeadStage>('/sales/lead-stages', { name });
  return res.data;
}

/** Rename a stage — the backend cascades the new name to every lead in it. */
export async function updateLeadStage(id: number, name: string): Promise<LeadStage> {
  const res = await apiClient.put<LeadStage>(`/sales/lead-stages/${id}`, { name });
  return res.data;
}

/**
 * Delete a stage. Leads in it are relocated to `reassignTo` (or the first
 * remaining stage when omitted) so the pipeline never loses leads.
 */
export async function deleteLeadStage(
  id: number,
  reassignTo?: string,
): Promise<{ success: boolean; reassignedTo: string }> {
  const res = await apiClient.delete<{ success: boolean; reassignedTo: string }>(
    `/sales/lead-stages/${id}`,
    reassignTo ? { data: { reassignTo } } : undefined,
  );
  return res.data;
}

/** Persist a new column order. Pass every stage id, in the desired order. */
export async function reorderLeadStages(orderedIds: number[]): Promise<LeadStage[]> {
  const res = await apiClient.put<LeadStage[]>('/sales/lead-stages/reorder', { orderedIds });
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

/**
 * Move a lead to a target pipeline stage (drag-and-drop → Stage Transition Dialog).
 * `checklist` (selected item labels) and `description` are OPTIONAL and recorded in the
 * opportunity's activity/history; the backend ignores them when absent.
 */
export async function moveLeadStage(
  id: number | string,
  stage: string,
  opts?: { orderIndex?: number; checklist?: string[]; description?: string }
): Promise<Lead> {
  const res = await apiClient.put<Lead>(`/sales/leads/${id}/stage`, {
    stage,
    orderIndex: opts?.orderIndex,
    checklist: opts?.checklist,
    description: opts?.description,
  });
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
