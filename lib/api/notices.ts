import { apiClient } from './api-client';

/**
 * Notice module API client — talks to /api/notices. Mirrors the myTasks.ts pattern
 * (typed interfaces + thin apiClient wrappers). No '/api' prefix (base includes it).
 */

export interface NoticeCategory {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  orderIndex: number;
  isActive: boolean;
}

export type NoticePriority = 'low' | 'medium' | 'high' | 'critical';
export type ExpiringBucket = 'today' | 'tomorrow' | 'week';

export interface NoticeAttachment {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  fileType: string | null;
  isLink: boolean;
  uploadedAt: string;
}

export interface Notice {
  id: number;
  title: string;
  body: string;
  priority: NoticePriority | string;
  isPinned: boolean;
  isImportant: boolean;
  publishedAt: string;
  expiresAt: string | null;
  updatedAt: string;
  category: { id: number; name: string; color: string; icon: string | null } | null;
  publishedBy: { id: number; name: string; department?: string | null } | null;
  attachments: NoticeAttachment[];
  /** Lifecycle status — 'draft' | 'published' | 'archived'. */
  status: 'draft' | 'published' | 'archived' | string;
  /** Audience targeting — 'company' (everyone) or 'departments' (the listed depts). */
  audience: { type: 'company' | 'departments' | string; departments: string[] };
  /** Per-user unread flag: never opened OR edited since last open. */
  unread: boolean;
  /** Explicit acknowledgement (separate from read) for the current user. */
  acknowledged: boolean;
  acknowledgedAt: string | null;
  /** Present only on the `expiring` dashboard section. */
  expiringBucket?: ExpiringBucket;
}

export interface NoticeRecipient {
  userId: number;
  name: string;
  department: string | null;
  /** Read = opened the current version (auto read-receipt); inverse of `unread`. */
  status: 'read' | 'pending';
  readTime: string | null;
  /** Stronger, explicit "I Have Read This Notice" signal (separate from opening). */
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

export interface NoticeAckStats {
  audienceType: string;
  departments: string[];
  totalRecipients: number;
  /** Opened the current version. */
  totalRead: number;
  totalUnread: number;
  /** Explicitly acknowledged. Usually a subset of read, but an acknowledgement of an
   *  earlier version stays counted even after an edit re-flags that user as unread. */
  totalAcknowledged: number;
  readPercentage: number;
  recipients: NoticeRecipient[];
}

export interface NoticeDashboardData {
  unread: Notice[];
  pinned: Notice[];
  recent: Notice[];
  expiring: Notice[];
  counts: { unread: number; pinned: number; active: number; expiring: number };
  generatedAt: string;
}

export interface CreateNoticeInput {
  title: string;
  body: string;
  categoryId: number;
  priority?: NoticePriority;
  isPinned?: boolean;
  isImportant?: boolean;
  expiresAt?: string | null;
  audienceType?: 'company' | 'departments';
  targetDepartments?: string[];
  status?: 'draft' | 'published';
}

export type NoticeScope = 'active' | 'archived' | 'expired' | 'drafts';

/* ── Notices ─────────────────────────────────────────────────────────────── */

export async function fetchNoticeDashboard(recentLimit?: number): Promise<NoticeDashboardData> {
  const qs = recentLimit ? `?recentLimit=${recentLimit}` : '';
  const r = await apiClient.get<NoticeDashboardData>(`/notices/dashboard${qs}`);
  return r.data;
}

export async function createNotice(input: CreateNoticeInput): Promise<Notice> {
  const r = await apiClient.post<Notice>('/notices', input);
  return r.data;
}

export async function updateNotice(id: number, input: Partial<CreateNoticeInput>): Promise<Notice> {
  const r = await apiClient.put<Notice>(`/notices/${id}`, input);
  return r.data;
}

export async function deleteNotice(id: number): Promise<{ success: boolean }> {
  const r = await apiClient.delete<{ success: boolean }>(`/notices/${id}`);
  return r.data;
}

/** Flat scoped list — powers search + the archived / expired / drafts views. */
export async function fetchNotices(scope: NoticeScope = 'active'): Promise<Notice[]> {
  const r = await apiClient.get<Notice[]>(`/notices?scope=${scope}`);
  return r.data;
}

export async function publishNotice(id: number): Promise<Notice> {
  const r = await apiClient.post<Notice>(`/notices/${id}/publish`);
  return r.data;
}

export async function archiveNotice(id: number): Promise<Notice> {
  const r = await apiClient.post<Notice>(`/notices/${id}/archive`);
  return r.data;
}

export async function markNoticeRead(id: number): Promise<{ success: boolean }> {
  const r = await apiClient.post<{ success: boolean }>(`/notices/${id}/read`);
  return r.data;
}

/* ── Audience + acknowledgement ──────────────────────────────────────────── */

/** Distinct HR departments — the dynamic audience "master" (no hardcoded list). */
export async function fetchNoticeDepartments(): Promise<string[]> {
  const r = await apiClient.get<string[]>('/notices/audience/departments');
  return r.data;
}

export async function acknowledgeNotice(id: number): Promise<{ success: boolean; acknowledgedAt: string }> {
  const r = await apiClient.post<{ success: boolean; acknowledgedAt: string }>(`/notices/${id}/acknowledge`);
  return r.data;
}

/** Management acknowledgement tracking (needs notice.manage). */
export async function fetchNoticeAcknowledgements(id: number): Promise<NoticeAckStats> {
  const r = await apiClient.get<NoticeAckStats>(`/notices/${id}/acknowledgements`);
  return r.data;
}

/* ── Attachments (files + external links) ────────────────────────────────── */

export async function uploadNoticeAttachments(
  id: number, formData: FormData,
): Promise<{ success: boolean; attachments: NoticeAttachment[] }> {
  const r = await apiClient.post<{ success: boolean; attachments: NoticeAttachment[] }>(
    `/notices/${id}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return r.data;
}

export async function addNoticeLink(
  id: number, input: { url: string; label?: string },
): Promise<{ success: boolean; attachment: NoticeAttachment }> {
  const r = await apiClient.post<{ success: boolean; attachment: NoticeAttachment }>(`/notices/${id}/links`, input);
  return r.data;
}

export async function deleteNoticeAttachment(id: number, attachmentId: number): Promise<{ success: boolean }> {
  const r = await apiClient.delete<{ success: boolean }>(`/notices/${id}/attachments/${attachmentId}`);
  return r.data;
}

/* ── Categories ──────────────────────────────────────────────────────────── */

export async function fetchNoticeCategories(): Promise<NoticeCategory[]> {
  const r = await apiClient.get<NoticeCategory[]>('/notices/categories');
  return r.data;
}

export async function createNoticeCategory(
  input: { name: string; color?: string; icon?: string | null },
): Promise<NoticeCategory> {
  const r = await apiClient.post<NoticeCategory>('/notices/categories', input);
  return r.data;
}

export async function updateNoticeCategory(
  id: number,
  input: { name?: string; color?: string; icon?: string | null; isActive?: boolean },
): Promise<NoticeCategory> {
  const r = await apiClient.put<NoticeCategory>(`/notices/categories/${id}`, input);
  return r.data;
}

export async function reorderNoticeCategories(orderedIds: number[]): Promise<NoticeCategory[]> {
  const r = await apiClient.put<NoticeCategory[]>('/notices/categories/reorder', { orderedIds });
  return r.data;
}

export async function deleteNoticeCategory(id: number): Promise<{ success: boolean }> {
  const r = await apiClient.delete<{ success: boolean }>(`/notices/categories/${id}`);
  return r.data;
}
