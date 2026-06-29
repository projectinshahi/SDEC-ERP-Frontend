import { apiClient as api } from './api-client';

/**
 * Sales Meetings API — talks to /api/sales/meetings (module='sales' on the
 * backend). Mirrors lib/api/meetings.ts and adds the Sales linkages
 * (lead/deal/customer/team). Reuses the same controller, Google Meet generation,
 * notifications, action items and notes.
 */

export interface SalesMeetingUser {
  id: number;
  name: string;
  email: string;
}

export interface SalesMeetingRef {
  id: number;
  title?: string;
  name?: string;
}

export interface SalesActionItem {
  id: number;
  title: string;
  description: string | null;
  assignedTo: number;
  dueDate: string | null;
  status: string;
  priority: string;
  meetingId: number;
  createdAt: string;
}

export interface SalesActionItemInput {
  title: string;
  assignedTo: number;
  dueDate?: string;
  priority?: string;
  description?: string;
}

export interface SalesMeeting {
  id: number;
  title: string;
  description: string | null;
  projectId: string | null;
  module: string;
  leadId: number | null;
  dealId: number | null;
  customerId: number | null;
  teamId: number | null;
  meetingType: string;
  status: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  location: string | null;
  meetingLink: string | null;
  organizerId: number;
  attendees: number[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  organizer?: SalesMeetingUser;
  lead?: { id: number; title: string } | null;
  deal?: { id: number; title: string } | null;
  customer?: { id: number; name: string } | null;
  team?: { id: number; name: string } | null;
  actionItems?: SalesActionItem[];
  /** Live, server-derived status (UPCOMING | ONGOING | COMPLETED | CANCELLED). */
  computedStatus?: string;
}

export interface SalesMeetingAnalytics {
  totalMeetings: number;
  scheduled: number;
  completed: number;
  ongoing: number;
  upcoming: number;
  cancelled: number;
  openActionItems: number;
  meetingTypeCounts: Record<string, number>;
}

export interface SalesMeetingPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SalesMeetingListResult {
  data: SalesMeeting[];
  pagination: SalesMeetingPagination;
}

export interface SalesMeetingFilters {
  search?: string;
  type?: string;
  status?: string;
  organizerId?: string;
  leadId?: number;
  dealId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface CreateSalesMeetingPayload {
  title: string;
  description?: string;
  meetingType: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  location?: string;
  meetingLink?: string;
  attendees?: number[];
  notes?: string;
  leadId?: number | null;
  dealId?: number | null;
  customerId?: number | null;
  teamId?: number | null;
  actionItems?: SalesActionItemInput[];
}

export interface UpdateSalesMeetingPayload {
  title?: string;
  description?: string;
  meetingType?: string;
  meetingDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  meetingLink?: string;
  attendees?: number[];
  notes?: string;
  status?: string;
  leadId?: number | null;
  dealId?: number | null;
  customerId?: number | null;
  teamId?: number | null;
}

export const getSalesMeetings = async (filters: SalesMeetingFilters = {}): Promise<SalesMeetingListResult> => {
  const params = new URLSearchParams();
  const set = (k: string, v: unknown) => {
    if (v !== undefined && v !== null && String(v).trim() !== '' && v !== 'ALL') params.set(k, String(v));
  };
  set('search', filters.search);
  set('type', filters.type);
  set('status', filters.status);
  set('organizerId', filters.organizerId);
  set('leadId', filters.leadId);
  set('dealId', filters.dealId);
  set('dateFrom', filters.dateFrom);
  set('dateTo', filters.dateTo);
  set('page', filters.page);
  set('limit', filters.limit);
  const qs = params.toString();
  const response = await api.get<{ success: boolean; data: SalesMeeting[]; pagination: SalesMeetingPagination }>(
    `/sales/meetings${qs ? `?${qs}` : ''}`,
  );
  return {
    data: response.data.data,
    pagination: response.data.pagination ?? {
      total: response.data.data.length, page: 1, limit: response.data.data.length || 10, totalPages: 1,
    },
  };
};

export const getSalesMeetingAnalytics = async (): Promise<SalesMeetingAnalytics> => {
  const response = await api.get<{ success: boolean; data: SalesMeetingAnalytics }>('/sales/meetings/analytics');
  return response.data.data;
};

export const getSalesMeetingById = async (id: number): Promise<SalesMeeting> => {
  const response = await api.get<{ success: boolean; data: SalesMeeting }>(`/sales/meetings/${id}`);
  return response.data.data;
};

export const createSalesMeeting = async (data: CreateSalesMeetingPayload): Promise<SalesMeeting> => {
  const response = await api.post<{ success: boolean; data: SalesMeeting; message?: string }>('/sales/meetings', data);
  return response.data.data;
};

export const updateSalesMeeting = async (id: number, data: UpdateSalesMeetingPayload): Promise<SalesMeeting> => {
  const response = await api.put<{ success: boolean; data: SalesMeeting }>(`/sales/meetings/${id}`, data);
  return response.data.data;
};

export const deleteSalesMeeting = async (id: number): Promise<void> => {
  await api.delete<{ success: boolean; message: string }>(`/sales/meetings/${id}`);
};

// ── Notes (reuses the meeting notes system, scoped to /sales/meetings) ─────────

export interface SalesMeetingNote {
  id: number;
  meetingId: number;
  title: string;
  content: string;
  createdBy: number;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
  author?: { id: number; name: string; email: string };
  updater?: { id: number; name: string; email: string };
}

export const getSalesMeetingNotes = async (meetingId: number): Promise<SalesMeetingNote[]> => {
  const response = await api.get<SalesMeetingNote[]>(`/sales/meetings/${meetingId}/notes`);
  return response.data;
};

export const createSalesMeetingNote = async (meetingId: number, data: { title: string; content: string }): Promise<SalesMeetingNote> => {
  const response = await api.post<SalesMeetingNote>(`/sales/meetings/${meetingId}/notes`, data);
  return response.data;
};

export const updateSalesMeetingNote = async (meetingId: number, noteId: number, data: { title: string; content: string }): Promise<SalesMeetingNote> => {
  const response = await api.put<SalesMeetingNote>(`/sales/meetings/${meetingId}/notes/${noteId}`, data);
  return response.data;
};

export const deleteSalesMeetingNote = async (meetingId: number, noteId: number): Promise<void> => {
  await api.delete(`/sales/meetings/${meetingId}/notes/${noteId}`);
};
