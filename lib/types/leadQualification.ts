/**
 * Lead Qualification & Follow-up domain types (frontend).
 */

export interface ScoringCriterion {
  id: number;
  factor: string;
  label: string;
  weight: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type LeadRating = 'Hot' | 'Warm' | 'Cold' | 'Not Scored';

export interface ScoreBreakdownItem {
  factor: string;
  label: string;
  weight: number;
  subScore: number;
  contribution: number;
}

export interface ScoreBreakdown {
  leadId: number;
  score: number;
  rating: LeadRating;
  breakdown: ScoreBreakdownItem[];
}

export type InteractionType = 'Call' | 'Email' | 'Meeting';

export interface LeadInteraction {
  id: number;
  leadId: number;
  authorId: number;
  type: InteractionType;
  notes: string;
  interactionDate: string;
  createdAt: string;
  author?: { id: number; name: string; email?: string } | null;
}

export interface FollowUpLeadRef {
  id: number;
  title: string;
  customer?: { company?: string | null } | null;
}

export interface FollowUp {
  id: number;
  title: string;
  notes?: string | null;
  scheduledDate: string;
  status: string;
  type: string;
  reminderNotified: boolean;
  completedAt?: string | null;
  leadId?: number | null;
  ownerId: number;
  lead?: FollowUpLeadRef | null;
  owner?: { id: number; name: string } | null;
}

export interface MyFollowUps {
  counts: { overdue: number; today: number; upcoming: number; completed?: number };
  overdue: FollowUp[];
  today: FollowUp[];
  upcoming: FollowUp[];
  completed?: FollowUp[];
}

export interface LeadOverviewAnalytics {
  totalLeads: number;
  averageScore: number;
  conversionRate: number;
  wonLeads: number;
  followUp: {
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
  };
  interactions: {
    total: number;
    byType: { type: string; count: number }[];
  };
  leadsPerBde: {
    ownerId: number;
    name: string;
    leads: number;
    avgScore: number;
  }[];
  scoreDistribution: {
    rating: LeadRating;
    count: number;
  }[];
  /** Count of HOT leads — replaces the average-score headline. */
  hotLeads: number;
  /** Lead Temperature distribution (COLD / WARM / HOT). */
  temperatureDistribution: {
    temperature: string;
    count: number;
  }[];
}
