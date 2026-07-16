import { apiClient } from './api-client';

/**
 * My Tasks module API client — talks ONLY to /api/my-tasks (its own standalone
 * backend). No overlap with the Development Kanban task API (lib/api/kanban.ts).
 */

export interface MyTaskMember {
  id: number;
  name: string;
  email: string | null;
}

export interface MyTaskAttachment {
  id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_by: number;
  uploader?: { id: number; name: string } | null;
}

export interface MyTaskActivity {
  id: number;
  action: string;
  details?: any;
  createdAt: string;
  user?: { id: number; name: string } | null;
}

export interface MyTask {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string | null;
  dueTime: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: number; name: string; email: string | null };
  inChargeId?: number | null;
  members: MyTaskMember[];
  memberCount: number;
  assignedToMe: boolean;
  createdByMe: boolean;
  unreadCount: number;
  /** Per-user unread flag: never opened, changed since last open, or new chat msgs. */
  unread: boolean;
  attachments: MyTaskAttachment[];
  activities: MyTaskActivity[];
}

export interface MyTaskWorkspace {
  me: { id: number };
  inbox: MyTask[];
  outbox: MyTask[];
}

export interface MyTaskMessage {
  id: number;
  task_id: number;
  sender_id: number;
  message: string;
  metadata?: any;
  created_at: string;
  sender: { id: number; name: string; email: string | null } | null;
}

export interface CreateMyTaskInput {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  memberIds?: number[];
  inChargeId?: number | null;
}

export async function fetchMyTaskWorkspace(): Promise<MyTaskWorkspace> {
  const r = await apiClient.get<MyTaskWorkspace>('/my-tasks/workspace');
  return r.data;
}

export async function fetchMyTask(id: number): Promise<MyTask> {
  const r = await apiClient.get<MyTask>(`/my-tasks/${id}`);
  return r.data;
}

export async function createMyTask(input: CreateMyTaskInput): Promise<MyTask> {
  const r = await apiClient.post<MyTask>('/my-tasks', input);
  return r.data;
}

export async function updateMyTask(
  id: number,
  input: Partial<CreateMyTaskInput & { status: string }>,
): Promise<MyTask> {
  const r = await apiClient.put<MyTask>(`/my-tasks/${id}`, input);
  return r.data;
}

export async function updateMyTaskStatus(id: number, status: string): Promise<{ success: boolean; status: string }> {
  const r = await apiClient.patch<{ success: boolean; status: string }>(`/my-tasks/${id}/status`, { status });
  return r.data;
}

export async function deleteMyTask(id: number): Promise<{ success: boolean }> {
  const r = await apiClient.delete<{ success: boolean }>(`/my-tasks/${id}`);
  return r.data;
}

export async function addMyTaskMembers(id: number, userIds: number[]): Promise<MyTaskMember[]> {
  const r = await apiClient.post<MyTaskMember[]>(`/my-tasks/${id}/members`, { userIds });
  return r.data;
}

export async function removeMyTaskMember(id: number, userId: number): Promise<{ success: boolean }> {
  const r = await apiClient.delete<{ success: boolean }>(`/my-tasks/${id}/members/${userId}`);
  return r.data;
}

export async function fetchMyTaskMessages(id: number): Promise<MyTaskMessage[]> {
  const r = await apiClient.get<MyTaskMessage[]>(`/my-tasks/${id}/messages`);
  return r.data;
}

export async function sendMyTaskMessage(taskId: number, message: string, mentions?: number[]): Promise<MyTaskMessage> {
  const r = await apiClient.post<{ message: MyTaskMessage }>(`/my-tasks/${taskId}/messages`, { message, mentions });
  return r.data.message;
}

export async function deleteMyTaskMessage(id: number, messageId: number): Promise<{ success: boolean }> {
  const r = await apiClient.delete<{ success: boolean }>(`/my-tasks/${id}/messages/${messageId}`);
  return r.data;
}

export async function markMyTaskRead(id: number): Promise<{ success: boolean }> {
  const r = await apiClient.post<{ success: boolean }>(`/my-tasks/${id}/read`);
  return r.data;
}

export async function uploadMyTaskAttachment(id: number, formData: FormData): Promise<{ success: boolean; attachments: MyTaskAttachment[] }> {
  const r = await apiClient.post<{ success: boolean; attachments: MyTaskAttachment[] }>(
    `/my-tasks/${id}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return r.data;
}

export async function deleteMyTaskAttachment(id: number, attachmentId: number): Promise<{ success: boolean }> {
  const r = await apiClient.delete<{ success: boolean }>(`/my-tasks/${id}/attachments/${attachmentId}`);
  return r.data;
}
