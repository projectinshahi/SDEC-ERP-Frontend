import { apiClient } from './api-client';

/**
 * Master Dashboard — per-module organization-wide API.
 *
 * These power the standalone SuperAdmin modules (`/master-dashboard/{projects,
 * tickets,sales,meetings,settings,business-hub}`). Every figure is
 * organization-wide and live (see masterDashboardModules.controller on the
 * backend). The shapes below mirror that controller's responses exactly.
 *
 * Shared activity / distribution shapes live in `masterDashboard.ts`.
 */

export interface DistributionPoint {
  label: string;
  value: number;
}

export interface ModuleActivity {
  id: number;
  actor: string;
  type: string;
  description: string;
  created_at: string;
  project?: string | null;
}

export interface OwnerRef {
  id: number;
  name: string;
}

/* ──────────────────────────── Projects ─────────────────────────────────── */

export interface MasterProject {
  id: string;
  name: string;
  status: string;
  isArchived: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  owner: OwnerRef | null;
  memberCount: number;
  /** First few member names (for the avatar stack); `users` has no photo field. */
  members: string[];
  /** No column on `projects` yet — null today, renders an honest placeholder. */
  client: string | null;
  category: string | null;
  blockerCount: number;
  openBlockerCount: number;
  totalPoints: number;
  completedPoints: number;
  remainingPoints: number;
  progress: number;
  overdue: boolean;
}

export interface MasterProjectsData {
  stats: {
    total: number;
    active: number;
    onTrack: number;
    atRisk: number;
    delayed: number;
    onHold: number;
    planning: number;
    completed: number;
    archived: number;
    cancelled: number;
  };
  charts: {
    statusDistribution: DistributionPoint[];
    pmWorkload: DistributionPoint[];
  };
  projects: MasterProject[];
  /** Max rows the backend returns in `projects` (the detail list is bounded). */
  listLimit: number;
  activities: ModuleActivity[];
}

export const fetchMasterProjects = async (): Promise<MasterProjectsData> => {
  const res = await apiClient.get<{ success: boolean; data: MasterProjectsData }>(
    '/master-dashboard/projects',
  );
  return res.data.data;
};

/* ──────────────────────────── Tickets ──────────────────────────────────── */

export interface MasterTicket {
  id: number;
  title: string;
  status: string;
  severity: string;
  escalationLevel: string;
  category: string;
  createdAt: string | null;
  updatedAt: string | null;
  project: { id: string; name: string } | null;
  assignee: OwnerRef | null;
  reporter: OwnerRef | null;
  ageDays: number;
}

export interface ResolutionTrendPoint {
  label: string;
  date: string;
  opened: number;
  resolved: number;
  escalated: number;
}

export interface WeeklySlaPoint {
  label: string;
  resolved: number;
  withinSla: number;
  compliancePct: number;
}

export interface AgentPerformance {
  id: number;
  name: string;
  assigned: number;
  resolved: number;
  escalated: number;
  avgResolutionHours: number | null;
  resolutionRate: number;
  csat: number | null;
}

export interface MasterTicketsData {
  stats: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    pendingReply: number;
    critical: number;
    escalated: number;
    newToday: number;
    resolvedToday: number;
  };
  indicators: {
    openNetToday: number;
    criticalPctOfActive: number;
    escalatedPctOfActive: number;
    pendingPctOfActive: number;
    createdToday: number;
    createdYesterday: number;
    resolvedToday: number;
    resolvedYesterday: number;
    createdThisWeek: number;
    createdLastWeek: number;
    resolvedThisWeek: number;
    resolvedLastWeek: number;
    createdTodayVsYesterdayPct: number;
    resolvedTodayVsYesterdayPct: number;
    createdWeekVsLastPct: number;
    resolvedWeekVsLastPct: number;
    avgResolutionHours: number | null;
    avgResponseHours: number | null;
  };
  charts: {
    statusDistribution: DistributionPoint[];
    priorityDistribution: DistributionPoint[];
    categoryDistribution: DistributionPoint[];
    resolutionTrend: ResolutionTrendPoint[];
    weeklySla: WeeklySlaPoint[];
  };
  agents: AgentPerformance[];
  workload: DistributionPoint[];
  topReporters: DistributionPoint[];
  tickets: MasterTicket[];
  activities: ModuleActivity[];
  slaHours: number;
}

