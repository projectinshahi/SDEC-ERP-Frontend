import { apiClient as api } from './api-client';

// ── Types ─────────────────────────────────────────────────────────────────────
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

export interface BugPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BugQueryParams {
  search?: string;
  status?: string;
  priority?: string;
  severity?: string;
  assignee?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BugsResponse {
  bugs: Bug[];
  pagination: BugPagination;
}

// ── Default pagination (used when backend response is missing pagination) ─────
const DEFAULT_PAGINATION: BugPagination = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 1,
};

// ── API Functions ─────────────────────────────────────────────────────────────

export const getBugs = async (params?: BugQueryParams): Promise<BugsResponse> => {
  // Strip undefined/empty values so they aren't sent as "?key=undefined"
  const cleanParams = params
    ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    : {};

  const response = await api.get<{
    success: boolean;
    data: Bug[];
    pagination?: BugPagination;
  }>('/bugs', cleanParams);

  const data = response?.data;

  return {
    bugs: Array.isArray(data?.data) ? data.data : [],
    pagination: {
      total:      data?.pagination?.total      ?? DEFAULT_PAGINATION.total,
      page:       data?.pagination?.page       ?? DEFAULT_PAGINATION.page,
      limit:      data?.pagination?.limit      ?? DEFAULT_PAGINATION.limit,
      totalPages: data?.pagination?.totalPages ?? DEFAULT_PAGINATION.totalPages,
    },
  };
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
