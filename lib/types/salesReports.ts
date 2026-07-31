/**
 * Sales Reporting & Analytics — shared types. Mirror the backend reporting
 * endpoints (analytics.service / salesReports.controller).
 */

// ── SE-034 Pipeline Summary ──────────────────────────────────────────────────
export interface PipelineStageRow {
  stage: string;
  orderIndex: number;
  count: number;
  value: number;
  weightedForecast: number;
}
export interface PipelineOwnerRow {
  ownerId: number;
  name: string;
  openCount: number;
  pipelineValue: number;
  forecast: number;
  wonValue: number;
}
// BDE-wise LEAD pipeline + per-lead checklist progress (Pipeline Report section).
export interface BdePipelineLead {
  leadId: number;
  title: string;
  company: string;
  stage: string;
  checklistDone: number;
  checklistTotal: number;
}
export interface BdeKpis {
  newLeadsYesterday: number;
  nql: number; mql: number; sql: number; pql: number; sal: number; won: number; hold: number; lost: number;
  meaningfulConversationsYesterday: number;
  discoveryMeetingsYesterday: number;
  proposalsSentYesterday: number;
  proposalValueYesterday: number;
  negotiationsActiveYesterday: number;
  wonRevenueYesterday: number;
  nextDayMeetingsToday: number;
}
export interface BdePipelineOwner {
  ownerId: number;
  name: string;
  totalLeads: number;
  byStage: { stage: string; count: number }[];
  leads: BdePipelineLead[];
  /** Daily performance KPIs (absent on older payloads). */
  kpis?: BdeKpis;
}
export interface PipelineSummary {
  totals: { total: number; open: number; won: number; lost: number };
  revenue: { pipelineValue: number; forecastRevenue: number; wonValue: number; lostValue: number; avgDealValue: number };
  byStage: PipelineStageRow[];
  byOwner: PipelineOwnerRow[];
  /** Additive BDE-wise lead pipeline section; may be absent on older payloads. */
  bdePipeline?: BdePipelineOwner[];
}

// ── SE-035 Win Rate ──────────────────────────────────────────────────────────
export interface WinRateOwnerRow { ownerId: number; name: string; won: number; lost: number; winRate: number | null }
export interface WinRateTeamRow { teamId: number; name: string; won: number; lost: number; winRate: number | null }
export interface WinRateProductRow { product: string; won: number; lost: number; winRate: number | null }
export interface WinRateReport {
  overall: { won: number; lost: number; winRate: number | null };
  byOwner: WinRateOwnerRow[];
  byTeam: WinRateTeamRow[];
  byProduct: WinRateProductRow[];
  approximateProduct: boolean;
}

// ── SE-036 Lost Deal Analysis ────────────────────────────────────────────────
export interface LabeledCount { label: string; count: number; value?: number; pct?: number }
export interface LostTrendPoint { period: string; count: number; value: number }
export interface LostDealAnalysis {
  total: number;
  totalValue: number;
  byLossReason: LabeledCount[];
  byCompetitor: LabeledCount[];
  byStage: LabeledCount[];
  byDisqualifyReason: LabeledCount[];
  trend: LostTrendPoint[];
  insights: string[];
  approximateCompetitor: boolean;
}

// ── SE-033 Lead Source ───────────────────────────────────────────────────────
export interface LeadSourceRow { source: string; total: number; qualified: number; converted: number; conversionRate: number }
export interface LeadSourceReport {
  totalLeads: number;
  totalConverted: number;
  overallConversionRate: number;
  sources: LeadSourceRow[];
}

