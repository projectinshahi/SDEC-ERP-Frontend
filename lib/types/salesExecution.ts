/**
 * Sales Execution Layer — shared domain types.
 *
 * Mirrors the backend payloads for saved views, advanced pipeline filtering,
 * stalled deals, sales tasks, document approvals and the BDE dashboard.
 */

export interface UserLite {
  id: number;
  name: string;
  email?: string;
}

export interface EntityLite {
  id: number;
  title: string;
}

// ── SE-020.1 Saved Views ─────────────────────────────────────────────────────

export type SavedViewScope = 'personal' | 'team' | 'global';
export type SavedViewEntity = 'deal' | 'lead' | 'report';

export interface PipelineFilters {
  valueMin?: number | string;
  valueMax?: number | string;
  stage?: string; // single or comma-separated
  ownerId?: number | string;
  closeMonth?: string; // YYYY-MM
  probabilityMin?: number | string;
  probabilityMax?: number | string;
  source?: string;
  company?: string;
  status?: '' | 'open' | 'won' | 'lost' | 'stalled' | 'at_risk' | 'healthy' | string;
  search?: string;
}

export interface SavedView {
  id: number;
  name: string;
  entity: SavedViewEntity;
  scope: SavedViewScope;
  filters: PipelineFilters;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
  owner?: UserLite | null;
}

// ── SE-021 Stalled Deals + Pipeline ──────────────────────────────────────────

export type StalledLevel = 'healthy' | 'at_risk' | 'stalled';

export interface StalledStatus {
  level: StalledLevel;
  daysInStage: number;
  thresholdDays: number;
  since: string;
}

export interface PipelineDeal {
  id: number;
  title: string;
  amount: number;
  currency: string;
  status: string;
  stage: string;
  probability: number;
  expectedCloseDate?: string | null;
  source?: string | null;
  ownerId: number;
  leadId?: number | null;
  orderIndex: number;
  updatedAt: string;
  createdAt: string;
  customer?: { id: number; name: string; company?: string | null } | null;
  owner?: UserLite | null;
  lead?: EntityLite | null;
  weightedRevenue: number;
  stalledStatus: StalledStatus;
}

export interface PipelineResponse {
  deals: PipelineDeal[];
  summary: {
    count: number;
    totalValue: number;
    weightedForecast: number;
    stalled: number;
    atRisk: number;
  };
}

export interface DealStageConfig {
  id: number;
  name: string;
  orderIndex: number;
  isDefault: boolean;
  stalledThresholdDays: number;
}

// ── SE-023 / SE-024 Sales Tasks ──────────────────────────────────────────────

export type SalesTaskType = 'call' | 'meeting' | 'email' | 'follow_up' | 'proposal_review';
export type SalesTaskStatus = 'open' | 'in_progress' | 'completed';
export type SalesTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// SE-026.1 — completion outcomes.
export type SalesTaskOutcome =
  | 'call_completed' | 'client_interested' | 'follow_up_required' | 'meeting_scheduled'
  | 'proposal_sent' | 'not_reachable' | 'lost_opportunity' | 'other';

export const OUTCOME_LABELS: Record<SalesTaskOutcome, string> = {
  call_completed: 'Call Completed', client_interested: 'Client Interested',
  follow_up_required: 'Follow-up Required', meeting_scheduled: 'Meeting Scheduled',
  proposal_sent: 'Proposal Sent', not_reachable: 'Not Reachable',
  lost_opportunity: 'Lost Opportunity', other: 'Other',
};

export interface SalesTask {
  id: number;
  title: string;
  type: SalesTaskType;
  status: SalesTaskStatus;
  priority: SalesTaskPriority;
  dueDate?: string | null;
  notes?: string | null;
  blocked: boolean;
  blockerReason?: string | null;
  completedAt?: string | null;
  outcome?: SalesTaskOutcome | null;
  completionNotes?: string | null;
  recurrenceRuleId?: number | null;
  leadId?: number | null;
  dealId?: number | null;
  assigneeId: number;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  assignee?: UserLite | null;
  createdBy?: UserLite | null;
  lead?: EntityLite | null;
  deal?: EntityLite | null;
}

