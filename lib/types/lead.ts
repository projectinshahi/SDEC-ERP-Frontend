/**
 * Lead Management domain types (frontend).
 */

import type { LeadTemperature } from '@/lib/data/leadTemperature';

export interface LeadOwner {
  id: number;
  name: string;
  email: string;
}

export interface LeadCustomer {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  industry?: string | null;
  website?: string | null;
  address?: string | null;
  designation?: string | null;
  whatsapp?: string | null;
  companyId?: number | null;
}

/** Structured payload on a `stage_changed` activity — the Stage Transition record. */
export interface StageTransitionMeta {
  fromStage?: string;
  toStage?: string;
  checklist?: string[];
  note?: string;
}

export interface LeadActivityLog {
  id: number;
  type: string;
  description: string;
  created_at: string;
  actor?: { id: number; name: string } | null;
  /** Type-specific structured data (e.g. StageTransitionMeta for `stage_changed`). */
  metadata?: StageTransitionMeta | null;
}

export interface LeadNote {
  id: number;
  leadId: number;
  authorId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author?: { id: number; name: string; email?: string } | null;
}

export interface Lead {
  id: number;
  title: string;
  description?: string | null;
  source: string;
  referralName?: string | null;
  leadValue?: number | null;
  status: string;
  stage: string;
  orderIndex: number;
  priority: string;
  /** Manual classification (COLD / WARM / HOT) — replaces the numeric score. */
  temperature: LeadTemperature;
  /** @deprecated numeric score is no longer shown in the Leads UI. */
  score?: number;
  tags?: string | null;
  disqualifyReason?: string | null;
  flaggedForReview: boolean;
  customerId?: number | null;
  /** Pipeline (Opportunity) → Company link (Phase 2). Optional. */
  companyId?: number | null;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
  owner?: LeadOwner | null;
  customer?: LeadCustomer | null;
  companyRef?: { id: number; name: string; industry?: string | null; website?: string | null; address?: string | null; gst?: string | null; notes?: string | null } | null;
}

export interface LeadDetail extends Lead {
  notes?: LeadNote[];
  activityLogs?: LeadActivityLog[];
}

export interface LeadStage {
  id: number;
  name: string;
  orderIndex: number;
  isDefault: boolean;
}

export interface AssignableUser {
  id: number;
  name: string;
  email: string;
  role?: string | null;
}

export interface StageDistribution {
  stage: string;
  orderIndex: number;
  count: number;
  percentage: number;
}

export interface StageAnalytics {
  totalLeads: number;
  stages: StageDistribution[];
}

/** Payload for editing a lead — all fields optional (partial update). */
export interface UpdateLeadPayload {
  title?: string;
  description?: string | null;
  source?: string;
  referralName?: string | null;
  status?: string;
  stage?: string;
  priority?: string;
  temperature?: LeadTemperature;
  tags?: string | null;
  ownerId?: number;
  leadValue?: number | string | null;
  /** Pipeline (Opportunity) → Company link (Phase 2). Optional. */
  companyId?: number | null;
  // Contact fields persisted on the linked customer.
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  address?: string;
  designation?: string;
  whatsapp?: string;
}
