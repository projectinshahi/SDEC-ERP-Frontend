import { apiClient } from './api-client';

export interface ApiAttendanceSettings {
  present_color: string;
  absent_color: string;
  leave_color: string;
  half_day_color: string;
  late_color: string;
  /** Scheduled lunch break start, 24h "HH:mm" (default "13:00"). Entry-form default only — never a punch. */
  lunch_start_time: string;
  /** Scheduled lunch break end / expected return, 24h "HH:mm" (default "14:00"). The late-after-lunch threshold. */
  lunch_end_time: string;
}

/** Fetch current attendance settings (status colours + lunch timings). */
export async function fetchAttendanceSettings(): Promise<ApiAttendanceSettings> {
  const res = await apiClient.get<{ success: boolean; data: ApiAttendanceSettings }>('/hr/attendance/settings');
  return res.data?.data;
}

/** Update attendance settings (partial patch; the backend validates lunch times). */
export async function updateAttendanceSettings(
  patch: Partial<ApiAttendanceSettings>,
): Promise<ApiAttendanceSettings> {
  const res = await apiClient.put<{ success: boolean; data: ApiAttendanceSettings }>(
    '/hr/attendance/settings',
    patch,
  );
  return res.data?.data;
}