export const fetchMasterTickets = async (): Promise<MasterTicketsData> => {
  const res = await apiClient.get<{ success: boolean; data: MasterTicketsData }>(
    '/master-dashboard/tickets',
  );
  return res.data.data;
};

/* ──────────────────────────── Ticket detail ────────────────────────────── */

export interface TicketComment {
  id: number;
  author: string;
  authorEmail: string | null;
  message: string;
  created_at: string;
}

export interface TicketAttachment {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  description: string | null;
  uploadedBy: string;
  uploadedAt: string;
}

export interface MasterTicketDetailData {
  ticket: {
    id: number;
    title: string;
    description: string | null;
    status: string;
    severity: string;
    escalationLevel: string;
    tags: string[];
    notes: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    resolvedAt: string | null;
    ageDays: number;
    resolutionHours: number | null;
    project: { id: string; name: string } | null;
    reporter: (OwnerRef & { email: string | null }) | null;
    assignee: (OwnerRef & { email: string | null }) | null;
    resolvedBy: (OwnerRef & { email: string | null }) | null;
  };
  comments: TicketComment[];
  attachments: TicketAttachment[];
  activity: ModuleActivity[];
}

export const fetchMasterTicketDetail = async (id: number | string): Promise<MasterTicketDetailData> => {
  const res = await apiClient.get<{ success: boolean; data: MasterTicketDetailData }>(
    `/master-dashboard/tickets/${id}`,
  );
  return res.data.data;
};

/* ──────────────────────────── Sales ────────────────────────────────────── */

export interface DealStagePoint extends DistributionPoint {
  amount: number;
}

export interface RevenueTrendPoint {
  label: string;
  revenue: number;
}

export interface MasterTopDeal {
  id: number;
  title: string;
  amount: number;
  stage: string;
  status: string;
  probability: number;
  owner: OwnerRef | null;
}

export interface MasterSalesData {
  stats: {
    totalLeads: number;
    newLeads: number;
    convertedLeads: number;
    conversionRate: number;
    totalOpportunities: number;
    totalDeals: number;
    openDeals: number;
    wonDeals: number;
    lostDeals: number;
    revenue: number;
    pipelineValue: number;
    forecast: number;
    avgDealSize: number;
  };
  charts: {
    dealStage: DealStagePoint[];
    leadSource: DistributionPoint[];
    leadStage: DistributionPoint[];
    dealStatus: DistributionPoint[];
    revenueTrend: RevenueTrendPoint[];
  };
  topDeals: MasterTopDeal[];
  activities: ModuleActivity[];
}

export const fetchMasterSales = async (): Promise<MasterSalesData> => {
  const res = await apiClient.get<{ success: boolean; data: MasterSalesData }>(
    '/master-dashboard/sales',
  );
  return res.data.data;
};

/* ──────────────────────────── Meetings ─────────────────────────────────── */

export interface MasterMeeting {
  id: number;
  title: string;
  meetingType: string;
  status: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  meetingLink: string | null;
  project: { id: string; name: string } | null;
  organizer: OwnerRef | null;
}

export interface MasterMeetingsData {
  stats: {
    total: number;
    upcoming: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    ongoing: number;
  };
  charts: {
    statusDistribution: DistributionPoint[];
    typeDistribution: DistributionPoint[];
    trend: DistributionPoint[];
  };
  upcoming: MasterMeeting[];
  activities: ModuleActivity[];
}

export const fetchMasterMeetings = async (): Promise<MasterMeetingsData> => {
  const res = await apiClient.get<{ success: boolean; data: MasterMeetingsData }>(
    '/master-dashboard/meetings',
  );
  return res.data.data;
};

/* ──────────────────────────── Audit / Settings ─────────────────────────── */

export interface AuditActivity {
  id: number;
  actor: string;
  actorEmail: string | null;
  target: string | null;
  project: string | null;
  type: string;
  description: string;
  created_at: string;
}

export interface MasterAuditData {
  stats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalRoles: number;
    totalProjects: number;
  };
  activities: AuditActivity[];
}

export const fetchMasterAudit = async (): Promise<MasterAuditData> => {
  const res = await apiClient.get<{ success: boolean; data: MasterAuditData }>(
    '/master-dashboard/audit',
  );
  return res.data.data;
};
