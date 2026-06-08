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

export interface BlockerDiscussionMessage {
  id: number;
  blocker_id: number;
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

export interface BlockerAttachment {
  id: number;
  blocker_id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  description: string | null;
  uploaded_by: number;
  uploaded_at: string;
  uploader?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface GetBlockersParams {
  projectId?: string;
  loggedBy?: string;
  assignedTo?: string;
  status?: string;
  escalation?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedBlockersResponse {
  data: Blocker[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const getBlockers = async (params?: GetBlockersParams): Promise<PaginatedBlockersResponse> => {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
  }
  const queryString = query.toString();
  const response = await api.get<{ success: boolean; data: Blocker[]; meta: any }>(`/blockers${queryString ? `?${queryString}` : ''}`);
  return { data: response.data.data, meta: response.data.meta };
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

export const fetchBlockerDiscussions = async (id: number): Promise<BlockerDiscussionMessage[]> => {
  const response = await api.get<BlockerDiscussionMessage[]>(`/blockers/${id}/discussions`);
  return response.data;
};

export const postBlockerDiscussion = async (id: number, message: string): Promise<BlockerDiscussionMessage> => {
  const response = await api.post<{ message: BlockerDiscussionMessage }>(`/blockers/${id}/discussions`, { message });
  return response.data.message;
};

export const markBlockerDiscussionRead = async (id: number): Promise<void> => {
  await api.post(`/blockers/${id}/discussions/read`, {});
};

export const deleteBlockerDiscussion = async (id: number, messageId: number): Promise<void> => {
  await api.delete(`/blockers/${id}/discussions/${messageId}`);
};

export const fetchBlockerAttachments = async (id: number): Promise<BlockerAttachment[]> => {
  const response = await api.get<{ attachments: BlockerAttachment[] }>(`/blockers/${id}/attachments`);
  return response.data.attachments;
};

export const uploadBlockerAttachments = async (id: number, files: File[]): Promise<BlockerAttachment[]> => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  
  const response = await api.post<{ attachments: BlockerAttachment[] }>(`/blockers/${id}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.attachments;
};

export const deleteBlockerAttachment = async (id: number, attachmentId: number): Promise<void> => {
  await api.delete(`/blockers/${id}/attachments/${attachmentId}`);
};