export interface CreateSalesTaskPayload {
  title: string;
  type?: SalesTaskType;
  priority?: SalesTaskPriority;
  dueDate?: string | null;
  notes?: string | null;
  assigneeId?: number;
  leadId?: number;
  dealId?: number;
}

export interface UpdateSalesTaskPayload {
  title?: string;
  type?: SalesTaskType;
  priority?: SalesTaskPriority;
  status?: SalesTaskStatus;
  dueDate?: string | null;
  notes?: string | null;
  assigneeId?: number;
  outcome?: SalesTaskOutcome;
  completionNotes?: string | null;
}

export interface SalesTaskFilters {
  dealId?: number;
  leadId?: number;
  assigneeId?: number;
  status?: SalesTaskStatus;
  type?: SalesTaskType;
  blocked?: boolean;
  scope?: 'mine' | 'all';
  due?: 'today' | 'overdue' | 'upcoming';
}

// ── SE-022 Document Approvals ────────────────────────────────────────────────

export type DocType = 'BRD' | 'Proposal' | 'Quotation' | 'Scope' | 'Agreement' | 'Other';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'rework';
export type ApprovalDecision = 'approve' | 'reject' | 'rework';

export interface ApprovalHistoryEntry {
  id: number;
  approvalId: number;
  action: string;
  actorId: number;
  comments?: string | null;
  createdAt: string;
  actor?: UserLite | null;
}

export interface DocumentApproval {
  id: number;
  docType: DocType;
  title: string;
  version: string;
  changeNotes: string;
  comments?: string | null;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  status: ApprovalStatus;
  managerComments?: string | null;
  decisionAt?: string | null;
  sentToClient: boolean;
  sentAt?: string | null;
  leadId?: number | null;
  dealId?: number | null;
  submittedById: number;
  reviewedById?: number | null;
  createdAt: string;
  updatedAt: string;
  submittedBy?: UserLite | null;
  reviewedBy?: UserLite | null;
  lead?: EntityLite | null;
  deal?: EntityLite | null;
  history?: ApprovalHistoryEntry[];
}

export interface ApprovalFilters {
  dealId?: number;
  leadId?: number;
  status?: ApprovalStatus;
  scope?: 'mine' | 'queue';
}

// ── SE-025.1 BDE Dashboard ───────────────────────────────────────────────────

export interface SmartAlert {
  type: string;
  severity: 'info' | 'warning' | 'danger';
  message: string;
  count: number;
}

// SE-040 — target metric + period granularity.
export type TargetType = 'revenue' | 'deal_count' | 'calls' | 'meetings' | 'conversions';
export type PeriodType = 'monthly' | 'quarterly' | 'yearly';

export const TARGET_TYPE_LABELS: Record<TargetType, string> = {
  revenue: 'Revenue', deal_count: 'Deal Count', calls: 'Calls', meetings: 'Meetings', conversions: 'Conversions',
};

export interface TargetProgress {
  period: string;
  type?: TargetType;
  hasTarget?: boolean;
  target: number;
  achievement: number;
  remaining: number;
  achievementPct: number;
  reached?: boolean;
  incentiveEarned?: number;
}

export interface BdeDashboard {
  ownerId: number;
  tasks: {
    dueToday: SalesTask[];
    overdue: SalesTask[];
    upcoming: SalesTask[];
    blocked: SalesTask[];
    counts: { dueToday: number; overdue: number; upcoming: number; blocked: number };
  };
  followUps: { scheduled: number; missed: number; completed: number; dueToday: number };
  leads: { assigned: number; new: number; qualified: number; converted: number };
  deals: { active: number; stalled: number; won: number; lost: number };
  target: TargetProgress;
  productivity: {
    callsCompleted: number;
    meetingsCompleted: number;
    followUpsCompleted: number;
    conversionRate: number;
  };
  smartAlerts: SmartAlert[];
}

export interface SalesTarget {
  id?: number;
  ownerId: number;
  type?: TargetType;
  periodType?: PeriodType;
  period: string;
  targetAmount: number;
}

