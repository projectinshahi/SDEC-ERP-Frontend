import { apiClient } from './api-client';

/* ── Marketing → Attendance API ───────────────────────────────────────────────
 * Statuses and "today" come FROM the server. The client never decides what day
 * it is (a browser in another timezone would disagree) and never sends a
 * timestamp — check-in/check-out carry no body at all. */

export interface AttendanceRecord {
  id: number | null;
  userId: number;
  /** 'YYYY-MM-DD' */
  date: string;
  status: string;
  statusLabel: string;
  checkIn: string | null;
  checkOut: string | null;
  notes: string | null;
  leaveId: number | null;
  overriddenBy: number | null;
  overriddenAt: string | null;
  overrideReason: string | null;
  /** false = the virtual Absent default; no row exists for this day. */
  persisted: boolean;
}

export interface TeamAttendanceRecord extends AttendanceRecord { userName: string }
export interface StatusOption { key: string; label: string }

export interface MyAttendance {
  today: string;
  date: string;
  statuses: StatusOption[];
  canSelfAttend: boolean;
  canViewTeam: boolean;
  canOverride: boolean;
  /** null = the business has not defined the historical-edit window yet. */
  historicalEditWindowDays: number | null;
  approvedLeave: { id: number; leaveType: string } | null;
  attendance: AttendanceRecord;
}

export interface TeamAttendance {
  today: string;
  date: string;
  statuses: StatusOption[];
  canOverride: boolean;
  historicalEditWindowDays: number | null;
  records: TeamAttendanceRecord[];
}

export async function fetchMyAttendance(date?: string): Promise<MyAttendance> {
  const res = await apiClient.get<{ success: boolean } & MyAttendance>(
    `/marketing/attendance/me${date ? `?date=${date}` : ''}`,
  );
  return res.data;
}

/** No body: the server stamps the time and resolves the day and the user. */
export async function checkIn(): Promise<AttendanceRecord> {
  const res = await apiClient.post<{ success: boolean; attendance: AttendanceRecord }>(
    '/marketing/attendance/check-in', {},
  );
  return res.data.attendance;
}

export async function checkOut(): Promise<AttendanceRecord> {
  const res = await apiClient.post<{ success: boolean; attendance: AttendanceRecord }>(
    '/marketing/attendance/check-out', {},
  );
  return res.data.attendance;
}

export async function fetchTeamAttendance(date?: string): Promise<TeamAttendance> {
  const res = await apiClient.get<{ success: boolean } & TeamAttendance>(
    `/marketing/attendance${date ? `?date=${date}` : ''}`,
  );
  return res.data;
}

export interface OverridePayload {
  status: string;
  /** Mandatory — the server rejects an override without one. */
  reason: string;
  notes?: string | null;
}

export async function overrideAttendance(
  userId: number, date: string, payload: OverridePayload,
): Promise<AttendanceRecord> {
  const res = await apiClient.put<{ success: boolean; attendance: AttendanceRecord }>(
    `/marketing/attendance/${userId}/${date}`, payload,
  );
  return res.data.attendance;
}


/* ── MK-003.3 / MK-003.4 — monthly calendar, summary and export ─────────────
 * All three come from ONE backend calculation (buildMonth), so the calendar,
 * the table and the spreadsheet cannot disagree. Nothing is recomputed here. */

export interface MonthDayCell {
  date: string;                 // 'YYYY-MM-DD'
  kind: string;                 // present|absent|half_day|on_leave|holiday|future|before_join
  persisted: boolean;
  checkIn: string | null;
  checkOut: string | null;
  notes: string | null;
  holidayName: string | null;
  leaveType: string | null;
  overriddenBy: number | null;
  overrideReason: string | null;
  counted: boolean;
}

export interface MemberMonth {
  userId: number;
  userName: string;
  joinDate: string | null;
  days: MonthDayCell[];
  totals: {
    present: number; absent: number; halfDay: number; leave: number;
    holidays: number; countedDays: number; attendancePercent: number | null;
  };
}

export interface AttendanceMonth {
  month: string;
  days: string[];
  canViewTeam: boolean;
  roster: { id: number; name: string }[];
  members: MemberMonth[];
}

export interface SummaryColumn { key: string; label: string }

export interface SummaryRow {
  userId: number; userName: string; joinDate: string | null;
  present: number; absent: number; halfDay: number; leave: number;
  holidays: number; countedDays: number; attendancePercent: number | null;
}

export interface AttendanceSummary {
  month: string;
  columns: SummaryColumn[];
  rows: SummaryRow[];
}

export async function fetchAttendanceMonth(month: string, userId?: number): Promise<AttendanceMonth> {
  const qs = new URLSearchParams({ month });
  if (userId) qs.set('userId', String(userId));
  const res = await apiClient.get<{ success: boolean } & AttendanceMonth>(
    `/marketing/attendance/month?${qs.toString()}`,
  );
  return {
    month: res.data?.month ?? month,
    days: res.data?.days ?? [],
    canViewTeam: !!res.data?.canViewTeam,
    roster: res.data?.roster ?? [],
    members: res.data?.members ?? [],
  };
}

export async function fetchAttendanceSummary(month: string): Promise<AttendanceSummary> {
  const res = await apiClient.get<{ success: boolean } & AttendanceSummary>(
    `/marketing/attendance/summary?month=${encodeURIComponent(month)}`,
  );
  return { month: res.data?.month ?? month, columns: res.data?.columns ?? [], rows: res.data?.rows ?? [] };
}

/**
 * Download the XLSX the SERVER builds from the same calculation the table shows.
 * Deliberately not generated in the browser: a second calculation is exactly how
 * an export starts disagreeing with the screen.
 *
 * Uses the axios client so the Authorization header is attached — a bare
 * window.open() would hit the endpoint unauthenticated and 401.
 */
export async function downloadAttendanceSummaryXlsx(month: string): Promise<void> {
  const res = await apiClient.get(`/marketing/attendance/summary.xlsx?month=${encodeURIComponent(month)}`, {
    responseType: 'blob',
  });
  const blob = new Blob([res.data as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `marketing-attendance-${month}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked immediately: the click has already handed the blob to the browser.
  URL.revokeObjectURL(url);
}
