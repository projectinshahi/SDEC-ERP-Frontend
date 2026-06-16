/**
 * Lead Qualification & Follow-up API service.
 * Wrappers over the `/sales` endpoints for scoring, interactions, assignment,
 * follow-up reminders and analytics.
 */

import { apiClient } from './api-client';
import type {
  ScoringCriterion,
  ScoreBreakdown,
  LeadInteraction,
  InteractionType,
  FollowUp,
  MyFollowUps,
  LeadOverviewAnalytics,
} from '@/lib/types/leadQualification';
import type { Lead } from '@/lib/types/lead';

// ── Scoring criteria (Admin) ────────────────────────────────────────────────

export async function fetchScoringCriteria(): Promise<ScoringCriterion[]> {
  const res = await apiClient.get<ScoringCriterion[]>('/sales/scoring-criteria');
  return res.data;
}

export async function createScoringCriterion(
  payload: { factor: string; label: string; weight: number; isActive?: boolean }
): Promise<ScoringCriterion> {
  const res = await apiClient.post<ScoringCriterion>('/sales/scoring-criteria', payload);
  return res.data;
}

export async function updateScoringCriterion(
  id: number,
  payload: Partial<{ label: string; weight: number; isActive: boolean }>
): Promise<ScoringCriterion> {
  const res = await apiClient.put<ScoringCriterion>(`/sales/scoring-criteria/${id}`, payload);
  return res.data;
}

export async function deleteScoringCriterion(id: number): Promise<void> {
  await apiClient.delete(`/sales/scoring-criteria/${id}`);
}

// ── Score breakdown ─────────────────────────────────────────────────────────

export async function fetchScoreBreakdown(leadId: number | string): Promise<ScoreBreakdown> {
  const res = await apiClient.get<ScoreBreakdown>(`/sales/leads/${leadId}/score-breakdown`);
  return res.data;
}

// ── Interactions ────────────────────────────────────────────────────────────

export async function fetchLeadInteractions(leadId: number | string): Promise<LeadInteraction[]> {
  const res = await apiClient.get<LeadInteraction[]>(`/sales/leads/${leadId}/interactions`);
  return res.data;
}

export async function createLeadInteraction(
  leadId: number | string,
  payload: { type: InteractionType; notes: string; date?: string }
): Promise<LeadInteraction> {
  const res = await apiClient.post<LeadInteraction>(`/sales/leads/${leadId}/interactions`, payload);
  return res.data;
}

// ── Assignment ──────────────────────────────────────────────────────────────

export async function assignLead(leadId: number | string, ownerId: number): Promise<Lead> {
  const res = await apiClient.put<Lead>(`/sales/leads/${leadId}/assign`, { ownerId });
  return res.data;
}

// ── Follow-ups ──────────────────────────────────────────────────────────────

export async function fetchMyFollowUps(): Promise<MyFollowUps> {
  const res = await apiClient.get<MyFollowUps>('/sales/follow-ups/my');
  return res.data;
}

export async function completeFollowUp(id: number): Promise<FollowUp> {
  const res = await apiClient.put<FollowUp>(`/sales/follow-ups/${id}/complete`, {});
  return res.data;
}

export async function createManualFollowUp(
  leadId: number | string,
  payload: { title: string; dueDate: string; notes?: string }
): Promise<FollowUp> {
  const res = await apiClient.post<FollowUp>(`/sales/leads/${leadId}/follow-ups`, payload);
  return res.data;
}

// ── Analytics ───────────────────────────────────────────────────────────────

export async function fetchLeadOverviewAnalytics(): Promise<LeadOverviewAnalytics> {
  const res = await apiClient.get<LeadOverviewAnalytics>('/sales/leads/analytics/overview');
  return res.data;
}