// ── SE-027 Recurring Tasks ───────────────────────────────────────────────────

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export interface RecurrenceRule {
  id: number;
  title: string;
  type: SalesTaskType;
  priority: SalesTaskPriority;
  notes?: string | null;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  endDate?: string | null;
  active: boolean;
  assigneeId: number;
  leadId?: number | null;
  dealId?: number | null;
  lastGeneratedAt?: string | null;
  nextRunAt?: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  assignee?: UserLite | null;
  lead?: EntityLite | null;
  deal?: EntityLite | null;
}

export interface CreateRecurrenceRulePayload {
  title: string;
  type?: SalesTaskType;
  priority?: SalesTaskPriority;
  notes?: string | null;
  frequency: RecurrenceFrequency;
  interval?: number;
  startDate: string;
  endDate?: string | null;
  assigneeId?: number;
  leadId?: number;
  dealId?: number;
}

// ── SE-042 Incentives ────────────────────────────────────────────────────────

export interface IncentiveSlab {
  id: number;
  ownerId: number;
  minAchievementPct: number;
  maxAchievementPct?: number | null;
  incentivePct?: number | null;
  incentiveAmount?: number | null;
  active: boolean;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  owner?: UserLite | null;
}

export interface IncentiveSlabPayload {
  ownerId?: number;
  minAchievementPct: number;
  maxAchievementPct?: number | null;
  incentivePct?: number | null;
  incentiveAmount?: number | null;
}

// ── SE-043 Target History ────────────────────────────────────────────────────

export interface TargetHistoryEntry {
  id: number;
  period: string;
  periodType: PeriodType;
  type: TargetType;
  target: number;
  actual: number;
  achievementPct: number;
  incentiveEarned: number;
}

export interface TargetHistoryResponse {
  ownerId: number;
  history: TargetHistoryEntry[];
  note: string;
}

// ── SE-044 Teams ─────────────────────────────────────────────────────────────

export type TeamMemberRole = 'bde' | 'team_lead';

export interface SalesTeamMember {
  id: number;
  teamId: number;
  userId: number;
  role: TeamMemberRole;
  joinedAt: string;
  user?: { id: number; name: string; email?: string; role?: string | null } | null;
}

export interface SalesTeam {
  id: number;
  name: string;
  description?: string | null;
  managerId: number;
  archived: boolean;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  manager?: UserLite | null;
  members?: SalesTeamMember[];
}

// ── SE-028 Manager team task view ────────────────────────────────────────────

export interface TeamMemberTaskRow {
  userId: number;
  name: string;
  email?: string | null;
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  blocked: number;
  completionRate: number;
}

export interface TeamTasksResponse {
  kpis: { total: number; completed: number; pending: number; overdue: number; blocked: number; completionRate: number };
  members: TeamMemberTaskRow[];
  tasks: SalesTask[];
}

// ── Manager + Executive dashboards ───────────────────────────────────────────

export interface ManagerMemberRow {
  userId: number;
  name: string;
  email?: string | null;
  target: number;
  achieved: number;
  achievementPct: number;
  incentiveEarned: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  overdueTasks: number;
  wonDeals: number;
}

export interface ManagerDashboard {
  period: string;
  kpis: {
    memberCount: number;
    target: number;
    achieved: number;
    attainmentPct: number;
    totalTasks: number;
    completedTasks: number;
    taskCompletionRate: number;
    overdueTasks: number;
    incentiveRunRate: number;
  };
  members: ManagerMemberRow[];
  topPerformers: ManagerMemberRow[];
  bottomPerformers: ManagerMemberRow[];
}

export interface ExecutiveTeamRow {
  teamId: number;
  name: string;
  manager?: string | null;
  memberCount: number;
  target: number;
  achieved: number;
  attainmentPct: number;
}

export interface ExecutiveDashboard {
  period: string;
  revenue: { wonThisMonth: number; pipelineValue: number; forecast: number };
  target: { target: number; achieved: number; attainmentPct: number };
  teams: ExecutiveTeamRow[];
  topTeams: ExecutiveTeamRow[];
  bottomTeams: ExecutiveTeamRow[];
}
