import { apiClient } from './api-client';

/**
 * Master Dashboard (Founder / SuperAdmin executive overview) API.
 *
 * Every figure is organization-wide and live (see masterDashboard.controller on
 * the backend). The shapes below mirror that controller's response exactly.
 */

export interface MasterDashboardActivity {
  id: number;
  actor: string;
  type: string;
  description: string;
  created_at: string;
}

export interface MasterDashboardAlert {
  id: string;
  title: string;
  desc: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  time: string;
}

/** A single category in a distribution chart. */
export interface DistributionPoint {
  label: string;
  value: number;
}

export interface DealStagePoint extends DistributionPoint {
  amount: number;
}

export interface RevenueTrendPoint {
  label: string;
  revenue: number;
}

export interface MasterDashboardStats {
  projects: {
    total: number;
    active: number;
    completed: number;
    onHold: number;
    delayed: number;
    archived: number;
    onTrack: number;
    atRisk: number;
  };
  tickets: {
    total: number;
    open: number;
    critical: number;
    escalated: number;
    resolved: number;
  };
  bugs: {
    total: number;
    open: number;
    critical: number;
    resolved: number;
  };
  sales: {
    totalLeads: number;
    convertedLeads: number;
    conversionRate: number;
    totalOpportunities: number;
    totalDeals: number;
    wonDeals: number;
    openDeals: number;
    lostDeals: number;
    revenue: number;
    pipelineValue: number;
  };
  meetings: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
  };
  users: { total: number };
}

export interface MasterDashboardCharts {
  projectStatus: DistributionPoint[];
  ticketStatus: DistributionPoint[];
  ticketSeverity: DistributionPoint[];
  bugPriority: DistributionPoint[];
  dealStage: DealStagePoint[];
  leadSource: DistributionPoint[];
  meetingStatus: DistributionPoint[];
  revenueTrend: RevenueTrendPoint[];
}

export interface MasterDashboardAnalytics {
  stats: MasterDashboardStats;
  charts: MasterDashboardCharts;
  activities: MasterDashboardActivity[];
  alerts: MasterDashboardAlert[];
}

export const fetchMasterAnalytics = async (): Promise<MasterDashboardAnalytics> => {
  const response = await apiClient.get<{ success: boolean; data: MasterDashboardAnalytics }>(
    '/master-dashboard/analytics',
  );
  return response.data.data;
};
