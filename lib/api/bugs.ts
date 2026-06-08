import { apiClient as api } from './api-client';
import axios from 'axios';
import { API_BASE_URL } from '@/lib/constants';

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

export interface BugDiscussionMessage {
  id: number;
  bug_id: number;
  sender_id: number;
  message: string;
  created_at: string;
  updated_at: string;
  sender: {
    id: number;
    name: string;
    email: string;
  };
}

export interface BugAttachment {
  id: number;
  bug_id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  description?: string | null;
  uploaded_by: number;
  uploaded_at: string;
  uploader?: {
    id: number;
    name: string;
    email: string;
  };
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

export interface BugAnalyticsData {
  totalBugs: number;
  openBugs: number;
  inProgressBugs: number;
  closedBugs: number;
  reopenedBugs: number;
  severityDistribution: { name: string; value: number }[];
  priorityDistribution: { name: string; value: number }[];
  statusDistribution: { name: string; value: number }[];
  projectDistribution: { name: string; value: number }[];
  assigneeAnalytics: { name: string; count: number }[];
  resolutionTimeAvgDays: number;
  trendAnalytics: { date: string; created: number; resolved: number }[];
  reopenRate: number;
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

export const fetchBugAnalytics = async (projectId?: string): Promise<BugAnalyticsData> => {
  const response = await api.get<{ success: boolean; data: BugAnalyticsData }>('/bugs/analytics', projectId ? { params: { projectId } } : {});
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

// ── Discussion & Attachment APIs ─────────────────────────────────────────────

export const fetchBugDiscussions = async (bugId: number): Promise<BugDiscussionMessage[]> => {
  const response = await api.get<BugDiscussionMessage[]>(`/bugs/${bugId}/discussions`);
  return response.data;
};

export const addBugMessage = async (bugId: number, message: string): Promise<BugDiscussionMessage> => {
  const response = await api.post<{ success: boolean; message: BugDiscussionMessage }>(`/bugs/${bugId}/discussions`, { message });
  return response.data.message;
};

export const deleteMessage = async (bugId: number, messageId: number): Promise<void> => {
  await api.delete(`/bugs/${bugId}/discussions/${messageId}`);
};

export const fetchBugAttachments = async (bugId: number): Promise<BugAttachment[]> => {
  const response = await api.get<{ success: boolean; attachments: BugAttachment[] }>(`/bugs/${bugId}/attachments`);
  return response.data.attachments;
};

// Use fetch API or axios to upload form data since api-client doesn't wrap FormData well without custom config headers
export const uploadBugAttachments = async (bugId: number, formData: FormData): Promise<BugAttachment[]> => {
  const token = localStorage.getItem('authToken');
  const response = await axios.post<{ success: boolean; attachments: BugAttachment[] }>(
    `${API_BASE_URL}/bugs/${bugId}/attachments`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.data.attachments;
};

export const deleteBugAttachment = async (bugId: number, attachmentId: number): Promise<void> => {
  await api.delete(`/bugs/${bugId}/attachments/${attachmentId}`);
};

export const markBugDiscussionAsRead = async (bugId: number): Promise<void> => {
  await api.post(`/bugs/${bugId}/discussions/read`, {});
};
