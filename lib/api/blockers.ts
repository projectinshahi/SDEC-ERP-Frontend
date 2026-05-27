import { apiClient as api } from './api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlockerUser {
  id: number;
  name: string;
  email: string;
}

export interface BlockerProject {
  id: string;
  name: string;
}

export interface Blocker {
  id: number;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  escalationLevel: string;
  projectId: string;
  loggedById: number;
  helpNeededFromId: number | null;
  resolvedById: number | null;
  resolvedAt: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // Included relations
  project?: BlockerProject;
  loggedBy?: BlockerUser;
  helpNeededFrom?: BlockerUser | null;
  resolvedBy?: BlockerUser | null;
}

export interface CreateBlockerPayload {
  title: string;
  description?: string;
  severity: string;
  status?: string;
  escalationLevel?: string;
  projectId: string;
  loggedById: number;
  helpNeededFromId?: number | null;
  notes?: string;
  tags?: string[];
}

export interface UpdateBlockerPayload {
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  escalationLevel?: string;
  helpNeededFromId?: number | null;
  resolvedById?: number | null;
  resolvedAt?: string | null;
  notes?: string;
  tags?: string[];
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const getBlockers = async (): Promise<Blocker[]> => {
  const response = await api.get<{ success: boolean; data: Blocker[] }>('/blockers');
  return response.data.data;
};

export const getBlockerById = async (id: number): Promise<Blocker> => {
  const response = await api.get<{ success: boolean; data: Blocker }>(`/blockers/${id}`);
  return response.data.data;
};

export const createBlocker = async (data: CreateBlockerPayload): Promise<Blocker> => {
  const response = await api.post<{ success: boolean; data: Blocker }>('/blockers', data);
  return response.data.data;
};

export const updateBlocker = async (id: number, data: UpdateBlockerPayload): Promise<Blocker> => {
  const response = await api.put<{ success: boolean; data: Blocker }>(`/blockers/${id}`, data);
  return response.data.data;
};

export const deleteBlocker = async (id: number): Promise<void> => {
  await api.delete<{ success: boolean; message: string }>(`/blockers/${id}`);
};
