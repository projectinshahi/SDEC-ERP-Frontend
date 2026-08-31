import { apiClient } from './api-client';

/* ── Marketing → Content Production Kanban API ────────────────────────────────
 * Thin client over /marketing/content. Stage keys are the backend's fixed
 * workflow; 'blocked' is a separate parking column, never part of the linear
 * flow. NOTE: apiClient.get returns an AxiosResponse — read `.data`. */

export const CONTENT_STAGES = [
  { key: 'idea', label: 'Ideas / Backlog' },
  { key: 'strategy', label: 'Strategy & Planning' },
  { key: 'script', label: 'Script / Copy' },
  { key: 'design', label: 'Creative / Design' },
  { key: 'production', label: 'Production' },
  { key: 'editing', label: 'Editing' },
  { key: 'review', label: 'Review / Approval' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'published', label: 'Published' },
  { key: 'analytics', label: 'Performance / Analytics' },
] as const;
export const BLOCKED_STAGE = { key: 'blocked', label: 'Blocked / Waiting' } as const;

export const CONTENT_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const CONTENT_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'youtube', 'other'] as const;
export const CONTENT_FORMATS = ['reel', 'carousel', 'poster', 'video', 'story', 'blog', 'email', 'other'] as const;
export const CONTENT_OBJECTIVES = [
  'Lead Generation', 'Brand Awareness', 'Engagement', 'Traffic', 'Conversions', 'Recruitment', 'Other',
] as const;

export interface ContentAttachment {
  id: number;
  content_id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string | null;
  uploaded_by: number | null;
  uploaded_at: string;
  uploaderName?: string | null;
}

export interface MarketingContent {
  id: number;
  title: string;
  description: string | null;
  format: string | null;
  stage: string;
  priority: string;
  objective: string | null;
  target_audience: string | null;
  platform: string | null;
  cta: string | null;
  references_text: string | null;
  notes: string | null;
  deadline: string | null; // YYYY-MM-DD
  owner_id: number | null;
  designer_id: number | null;
  videographer_id: number | null;
  editor_id: number | null;
  /** {script, caption, hook, voiceover} */
  copy_data: Record<string, any> | null;
  /** Per-stage checklists: strategy/design/production/editing/review/schedule/published */
  stage_data: Record<string, any> | null;
  /** Only actually-recorded values: {reach, views, engagement, leads, conversion, learnings} */
  metrics: Record<string, any> | null;
  approval_status: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  ownerName?: string | null;
  designerName?: string | null;
  videographerName?: string | null;
  editorName?: string | null;
  createdByName?: string | null;
  attachmentCount?: number;
  attachments?: ContentAttachment[];
}

export interface ContentFilters {
  search?: string;
  stage?: string;
  ownerId?: string | number;
  designerId?: string | number;
  videographerId?: string | number;
  editorId?: string | number;
  platform?: string;
  priority?: string;
  objective?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
}

export async function fetchContents(filters: ContentFilters = {}): Promise<MarketingContent[]> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && String(v).trim() !== '' && v !== 'all') params.set(k, String(v));
  }
  const qs = params.toString();
  const res = await apiClient.get<{ success: boolean; contents: MarketingContent[] }>(
    `/marketing/content${qs ? `?${qs}` : ''}`,
  );
  return res.data?.contents ?? [];
}

export async function fetchContent(id: number): Promise<MarketingContent> {
  const res = await apiClient.get<{ success: boolean; content: MarketingContent }>(`/marketing/content/${id}`);
  return res.data.content;
}

export interface CreateContentPayload {
  title: string;
  description?: string;
  format?: string;
  stage?: string;
  priority?: string;
  objective?: string;
  targetAudience?: string;
  platform?: string;
  cta?: string;
  references?: string;
  notes?: string;
  deadline?: string;
  ownerId?: number | null;
  designerId?: number | null;
  videographerId?: number | null;
  editorId?: number | null;
}

export async function createContent(payload: CreateContentPayload): Promise<MarketingContent> {
  const res = await apiClient.post<{ success: boolean; content: MarketingContent }>('/marketing/content', payload);
  return res.data.content;
}

/** Sectioned update — send only the fields being saved; the backend authorizes per section. */
export interface UpdateContentPayload extends Partial<CreateContentPayload> {
  copyData?: Record<string, any>;
  stageData?: Record<string, any>;
  scheduleData?: Record<string, any>;
  publishedData?: Record<string, any>;
  metrics?: Record<string, any>;
}

export async function updateContent(id: number, payload: UpdateContentPayload): Promise<MarketingContent> {
  const res = await apiClient.put<{ success: boolean; content: MarketingContent }>(`/marketing/content/${id}`, payload);
  return res.data.content;
}

export async function moveContentStage(id: number, stage: string): Promise<MarketingContent> {
  const res = await apiClient.patch<{ success: boolean; content: MarketingContent }>(`/marketing/content/${id}/stage`, { stage });
  return res.data.content;
}

export async function setContentApproval(id: number, status: 'approved' | 'rejected' | 'pending', note?: string): Promise<MarketingContent> {
  const res = await apiClient.patch<{ success: boolean; content: MarketingContent }>(`/marketing/content/${id}/approval`, { status, note });
  return res.data.content;
}

export async function deleteContent(id: number): Promise<void> {
  await apiClient.delete(`/marketing/content/${id}`);
}

export async function uploadContentAttachments(id: number, files: File[]): Promise<ContentAttachment[]> {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  // No manual Content-Type — the api-client interceptor strips it for FormData
  // so the browser sets the multipart boundary (iOS-safe).
  const res = await apiClient.post<{ success: boolean; attachments: ContentAttachment[] }>(
    `/marketing/content/${id}/attachments`,
    form,
  );
  return res.data?.attachments ?? [];
}

export async function deleteContentAttachment(contentId: number, attachmentId: number): Promise<void> {
  await apiClient.delete(`/marketing/content/${contentId}/attachments/${attachmentId}`);
}
