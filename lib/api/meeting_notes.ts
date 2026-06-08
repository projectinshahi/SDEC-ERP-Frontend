import { apiClient as api } from './api-client';

export interface MeetingNote {
  id: number;
  meetingId: number;
  title: string;
  content: string;
  createdBy: number;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: number;
    name: string;
    email: string;
  };
  updater?: {
    id: number;
    name: string;
    email: string;
  };
}

export async function getMeetingNotes(meetingId: number): Promise<MeetingNote[]> {
  const response = await api.get<MeetingNote[]>(`/meetings/${meetingId}/notes`);
  return response.data;
}

export async function createMeetingNote(meetingId: number, data: { title: string; content: string }): Promise<MeetingNote> {
  const response = await api.post<MeetingNote>(`/meetings/${meetingId}/notes`, data);
  return response.data;
}

export async function updateMeetingNote(meetingId: number, noteId: number, data: { title: string; content: string }): Promise<MeetingNote> {
  const response = await api.put<MeetingNote>(`/meetings/${meetingId}/notes/${noteId}`, data);
  return response.data;
}

export async function deleteMeetingNote(meetingId: number, noteId: number): Promise<void> {
  await api.delete(`/meetings/${meetingId}/notes/${noteId}`);
}