// ── SE-044.2 Team Target R/Y/G ───────────────────────────────────────────────
export type TargetBand = 'green' | 'yellow' | 'red' | 'neutral';
export interface TeamTargetRow {
  teamId: number;
  name: string;
  manager: string | null;
  memberCount: number;
  target: number;
  achieved: number;
  remaining: number;
  achievementPct: number;
  status: TargetBand;
}
export interface BdeTargetRow {
  ownerId: number;
  name: string;
  target: number;
  achieved: number;
  remaining: number;
  achievementPct: number;
  status: TargetBand;
}
export interface TeamTargetDashboard {
  period: string;
  bands: { green: string; yellow: string; red: string; neutral: string };
  teams: TeamTargetRow[];
  bdes: BdeTargetRow[];
  rankings: { topTeams: TeamTargetRow[]; bottomTeams: TeamTargetRow[] };
}

// ── SE-037.1 Revenue Forecast vs Actual ──────────────────────────────────────
export interface ForecastActualRow {
  ownerId: number;
  name: string;
  forecast: number;
  actual: number;
  variance: number;
  achievementPct: number;
}
export interface ForecastVsActual {
  forecast: number;
  actual: number;
  variance: number;
  achievementPct: number;
  byOwner: ForecastActualRow[];
}

// ── SE-038.1 Activity Report ─────────────────────────────────────────────────
export interface ActivityOwnerRow {
  ownerId: number;
  name: string;
  calls: number;
  meetings: number;
  emails: number;
  followUps: number;
  tasks: number;
  total: number;
}
export interface ActivityReport {
  range: { start: string; end: string; days: number } | null;
  totals: { calls: number; meetings: number; emails: number; followUps: number; tasks: number; totalActivities: number };
  rates: { activitiesPerDay: number; callsPerDay: number; meetingsPerWeek: number; followUpsCompleted: number };
  byOwner: ActivityOwnerRow[];
}

// ── Executive Analytics ──────────────────────────────────────────────────────
export interface ExecRankBde { ownerId: number; name: string; revenue: number; wonCount: number }
export interface ExecutiveAnalytics {
  period: string;
  revenue: { wonThisPeriod: number; pipelineValue: number; forecast: number };
  forecasting: { month: number; quarter: number; year: number };
  forecastVsActual: { forecast: number; actual: number; variance: number; achievementPct: number };
  rates: { winRate: number | null; conversionRate: number; dealConversionRate: number; projectConversionRate: number };
  rankings: { topBdes: ExecRankBde[]; topSources: LeadSourceRow[] };
}

// ── SE-052.1 Linked project (on a deal) ──────────────────────────────────────
export interface LinkedProject {
  id: string;
  name: string;
  status: string;
}

// ── SE-030 Daily Report ──────────────────────────────────────────────────────
export type DailyReportState = 'generated' | 'pending' | 'failed';
export interface DailyMetrics {
  calls: number;
  meetings: number;
  leadsCreated: number;
  leadsContacted: number;
  followUpsCompleted: number;
  dealsCreated: number;
  dealsWon: number;
  dealsLost: number;
  revenueWon: number;
}
export interface DailyReportRow extends DailyMetrics {
  ownerId: number;
  name: string;
  email: string | null;
  reportDate: string;
  state: DailyReportState;
}
export interface DailyReportResponse {
  date: string;
  isLive: boolean;
  rows: DailyReportRow[];
  totals: DailyMetrics;
}

// ── SE-030.2 Report Scheduler ────────────────────────────────────────────────
export type ReportFrequency = 'daily' | 'weekly' | 'monthly';
export interface ReportSchedule {
  id: number;
  name: string;
  reportType: string;
  frequency: ReportFrequency;
  recipients: number[];
  active: boolean;
  lastRunAt?: string | null;
  lastStatus?: DailyReportState | null;
  nextRunAt?: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
}
export interface CreateReportSchedulePayload {
  name: string;
  reportType?: string;
  frequency: ReportFrequency;
  recipients?: number[];
  executionTime?: string; // HH:MM
  active?: boolean;
}

export type ReportExportType =
  | 'pipeline' | 'win-rate' | 'lost-deals' | 'lead-source' | 'team-target' | 'executive' | 'activity' | 'revenue' | 'forecast';
export type ReportExportFormat = 'xlsx' | 'csv';
