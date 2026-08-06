import { apiClient } from './api-client';

export interface ApiAttendanceSettings {
  present_color: string;
  absent_color: string;
  leave_color: string;
  half_day_color: string;
  late_color: string;
}

/** Fetch current attendance color settings. */
export async function fetchAttendanceSettings(): Promise<ApiAttendanceSettings> {
  const res = await apiClient.get<{ success: boolean; data: ApiAttendanceSettings }>('/hr/attendance/settings');
  return res.data?.data;
}

/** Update attendance color settings. */
export async function updateAttendanceSettings(
  patch: Partial<ApiAttendanceSettings>,
): Promise<ApiAttendanceSettings> {
  const res = await apiClient.put<{ success: boolean; data: ApiAttendanceSettings }>(
    '/hr/attendance/settings',
    patch,
  );
  return res.data?.data;
}
