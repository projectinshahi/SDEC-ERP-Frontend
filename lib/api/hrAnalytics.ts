/**
 * Attendance Analytics API client (Phase 1). Thin wrappers over `/hr/analytics/*`,
 * following the Sales reports client pattern. The backend uses the HR envelope
 * `{ success, data }`, so we unwrap `.data.data`.
 */
import { apiClient } from './api-client';
import { isApiError } from '@/lib/api-errors';
import type {
  AnalyticsSummary,
  StatusDistribution,
  AttendanceTrend,
  DepartmentRankingResponse,
  EmployeeReportResponse,
  EmployeeDetailResponse,
} from '@/lib/hr/attendanceAnalytics.types';

export interface AnalyticsBaseFilters {
  from?: string;
  to?: string;
  department?: string;
  employeeId?: number;
}

type QueryValue = string | number | boolean | undefined;

function qs(params: Record<string, QueryValue>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

async function getData<T>(path: string, params: Record<string, QueryValue>): Promise<T> {
  const res = await apiClient.get<{ success: boolean; data: T }>(`/hr/analytics/${path}${qs(params)}`);
  return res.data.data;
}

export const fetchAttendanceSummary = (f: AnalyticsBaseFilters) =>
  getData<AnalyticsSummary>('summary', { ...f });

export const fetchStatusDistribution = (f: AnalyticsBaseFilters) =>
  getData<StatusDistribution>('status-distribution', { ...f });

export const fetchAttendanceTrend = (
  f: AnalyticsBaseFilters & { granularity?: 'day' | 'week' | 'month'; compare?: boolean },
) => getData<AttendanceTrend>('trend', { ...f });

export const fetchDepartmentRanking = (f: AnalyticsBaseFilters & { compare?: boolean }) =>
  getData<DepartmentRankingResponse>('by-department', { ...f });

export const fetchEmployeeReport = (
  f: AnalyticsBaseFilters & {
    page?: number;
    pageSize?: number;
    sort?: string;
    order?: 'asc' | 'desc';
    search?: string;
    threshold?: number;
  },
) => getData<EmployeeReportResponse>('employee-report', { ...f });

/** Employee drill-down (M3.3): GET /hr/analytics/employee/:id?from&to */
export const fetchEmployeeDetail = (id: number, f: { from?: string; to?: string }) =>
  getData<EmployeeDetailResponse>(`employee/${id}`, { ...f });

// ── Export (M4.2) — Excel / CSV via the server (mirrors the Sales blob pattern) ─

export type ExportFormat = 'xlsx' | 'csv';
export type ExportTableType = 'workbook' | 'summary' | 'departments' | 'employees' | 'leaves';

export interface ExportAnalyticsParams extends AnalyticsBaseFilters {
  format: ExportFormat;
  type: ExportTableType;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  threshold?: number;
}

/** Fallback filename when Content-Disposition isn't exposed (e.g. cross-origin). */
function fallbackExportName(p: ExportAnalyticsParams): string {
  const range = [p.from, p.to].filter(Boolean).join('_to_') || 'range';
  if (p.type === 'workbook') return `Attendance_Analytics_${range}.${p.format}`;
  const cap = p.type.charAt(0).toUpperCase() + p.type.slice(1);
  return `Attendance_${cap}_${range}.${p.format}`;
}

/** Parse `filename`/`filename*` out of a Content-Disposition header. */
function filenameFromDisposition(disposition?: string): string | null {
  if (!disposition) return null;
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
    } catch {
      /* fall through to the plain form */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1]?.trim() ?? null;
}

/** Extract a human message from a failed export — the server JSON error arrives
 *  as a Blob when responseType is 'blob', so read + parse it. */
async function extractExportError(err: unknown): Promise<string> {
  if (isApiError(err)) {
    const details = err.details;
    if (details instanceof Blob) {
      try {
        const json = JSON.parse(await details.text());
        if (json?.error || json?.message) return String(json.error ?? json.message);
      } catch {
        /* not JSON — use the generic message below */
      }
    }
    return err.message || 'Export failed.';
  }
  if (err instanceof Error) return err.message;
  return 'Export failed. Please try again.';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * GET /hr/analytics/export → triggers a browser download of the XLSX/CSV.
 * Reuses the Sales blob-download pattern; filename comes from Content-Disposition
 * with a safe fallback. On failure it throws an Error carrying the server message
 * (parsed out of the Blob) so the caller can toast it — never fails silently.
 */
export async function exportAttendanceAnalytics(params: ExportAnalyticsParams): Promise<void> {
  const sp = new URLSearchParams();
  const set = (k: string, v: string | number | undefined) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  };
  set('from', params.from);
  set('to', params.to);
  set('department', params.department);
  set('employeeId', params.employeeId);
  set('format', params.format);
  set('type', params.type);
  set('sort', params.sort);
  set('order', params.order);
  set('search', params.search);
  set('threshold', params.threshold);

  try {
    const res = await apiClient.get<Blob>(`/hr/analytics/export?${sp.toString()}`, {
      responseType: 'blob',
    });
    const blob = res.data as Blob;
    const disposition = (res.headers as Record<string, string | undefined>)['content-disposition'];
    const filename = filenameFromDisposition(disposition) ?? fallbackExportName(params);
    downloadBlob(blob, filename);
  } catch (err) {
    throw new Error(await extractExportError(err));
  }
}
