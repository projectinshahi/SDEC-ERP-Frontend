import { apiClient } from './api-client';

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface HRDashboardKPIs {
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  lateToday: number;
  newJoiners: number;
  openPositions: number;
  pendingInterviews: number;
  payrollPending: number;
  payrollPaid: number;
  payrollPendingAmount: number;
  payrollMonthTotal: number;
  payrollMonthCount: number;
  currentMonth: string;
}

export interface AttendanceSummaryItem {
  name: string;
  value: number;
}

export interface HRDashboardData {
  kpis: HRDashboardKPIs;
  attendanceSummary: AttendanceSummaryItem[];
}

export interface PerformanceStats {
  active: number;
  self_pending: number;
  manager_pending: number;
  completed: number;
}

export interface RecruitmentStats {
  Applied: number;
  Screening: number;
  Interview: number;
  Offer: number;
  Hired: number;
  Rejected: number;
}

export interface ActivityFeedItem {
  id: string;
  type: 'hire' | 'document' | 'payroll' | 'performance' | 'general';
  actor: string;
  action: string;
  timestamp: string;
}

export interface DashboardAlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  desc: string;
  count: number;
  href?: string;
}

/* ── Empty fallbacks ────────────────────────────────────────────────────── */

const EMPTY_KPIS: HRDashboardKPIs = {
  totalEmployees: 0,
  presentToday: 0,
  onLeave: 0,
  lateToday: 0,
  newJoiners: 0,
  openPositions: 0,
  pendingInterviews: 0,
  payrollPending: 0,
  payrollPaid: 0,
  payrollPendingAmount: 0,
  payrollMonthTotal: 0,
  payrollMonthCount: 0,
  currentMonth: '',
};

/* ── API helpers ────────────────────────────────────────────────────────── */

/**
 * Fetch main HR dashboard KPIs and attendance summary.
 * GET /hr/dashboard/stats
 */
export async function fetchHRDashboardStats(): Promise<HRDashboardData> {
  const res = await apiClient.get<{ success: boolean; data: HRDashboardData }>(
    '/hr/dashboard/stats'
  );
  return res.data?.data ?? { kpis: EMPTY_KPIS, attendanceSummary: [] };
}

/**
 * Fetch latest 20 HR events from across all key tables.
 * GET /hr/dashboard/activity
 */
export async function fetchHRActivityFeed(): Promise<ActivityFeedItem[]> {
  const res = await apiClient.get<{ success: boolean; data: ActivityFeedItem[] }>(
    '/hr/dashboard/activity'
  );
  return res.data?.data ?? [];
}

/**
 * Fetch computed HR alerts from backend stats.
 * GET /hr/dashboard/alerts
 */
export async function fetchHRAlerts(): Promise<DashboardAlertItem[]> {
  const res = await apiClient.get<{ success: boolean; data: DashboardAlertItem[] }>(
    '/hr/dashboard/alerts'
  );
  return res.data?.data ?? [];
}

/**
 * Fetch performance module stats (appraisal counts).
 * GET /hr/performance/stats
 */
export async function fetchPerformanceStats(): Promise<PerformanceStats> {
  const res = await apiClient.get<{ success: boolean; data: PerformanceStats }>(
    '/hr/performance/stats'
  );
  return res.data?.data ?? { active: 0, self_pending: 0, manager_pending: 0, completed: 0 };
}

/**
 * Fetch recruitment pipeline stats (candidate counts by stage).
 * GET /hr/recruitment/stats
 */
export async function fetchRecruitmentStats(): Promise<RecruitmentStats> {
  const res = await apiClient.get<{ success: boolean; data: RecruitmentStats }>(
    '/hr/recruitment/stats'
  );
  return res.data?.data ?? { Applied: 0, Screening: 0, Interview: 0, Offer: 0, Hired: 0, Rejected: 0 };
}
