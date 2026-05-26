import { apiClient as api } from './api-client';

export interface Sprint {
  id: string;
  projectId: string | null;
  name: string;
  goal: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  estimatedHours: number | null;
  capacity: number | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
  };
}

export const getSprints = async (): Promise<Sprint[]> => {
  const response = await api.get<{ success: boolean; data: Sprint[] }>('/sprints');
  return response.data.data;
};

export const getSprintById = async (id: string): Promise<Sprint> => {
  const response = await api.get<{ success: boolean; data: Sprint }>(`/sprints/${id}`);
  return response.data.data;
};

export const createSprint = async (data: Partial<Sprint>): Promise<Sprint> => {
  const response = await api.post<{ success: boolean; data: Sprint }>('/sprints', data);
  return response.data.data;
};

export const updateSprint = async (id: string, data: Partial<Sprint>): Promise<Sprint> => {
  const response = await api.put<{ success: boolean; data: Sprint }>(`/sprints/${id}`, data);
  return response.data.data;
};

export const deleteSprint = async (id: string): Promise<void> => {
  await api.delete<{ success: boolean; message: string }>(`/sprints/${id}`);
};
