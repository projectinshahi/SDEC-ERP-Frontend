import { apiClient } from './api-client';
import { notifyUnreadRefresh } from '../unreadBus';

/**
 * My Tasks module API client — talks ONLY to /api/my-tasks (its own standalone
 * backend). No overlap with the Development Kanban task API (lib/api/kanban.ts).
 */

export interface MyTaskMember {
  id: number;
  name: string;
  email: string | null;
  /** False when the user account is inactive — such users are not mentionable. */
  active?: boolean;
}

export interface MyTaskAttachment {
  id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_by: number;
  uploader?: { id: number; name: string } | null;
  /** Upload timestamp (from my_task_attachments.uploaded_at) — used by the Task PDF. */
  uploaded_at?: string | null;
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
  createdBy: { id: number; name: string; email: string | null; active?: boolean };
  inChargeId?: number | null;
  /** Dependency reason shown while status === 'waiting' (null otherwise). */
  waitingReason?: string | null;
  /** Optional Project link (projects.id is a string id). */
  projectId?: string | null;
  projectName?: string | null;
  /** Manually assigned effort points; count toward performance only when approved. */
  estimatedPoints: number;
  members: MyTaskMember[];
  memberCount: number;
  assignedToMe: boolean;
  createdByMe: boolean;
  unreadCount: number;
  /** Per-user unread flag: never opened, changed since last open, or new chat msgs. */
  unread: boolean;
  /** Per-user unread @mentions (subset of unreadCount) — drives the card's @ badge. */
  unreadMentions: number;
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
  projectId?: string | null;
  /** Manually assigned effort points; awarded to performance only once approved. */
  estimatedPoints?: number;
}

/* ── Task Dashboard (org-wide analytics; needs mytasks.dashboard.view) ────── */

export interface MyTaskDashboardFilters {
  employeeId?: number | null;
  department?: string | null;
  projectId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  priority?: string | null;
  inChargeId?: number | null;
}

export interface MyTaskDashboardEmployee {
  userId: number;
  name: string;
  email: string | null;
  department: string;
  designation: string | null;
  total: number;
  completed: number;
  done: number;
  approved: number;
  pending: number;
  waiting: number;
  delayed: number;
  completionPct: number;
  /** Derived from the activity timeline; null when no completion was ever logged. */
  avgCompletionHours: number | null;
}

export interface MyTaskDashboardDepartment {
  department: string;
  people: number;
  total: number;
  completed: number;
  pending: number;
  waiting: number;
  delayed: number;
  completionPct: number;
}

export interface MyTaskBottleneckRow {
  userId: number;
  name: string;
  department: string;
  total: number;
  pending: number;
  delayed: number;
  completionPct: number;
}

export interface MyTaskReportTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  owner: string;
  inCharge: string | null;
  members: (string | null)[];
  dueDate: string | null;
  dueTime: string | null;
  createdAt: string;
  department: string;
  project: string | null;
  waitingReason: string | null;
}

export interface MyTaskDashboardData {
  /** Detailed filtered task list — ONLY present on the report payload. */
  tasks?: MyTaskReportTask[];
  summary: {
    total: number; active: number; todo: number; inProgress: number;
    waiting: number; done: number; approved: number; delayed: number; dueToday: number;
  };
  statusDistribution: { label: string; value: number }[];
  priorityDistribution: { label: string; value: number }[];
  trend: { label: string; created: number; completed: number }[];
  /** Currently-overdue tasks bucketed by the day they were DUE (not a historical snapshot). */
  delayedTrend: { label: string; delayed: number }[];
  employees: MyTaskDashboardEmployee[];
  departments: MyTaskDashboardDepartment[];
  companyProgress: {
    total: number; completed: number; completionPct: number;
    approvedPct: number; delayedPct: number; activePct: number; people: number;
  };
  bottlenecks: { highestPending: MyTaskBottleneckRow[]; highestDelayed: MyTaskBottleneckRow[] };
  workload: {
    byDepartment: { label: string; value: number }[];
    byEmployee: { label: string; value: number }[];
  };
  recentlyCompleted: {
    id: number; title: string; status: string | null;
    completedAt: string; completedBy: string | null;
  }[];
  upcomingDeadlines: {
    id: number; title: string; dueDate: string | null; dueTime: string | null;
    status: string; priority: string; inCharge: string | null;
  }[];
  filterOptions: {
    employees: { id: number; name: string }[];
    departments: string[];
    projects: { id: string; name: string }[];
    statuses: { value: string; label: string }[];
  };
  generatedAt: string;
}

/** Shared query-string builder so the dashboard and its report always agree on filters. */
function dashboardQuery(f: MyTaskDashboardFilters): string {
  const p = new URLSearchParams();
  if (f.employeeId) p.set('employeeId', String(f.employeeId));
  if (f.department) p.set('department', f.department);
  if (f.projectId) p.set('projectId', f.projectId);
  if (f.startDate) p.set('startDate', f.startDate);
  if (f.endDate) p.set('endDate', f.endDate);
  if (f.status) p.set('status', f.status);
  if (f.priority) p.set('priority', f.priority);
  if (f.inChargeId) p.set('inChargeId', String(f.inChargeId));
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchMyTaskDashboard(f: MyTaskDashboardFilters = {}): Promise<MyTaskDashboardData> {
  const r = await apiClient.get<MyTaskDashboardData>(`/my-tasks/dashboard${dashboardQuery(f)}`);
  return r.data;
}

/**
 * Report payload = the same aggregation + the detailed filtered task list.
 * Gated server-side by `mytasks.dashboard.export`. Called ONLY when the user
 * actually downloads a report, so normal dashboard loads stay lean.
 */
export async function fetchMyTaskDashboardReport(f: MyTaskDashboardFilters = {}): Promise<MyTaskDashboardData> {
  const r = await apiClient.get<MyTaskDashboardData>(`/my-tasks/dashboard/report${dashboardQuery(f)}`);
  return r.data;
}

export async function fetchMyTaskWorkspace(): Promise<MyTaskWorkspace> {
  const r = await apiClient.get<MyTaskWorkspace>('/my-tasks/workspace');
  return r.data;
}

/** Lightweight unread-task count for the sidebar dot (reuses the workspace `unread` rule). */
export async function fetchMyTaskUnreadCount(): Promise<number> {
  const r = await apiClient.get<{ count: number }>('/my-tasks/unread-count');
  return r.data?.count ?? 0;
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

/** One member's share of a task's Estimated Points, set by the approver. */
export interface PointAllocation {
  userId: number;
  points: number;
}

export async function updateMyTaskStatus(
  id: number,
  status: string,
  waitingReason?: string | null,
  /** Required when approving a multi-assignee task that carries points. */
  pointsDistribution?: PointAllocation[],
): Promise<{ success: boolean; status: string; waitingReason?: string | null }> {
  const r = await apiClient.patch<{ success: boolean; status: string; waitingReason?: string | null }>(
    `/my-tasks/${id}/status`,
    { status, waitingReason, pointsDistribution },
  );
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
  notifyUnreadRefresh(); // clear the sidebar dot immediately if this was the last unread task
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
