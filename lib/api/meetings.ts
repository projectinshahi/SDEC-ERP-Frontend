import { apiClient as api } from './api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MeetingUser {
  id: number;
  name: string;
  email: string;
}

export interface MeetingProject {
  id: string;
  name: string;
}

export interface Meeting {
  id: number;
  title: string;
  description: string | null;
  projectId: string;
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
  // Included relations
  project?: MeetingProject;
  organizer?: MeetingUser;
  actionItems?: ActionItem[];
  /** Live, server-derived status (UPCOMING | ONGOING | COMPLETED | CANCELLED). */
  computedStatus?: string;
}

export interface ActionItem {
  id: number;
  title: string;
  description: string | null;
  assignedTo: number;
  dueDate: string;
  status: string;
  priority: string;
  meetingId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActionItemInput {
  title: string;
  assignedTo: number;
  dueDate?: string;
  priority?: string;
  description?: string;
}

export interface CreateMeetingPayload {
  title: string;
  description?: string;
  projectId: string;
  meetingType: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  location?: string;
  meetingLink?: string;
  attendees?: number[];
  notes?: string;
  actionItems?: ActionItemInput[];
}

// ─── Analytics & list pagination ────────────────────────────────────────────

export interface MeetingAnalytics {
  totalMeetings: number;
  scheduled: number;
  completed: number;
  ongoing: number;
  upcoming: number;
  cancelled: number;
  openActionItems: number;
  meetingTypeCounts: Record<string, number>;
}

export interface MeetingPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MeetingListResult {
  data: Meeting[];
  pagination: MeetingPagination;
}

export interface MeetingFilters {
  search?: string;
  type?: string;
  status?: string;
  projectId?: string;
  organizerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface UpdateMeetingPayload {
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
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Server-side list: search + filters + pagination. Returns the current page of
 * meetings (each with a live `computedStatus`) plus pagination metadata.
 */
export const getMeetings = async (filters: MeetingFilters = {}): Promise<MeetingListResult> => {
  const params = new URLSearchParams();
  const set = (k: string, v: unknown) => {
    if (v !== undefined && v !== null && String(v).trim() !== '' && v !== 'ALL') {
      params.set(k, String(v));
    }
  };
  set('search', filters.search);
  set('type', filters.type);
  set('status', filters.status);
  set('projectId', filters.projectId);
  set('organizerId', filters.organizerId);
  set('dateFrom', filters.dateFrom);
  set('dateTo', filters.dateTo);
  set('page', filters.page);
  set('limit', filters.limit);
  const qs = params.toString();
  const response = await api.get<{ success: boolean; data: Meeting[]; pagination: MeetingPagination }>(
    `/meetings${qs ? `?${qs}` : ''}`,
  );
  return {
    data: response.data.data,
    pagination: response.data.pagination ?? {
      total: response.data.data.length, page: 1, limit: response.data.data.length || 10, totalPages: 1,
    },
  };
};

/** Live, organization-wide meeting analytics (KPI counts + per-type counts). */
export const getMeetingAnalytics = async (): Promise<MeetingAnalytics> => {
  const response = await api.get<{ success: boolean; data: MeetingAnalytics }>('/meetings/analytics');
  return response.data.data;
};

export const getMeetingById = async (id: number): Promise<Meeting> => {
  const response = await api.get<{ success: boolean; data: Meeting }>(`/meetings/${id}`);
  return response.data.data;
};

export const createMeeting = async (data: CreateMeetingPayload): Promise<Meeting> => {
  const response = await api.post<{ success: boolean; data: Meeting }>('/meetings', data);
  return response.data.data;
};

export const updateMeeting = async (id: number, data: UpdateMeetingPayload): Promise<Meeting> => {
  const response = await api.put<{ success: boolean; data: Meeting }>(`/meetings/${id}`, data);
  return response.data.data;
};

export const deleteMeeting = async (id: number): Promise<void> => {
  await api.delete<{ success: boolean; message: string }>(`/meetings/${id}`);
};
