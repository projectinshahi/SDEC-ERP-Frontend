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
  organizerId: number;
  attendees?: number[];
  notes?: string;
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

export const getMeetings = async (): Promise<Meeting[]> => {
  const response = await api.get<{ success: boolean; data: Meeting[] }>('/meetings');
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
