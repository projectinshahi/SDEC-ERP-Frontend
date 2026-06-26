/** Premium Sales Command Center + Manager Workspace types. */

export interface SalesInsight {
  type: string;
  severity: 'info' | 'warning' | 'success' | 'danger';
  message: string;
}

export interface SalesDashboard {
  leads: {
    total: number;
    new: number;
    qualified: number;
    converted: number;
    disqualified: number;
    growthPct: number;
  };
  deals: {
    open: number;
    won: number;
    lost: number;
    total: number;
  };
  revenue: {
    pipelineValue: number;
    forecast: number;
    wonValue: number;
    growthPct: number;
  };
  conversion: {
    rate: number;
    growthPct: number;
  };
  followUp: {
    completionRate: number;
    dueToday: number;
  };
  funnel: { label: string; count: number }[];
  insights: SalesInsight[];
}

export interface TeamMember {
  ownerId: number;
  name: string;
  role: string;
  leadsAssigned: number;
  conversions: number;
  conversionRate: number;
  meetingsCompleted: number;
  revenueGenerated: number;
}

export interface ManagerWorkspace {
  team: TeamMember[];
  leaderboard: {
    topRevenue: TeamMember[];
    topConversion: TeamMember[];
  };
}

// ── Live Team Performance (aggregated per team from members' live data) ──────

export interface TeamPerformance {
  teamId: number;
  teamName: string;
  teamLead: string | null;
  totalMembers: number;
  activeMembers: number;
  totalLeads: number;
  convertedLeads: number;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  totalDealValue: number;
  totalRevenue: number;
  totalFollowups: number;
  completedFollowups: number;
  pendingFollowups: number;
  overdueFollowups: number;
  conversionRate: number; // %
  performanceScore: number; // 0–100
}

export interface TeamMemberMetrics {
  userId: number;
  name: string;
  role: string;
  totalLeads: number;
  convertedLeads: number;
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  totalDealValue: number;
  totalRevenue: number;
  totalFollowups: number;
  completedFollowups: number;
  pendingFollowups: number;
  overdueFollowups: number;
  conversionRate: number;
  performanceScore: number;
}

export interface TeamRecentActivity {
  id: number;
  type: string;
  description: string;
  created_at: string;
  actor?: { id: number; name: string } | null;
}

export interface TeamPerformanceDetail {
  team: import('@/lib/types/salesExecution').SalesTeam;
  metrics: TeamPerformance;
  perMember: TeamMemberMetrics[];
  recentActivity: TeamRecentActivity[];
}
