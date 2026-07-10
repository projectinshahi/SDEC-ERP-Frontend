/**
 * Frontend types for the Attendance Analytics APIs (Phase 1). Mirror the backend
 * DTOs in attendanceAnalytics.service.ts. Purely status/calendar based — no
 * punch/work-hours metrics (manual attendance).
 */

export interface AnalyticsRange {
  from: string;
  to: string;
  days: number;
}

export interface AnalyticsSummary {
  totalEmployees: number;
  present: number;
  late: number;
  halfDay: number;
  fullDayLeave: number;
  absent: number;
  workingDays: number;
  approvedLeaveDays: number;
  attendancePct: number;
  range: AnalyticsRange;
}

export interface StatusDistributionSegment {
  status: string;
  label: string;
  count: number;
  pct: number;
}
export interface StatusDistribution {
  total: number;
  segments: StatusDistributionSegment[];
  range: AnalyticsRange;
}

export interface AttendanceTrendPoint {
  bucket: string;
  label: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  attendancePct: number;
}
export interface DayOfWeekPoint {
  dow: number;
  day: string;
  present: number;
  absent: number;
  late: number;
  attendancePct: number;
}
export interface AttendanceTrend {
  granularity: 'day' | 'week' | 'month';
  points: AttendanceTrendPoint[];
  dayOfWeek: DayOfWeekPoint[];
  comparison?: {
    range: AnalyticsRange;
    points: AttendanceTrendPoint[];
    attendancePct: number;
    deltaPct: number;
  };
  range: AnalyticsRange;
}

export interface DepartmentRanking {
  rank: number;
  department: string;
  headcount: number;
  present: number;
  absent: number;
  late: number;
  leaveDays: number;
  workingDays: number;
  attendancePct: number;
  absenteeismPct: number;
  punctualityPct: number;
  lopDays: number;
  payableDays: number;
  deltaPct?: number;
}
export interface DepartmentRankingResponse {
  departments: DepartmentRanking[];
  companyAvgAttendancePct: number;
  range: AnalyticsRange;
  comparisonRange?: AnalyticsRange;
}

export interface PaginationResponse {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface EmployeeReportRow {
  employeeId: number;
  name: string;
  employeeCode: string;
  department: string;
  designation: string;
  workingDays: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  fullDayLeave: number;
  attendancePct: number;
  absenteeismPct: number;
  punctualityPct: number;
  lopDays: number;
  payableDays: number;
  totalLateCount: number;
  perfectAttendance: boolean;
  atRisk: boolean;
}
export interface EmployeeReportTotals {
  employees: number;
  workingDays: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  fullDayLeave: number;
  attendancePct: number;
  absenteeismPct: number;
  punctualityPct: number;
  lopDays: number;
  payableDays: number;
  totalLateCount: number;
}
export interface EmployeeReportResponse {
  rows: EmployeeReportRow[];
  pagination: PaginationResponse;
  totals: EmployeeReportTotals;
  threshold: number;
  range: AnalyticsRange;
}

// ── Employee drill-down (M3.3) ───────────────────────────────────────────────

/** Full computed metric set for a single employee (mirrors AttendanceMetrics). */
export interface AttendanceMetrics {
  present: number;
  late: number;
  halfDay: number;
  fullDayLeave: number;
  absent: number;
  workingDays: number;
  approvedLeaveDays: number;
  attendancePct: number;
  absenteeismPct: number;
  punctualityPct: number;
  lopDays: number;
  payableDays: number;
}

export interface EmployeeProfile {
  employeeId: number;
  name: string;
  employeeCode: string;
  department: string;
  designation: string;
  joinDate: string | null;
  phone: string | null;
  employmentStatus: string;
}

export interface EmployeeCalendarDay {
  date: string; // YYYY-MM-DD
  dow: number; // 0=Sun … 6=Sat
  inRange: boolean;
  working: boolean;
  isFuture: boolean;
  status: string | null;
  leaveType: string | null;
}
export interface EmployeeCalendarMonth {
  month: string; // YYYY-MM
  label: string; // e.g. "July 2026"
  days: EmployeeCalendarDay[];
}

export interface EmployeeTimelineEntry {
  date: string;
  status: string;
  leaveType: string | null;
  notes: string | null;
}

export interface EmployeeLeaveBreakdownItem {
  leaveType: string;
  requests: number;
  days: number;
  approved: number;
  pending: number;
  rejected: number;
}
export interface EmployeeLeaveBreakdown {
  items: EmployeeLeaveBreakdownItem[];
  totalRequests: number;
  totalDays: number;
}

export type InsightType = 'positive' | 'warning' | 'critical' | 'info';
export interface EmployeeInsight {
  type: InsightType;
  code: string;
  title: string;
  detail: string;
}

export interface EmployeeDetailResponse {
  profile: EmployeeProfile;
  metrics: AttendanceMetrics;
  calendar: EmployeeCalendarMonth[];
  timeline: EmployeeTimelineEntry[];
  leaveBreakdown: EmployeeLeaveBreakdown;
  insights: EmployeeInsight[];
  today: string;
  range: AnalyticsRange;
}
