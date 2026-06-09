import { apiClient } from './api-client';

export interface ActivityLog {
  id: number;
  actor_user_id: number;
  target_user_id?: number;
  project_id?: string;
  task_id?: string;
  type: string;
  description: string;
  created_at: string;
  actor?: {
    id: number;
    name: string;
    role?: string;
    email?: string;
  };
}

export const fetchActivityFeed = async (): Promise<ActivityLog[]> => {
  const response = await apiClient.get<ActivityLog[]>('/activity-feed');
  return response.data;
};

export const clearActivityFeed = async (): Promise<void> => {
  await apiClient.delete('/activity-feed');
};
