/**
 * Sales Reporting & Analytics API. Wrappers over `/sales/reports/*`.
 */
import { apiClient } from './api-client';
import type {
  PipelineSummary,
  WinRateReport,
  LostDealAnalysis,
  LeadSourceReport,
  TeamTargetDashboard,
  ExecutiveAnalytics,
  ForecastVsActual,
  ActivityReport,
  DailyReportResponse,
  ReportSchedule,
  CreateReportSchedulePayload,
  ReportExportType,
  ReportExportFormat,
} from '@/lib/types/salesReports';

export interface ReportWindow {
  period?: string;
  periodType?: 'monthly' | 'quarterly' | 'yearly';
  from?: string;
  to?: string;
}

function windowParams(w: ReportWindow = {}): URLSearchParams {
  const p = new URLSearchParams();
  if (w.period) p.set('period', w.period);
  if (w.periodType) p.set('periodType', w.periodType);
  if (w.from) p.set('from', w.from);
  if (w.to) p.set('to', w.to);
  return p;
}

async function getReport<T>(path: string, w?: ReportWindow): Promise<T> {
  const qs = windowParams(w).toString();
  const res = await apiClient.get<T>(`/sales/reports/${path}${qs ? `?${qs}` : ''}`);
  return res.data;
}

export const fetchPipelineReport = (w?: ReportWindow) => getReport<PipelineSummary>('pipeline', w);
export const fetchWinRateReport = (w?: ReportWindow) => getReport<WinRateReport>('win-rate', w);
export const fetchLostDealReport = (w?: ReportWindow) => getReport<LostDealAnalysis>('lost-deals', w);
export const fetchLeadSourceReport = (w?: ReportWindow) => getReport<LeadSourceReport>('lead-source', w);
export const fetchTeamTargetReport = () => getReport<TeamTargetDashboard>('team-target');
export const fetchExecutiveReport = (w?: ReportWindow) => getReport<ExecutiveAnalytics>('executive', w);
export const fetchForecastVsActual = (w?: ReportWindow) => getReport<ForecastVsActual>('forecast-vs-actual', w);
export const fetchActivityReport = (w?: ReportWindow) => getReport<ActivityReport>('activity', w);

export async function fetchDailyReport(opts: { date?: string; ownerId?: number } = {}): Promise<DailyReportResponse> {
  const p = new URLSearchParams();
  if (opts.date) p.set('date', opts.date);
  if (opts.ownerId != null) p.set('ownerId', String(opts.ownerId));
  const qs = p.toString();
  const res = await apiClient.get<DailyReportResponse>(`/sales/reports/daily${qs ? `?${qs}` : ''}`);
  return res.data;
}

// ── Scheduler CRUD ───────────────────────────────────────────────────────────
export async function fetchReportSchedules(): Promise<ReportSchedule[]> {
  const res = await apiClient.get<ReportSchedule[]>('/sales/reports/schedules');
  return res.data;
}
export async function createReportSchedule(payload: CreateReportSchedulePayload): Promise<ReportSchedule> {
  const res = await apiClient.post<ReportSchedule>('/sales/reports/schedules', payload);
  return res.data;
}
export async function updateReportSchedule(id: number, payload: Partial<CreateReportSchedulePayload>): Promise<ReportSchedule> {
  const res = await apiClient.put<ReportSchedule>(`/sales/reports/schedules/${id}`, payload);
  return res.data;
}
export async function deleteReportSchedule(id: number): Promise<void> {
  await apiClient.delete(`/sales/reports/schedules/${id}`);
}

// ── Export (Excel / CSV via server; PDF via client print) ────────────────────
export async function exportReport(type: ReportExportType, format: ReportExportFormat, w?: ReportWindow): Promise<void> {
  const p = windowParams(w);
  p.set('type', type);
  p.set('format', format);
  const res = await apiClient.get<Blob>(`/sales/reports/export?${p.toString()}`, { responseType: 'blob' });
  const blob = new Blob([res.data as BlobPart]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-report.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
