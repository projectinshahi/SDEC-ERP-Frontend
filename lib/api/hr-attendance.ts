import { apiClient } from './api-client';

/* ── Backend response types (raw from DB) ──────────────────────────────────── */

export interface ApiAttendanceRecord {
  id: number;
  employee_id: number;
  employee_code: string;
  name: string;
  department: string;
  designation: string;
  date: string;           // ISO date string e.g. "2026-06-26"
  check_in: string | null;   // "09:15 AM"
  lunch_out: string | null;  // "01:05 PM"
  lunch_in: string | null;   // "02:00 PM"
  check_out: string | null;  // "06:30 PM"
  work_hours: number | null; // decimal hours e.g. 7.5
  status: string;
  late_checkin?: boolean;
  late_after_lunch?: boolean;
  leave_type?: 'full_day' | 'half_day' | null;
  notes?: string | null;
}

export interface ApiAttendanceSummary {
  present: number;
  late: number;
  late_after_lunch: number;
  leave_full_day: number;
  leave_half_day: number;
  absent: number;
}

export interface SaveAttendancePayload {
  employee_id: number;
  date: string;
  check_in?: string | null;
  lunch_out?: string | null;
  lunch_in?: string | null;
  check_out?: string | null;
  leave_type?: 'full_day' | 'half_day' | null;
  notes?: string | null;
}

/* ── API functions ──────────────────────────────────────────────────────────── */

/**
 * GET /hr/attendance
 * Fetch all attendance records joined with employee + user data.
 */
export async function fetchAttendance(): Promise<ApiAttendanceRecord[]> {
  const res = await apiClient.get<{ success: boolean; data: ApiAttendanceRecord[] }>('/hr/attendance');
  return res.data?.data ?? [];
}

/**
 * GET /hr/attendance/summary
 * Fetch aggregated status counts.
 */
export async function fetchAttendanceSummary(): Promise<ApiAttendanceSummary> {
  const res = await apiClient.get<{ success: boolean; data: ApiAttendanceSummary }>('/hr/attendance/summary');
  return res.data?.data ?? { present: 0, late: 0, absent: 0 };
}

/**
 * POST /hr/attendance
 * Save (upsert) an attendance record for a given employee + date.
 * The backend will INSERT or UPDATE based on (employee_id, date) uniqueness.
 */
export async function saveAttendance(payload: SaveAttendancePayload): Promise<{ workHours: number; status: string }> {
  const res = await apiClient.post<{ success: boolean; workHours: number; status: string }>(
    '/hr/attendance',
    payload,
  );
  return { workHours: res.data?.workHours ?? 0, status: res.data?.status ?? 'absent' };
}

/* ── High-level action helpers ──────────────────────────────────────────────── */

const TODAY = () => new Date().toISOString().split('T')[0];

function nowTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Check In — records morning punch-in time for today.
 */
export async function checkIn(
  employeeId: number,
  existing?: ApiAttendanceRecord | null,
): Promise<void> {
  await saveAttendance({
    employee_id: employeeId,
    date: TODAY(),
    check_in: nowTime(),
    lunch_out: existing?.lunch_out ?? null,
    lunch_in: existing?.lunch_in ?? null,
    check_out: existing?.check_out ?? null,
  });
}

/**
 * Lunch Out — records lunch-out punch for today.
 */
export async function lunchOut(
  employeeId: number,
  existing?: ApiAttendanceRecord | null,
): Promise<void> {
  await saveAttendance({
    employee_id: employeeId,
    date: TODAY(),
    check_in: existing?.check_in ?? null,
    lunch_out: nowTime(),
    lunch_in: existing?.lunch_in ?? null,
    check_out: existing?.check_out ?? null,
  });
}

/**
 * Lunch In — records return from lunch for today.
 */
export async function lunchIn(
  employeeId: number,
  existing?: ApiAttendanceRecord | null,
): Promise<void> {
  await saveAttendance({
    employee_id: employeeId,
    date: TODAY(),
    check_in: existing?.check_in ?? null,
    lunch_out: existing?.lunch_out ?? null,
    lunch_in: nowTime(),
    check_out: existing?.check_out ?? null,
  });
}

/**
 * Check Out — records end-of-day punch for today.
 */
export async function checkOut(
  employeeId: number,
  existing?: ApiAttendanceRecord | null,
): Promise<void> {
  await saveAttendance({
    employee_id: employeeId,
    date: TODAY(),
    check_in: existing?.check_in ?? null,
    lunch_out: existing?.lunch_out ?? null,
    lunch_in: existing?.lunch_in ?? null,
    check_out: nowTime(),
  });
}

/**
 * DELETE /hr/attendance/:id
 * Delete an attendance record by its primary key ID.
 */
export async function deleteAttendance(id: number): Promise<{ success: boolean; message?: string }> {
  console.log(`[API Request] Clicked record ID for deletion: ${id}`);
  console.log(`[API Request] Request payload -> URL: /hr/attendance/${id}, Method: DELETE`);
  const res = await apiClient.delete<{ success: boolean; message?: string }>(`/hr/attendance/${id}`);
  return res.data;
}

