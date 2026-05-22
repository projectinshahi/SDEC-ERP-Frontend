import { apiClient } from './api-client';

export interface ActiveTaskCountResponse {
  activeTasks: number;
}

/**
 * Fetch count of active tasks (where status != 'done') from Neon DB via backend API
 */
export async function fetchActiveTaskCount(): Promise<ActiveTaskCountResponse> {
  const response = await apiClient.get<ActiveTaskCountResponse>('/tasks/active-count');
  return response.data;
}
