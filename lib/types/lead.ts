/**
 * Lead Management domain types (frontend).
 */

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
}

export interface LeadActivityLog {
  id: number;
  type: string;
  description: string;
  created_at: string;
  actor?: { id: number; name: string } | null;
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
  status: string;
  stage: string;
  orderIndex: number;
  priority: string;
  score: number;
  tags?: string | null;
  disqualifyReason?: string | null;
  flaggedForReview: boolean;
  customerId?: number | null;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
  owner?: LeadOwner | null;
  customer?: LeadCustomer | null;
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
  status?: string;
  stage?: string;
  priority?: string;
  score?: number;
  tags?: string | null;
  ownerId?: number;
  // Contact fields persisted on the linked customer.
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  address?: string;
}
