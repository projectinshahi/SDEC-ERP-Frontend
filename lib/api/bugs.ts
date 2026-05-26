import { apiClient as api } from './api-client';

export interface Bug {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  severity: string | null;
  assignedTo: string | null;
  reportedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getBugs = async (): Promise<Bug[]> => {
  const response = await api.get<{ success: boolean; data: Bug[] }>('/bugs');
  return response.data.data;
};

export const getBugById = async (id: number): Promise<Bug> => {
  const response = await api.get<{ success: boolean; data: Bug }>(`/bugs/${id}`);
  return response.data.data;
};

export const createBug = async (data: Partial<Bug>): Promise<Bug> => {
  const response = await api.post<{ success: boolean; data: Bug }>('/bugs', data);
  return response.data.data;
};

export const updateBug = async (id: number, data: Partial<Bug>): Promise<Bug> => {
  const response = await api.put<{ success: boolean; data: Bug }>(`/bugs/${id}`, data);
  return response.data.data;
};

export const deleteBug = async (id: number): Promise<void> => {
  await api.delete<{ success: boolean; message: string }>(`/bugs/${id}`);
};
