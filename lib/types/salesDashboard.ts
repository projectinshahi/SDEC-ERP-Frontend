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
