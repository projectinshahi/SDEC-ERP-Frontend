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
/** M02 Content Types. Poster/Carousel are design-side; Reel/Video are shoot-side. */
export const CONTENT_FORMATS = ['poster', 'carousel', 'reel', 'video'] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];
/** Which production field set a Content Type shows — the single source for the
 *  conditional form sections and for the list badge grouping. */
export const isDesignType = (t?: string | null) => t === 'poster' || t === 'carousel';
export const isShootType = (t?: string | null) => t === 'reel' || t === 'video';
export const CONTENT_OBJECTIVES = [
  'Lead Generation', 'Brand Awareness', 'Engagement', 'Traffic', 'Conversions', 'Recruitment', 'Other',
] as const;

/** Production data — both sets travel together; neither is cleared on type switch. */
export interface ProductionData {
  design?: { dimensions?: string | null; slideCount?: number | null; designReference?: string | null };
  shoot?: {
    location?: string | null; props?: string | null; equipment?: string | null;
    shootDate?: string | null; editDeadline?: string | null;
  };
}

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
  /** M03 Strategy narrative. CTA + Content Pillar are NOT here — they are the
   *  existing `cta` / `pillar_id` fields shared with Basics (one source of truth). */
  strategy_data?: { coreMessage?: string | null; hook?: string | null; notes?: string | null } | null;
  /** M04 Creative Direction (separate concept from Production Briefing). */
  creative_direction?: {
    styleTone?: string | null; styleToneCustom?: string | null;
    visualReferences?: string[]; brandRequirements?: string | null; specialInstructions?: string | null;
  } | null;
  /** M04 team roles — owned by the Team section, DISPLAYED read-only in Production. */
  scriptwriter_id?: number | null;
  talent_id?: number | null;
  approver_id?: number | null;
  approverName?: string | null;
  scriptwriterName?: string | null;
  talentName?: string | null;
  production_ready?: boolean;
  production_ready_by?: number | null;
  production_ready_at?: string | null;
  productionReadyByName?: string | null;
  strategy_ready?: boolean;
  strategy_ready_by?: number | null;
  strategy_ready_at?: string | null;
  copy_ready?: boolean;
  copy_ready_by?: number | null;
  copy_ready_at?: string | null;
  strategyReadyByName?: string | null;
  copyReadyByName?: string | null;
  /** Server-generated, unique, read-only (e.g. "CNT-00042"). */
  content_id?: string | null;
  client_id?: number | null;
  category_id?: number | null;
  pillar_id?: number | null;
  campaign_id?: number | null;
  platforms?: string[];
  archived?: boolean;
  production_data?: ProductionData | null;
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
  /** Recorded deliverable links, loaded with the card detail. */
  workOutputs?: WorkOutput[];
  /** Assigned Approver — the board uses it to gate Stage 7 drag (server enforces). */
  approverId?: number | null;
  /** Earliest real production deadline, computed server-side. */
  nearestDeadline?: string | null;
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

export async function fetchContents(filters: ContentFilters | Record<string, string> = {}): Promise<MarketingContent[]> {
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
  scriptwriterId?: number | null;
  talentId?: number | null;
  approverId?: number | null;
  // M02 classification (all optional; ids come from admin reference data)
  clientId?: number | null;
  categoryId?: number | null;
  pillarId?: number | null;
  campaignId?: number | null;
  /** Platform(s) multi-select. */
  platforms?: string[];
  /** Both production sets travel together — the backend merges per section. */
  productionData?: ProductionData;
}

export async function createContent(payload: CreateContentPayload): Promise<MarketingContent> {
  const res = await apiClient.post<{ success: boolean; content: MarketingContent }>('/marketing/content', payload);
  return res.data.content;
}

/** Sectioned update — send only the fields being saved; the backend authorizes per section. */
export interface UpdateContentPayload extends Partial<CreateContentPayload> {
  /** M04 Creative Direction patch (merged per key server-side). */
  creativeDirection?: Record<string, any>;
  /** M04 production briefing. The SERVER picks the family from the card's
   *  Content Type, so a Poster save can never overwrite stored Reel values. */
  productionFields?: Record<string, any>;
  /** M04 team roles (Team section is the source of truth). */
  scriptwriterId?: number | null;
  approverId?: number | null;
  talentId?: number | null;
  /** M03 Strategy narrative (coreMessage / hook / notes). */
  strategyData?: { coreMessage?: string | null; hook?: string | null; notes?: string | null };
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

/** The ONE stage-transition call. Kanban drag/drop and the detail page selector
 *  both use it, so neither can bypass the server's gates, audit or notifications.
 *  `reason` is mandatory for backward moves (enforced server-side). */
export async function moveContentStage(id: number, stage: string, reason?: string): Promise<MarketingContent> {
  const res = await apiClient.patch<{ success: boolean; content: MarketingContent }>(
    `/marketing/content/${id}/stage`, reason ? { stage, reason } : { stage },
  );
  return res.data.content;
}

/** Canonical stage index — the single ordering source for direction checks. */
export const stageIndex = (key: string) => CONTENT_STAGES.findIndex((s) => s.key === key);
export const isBackwardMove = (from: string, to: string) => {
  const f = stageIndex(from), t = stageIndex(to);
  return f > -1 && t > -1 && t < f;
};
export const REVIEW_STAGE_KEY = 'review';

/* -- M07 Review & Approval ------------------------------------------------- */

/** The four decision states. 'pending' is the default, not a decision. */
export const APPROVAL_STATUSES = ['pending', 'approved', 'changes_requested', 'rejected'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  changes_requested: 'Changes Requested',
  rejected: 'Rejected',
};

/** Outcomes that require Revision Notes - mirrors the server rule exactly. */
export const NOTES_REQUIRED: readonly ApprovalStatus[] = ['changes_requested', 'rejected'];

/** Where each outcome routes the card. Display only; the server does the move. */
export const OUTCOME_STAGE_LABEL: Record<ApprovalStatus, string | null> = {
  pending: null,
  approved: 'Scheduled',
  changes_requested: 'Editing',
  rejected: 'Strategy & Planning',
};

export interface ReviewChecklistItem {
  key: string;
  label: string;
  checked: boolean;
  checkedBy: number | null;
  checkedByName: string | null;
  checkedAt: string | null;
}

export interface ReviewChecklistState {
  stage: string;
  /** True only while the card is in Review / Approval. */
  applies: boolean;
  items: ReviewChecklistItem[];
  complete: boolean;
}

export async function fetchReviewChecklist(contentId: number): Promise<ReviewChecklistState> {
  const res = await apiClient.get<{ success: boolean } & ReviewChecklistState>(
    `/marketing/content/${contentId}/review-checklist`,
  );
  return {
    stage: res.data?.stage ?? '',
    applies: res.data?.applies ?? false,
    items: res.data?.items ?? [],
    complete: res.data?.complete ?? false,
  };
}

/** Actor and timestamp are NOT sent - the server derives both. */
export async function setReviewChecklistItem(
  contentId: number, item: string, checked: boolean,
): Promise<ReviewChecklistState> {
  const res = await apiClient.patch<{ success: boolean } & ReviewChecklistState>(
    `/marketing/content/${contentId}/review-checklist`, { item, checked },
  );
  return {
    stage: res.data?.stage ?? '',
    applies: res.data?.applies ?? false,
    items: res.data?.items ?? [],
    complete: res.data?.complete ?? false,
  };
}

export interface RevisionEntry {
  id: number;
  /** 'decision' for an approver action, 'response_note' for an owner reply. */
  entryType?: 'decision' | 'response_note';
  decision: string;
  decisionLabel: string;
  revisionNotes: string | null;
  fromStage: string | null;
  toStage: string | null;
  checklistReset: boolean;
  approverId: number;
  approverName: string | null;
  createdAt: string;
}

export interface ChecklistAuditEntry {
  id: number;
  item: string | null;
  itemLabel: string | null;
  checked: boolean;
  actorId: number;
  actorName: string | null;
  createdAt: string;
}

/** Append-only, read-only. There is no write counterpart by design. */
export async function fetchRevisionHistory(
  contentId: number,
): Promise<{ revisions: RevisionEntry[]; checklistAudit: ChecklistAuditEntry[] }> {
  const res = await apiClient.get<{ success: boolean; revisions: RevisionEntry[]; checklistAudit: ChecklistAuditEntry[] }>(
    `/marketing/content/${contentId}/revisions`,
  );
  return { revisions: res.data?.revisions ?? [], checklistAudit: res.data?.checklistAudit ?? [] };
}

/**
 * Submit an approval decision. Revision Notes are mandatory for
 * changes_requested / rejected; the SERVER enforces that, plus checklist
 * completeness, the assigned-Approver rule and the stage routing.
 */
export async function setContentApproval(
  id: number, status: ApprovalStatus, revisionNotes?: string,
): Promise<MarketingContent> {
  const res = await apiClient.patch<{ success: boolean; content: MarketingContent }>(
    `/marketing/content/${id}/approval`, { status, revisionNotes },
  );
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

/* ── M04 #27: Work Output links ────────────────────────────────────────────── */

export interface WorkOutput {
  id: number;
  contentId: number;
  label: string;
  url: string;
  /** Server-derived: the authenticated user who recorded the link. */
  addedBy: number | null;
  addedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchWorkOutputs(contentId: number): Promise<WorkOutput[]> {
  const res = await apiClient.get<{ success: boolean; workOutputs: WorkOutput[] }>(
    `/marketing/content/${contentId}/work-outputs`,
  );
  return res.data?.workOutputs ?? [];
}

/** Author and timestamp are NOT sent — the server derives both. */
export async function addWorkOutput(contentId: number, label: string, url: string): Promise<WorkOutput> {
  const res = await apiClient.post<{ success: boolean; workOutput: WorkOutput }>(
    `/marketing/content/${contentId}/work-outputs`,
    { label, url },
  );
  return res.data.workOutput;
}

export async function updateWorkOutput(contentId: number, workOutputId: number, label: string, url: string): Promise<WorkOutput> {
  const res = await apiClient.put<{ success: boolean; workOutput: WorkOutput }>(
    `/marketing/content/${contentId}/work-outputs/${workOutputId}`,
    { label, url },
  );
  return res.data.workOutput;
}

export async function deleteWorkOutput(contentId: number, workOutputId: number): Promise<void> {
  await apiClient.delete(`/marketing/content/${contentId}/work-outputs/${workOutputId}`);
}

/* ── M02: admin reference data + Content Card list ─────────────────────────── */

export interface ReferenceItem { id: number; name: string; active: boolean; sort_order: number }
export interface ReferenceData {
  clients: ReferenceItem[];
  categories: ReferenceItem[];
  pillars: ReferenceItem[];
  campaigns: ReferenceItem[];
  /** M10 #43 — Platforms and Objectives are admin-managed lists too. Their
   *  `name` IS the stored value, so a card keeps its value after deactivation. */
  platforms: ReferenceItem[];
  objectives: ReferenceItem[];
}

/** The six admin-managed lists, in the order the Administration UI shows them. */
export const REFERENCE_TABLES = [
  { key: 'categories', label: 'Content Categories' },
  { key: 'pillars', label: 'Content Pillars' },
  { key: 'platforms', label: 'Platforms' },
  { key: 'clients', label: 'Clients / Brands' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'objectives', label: 'Objectives' },
] as const;

/** ONE request for all four dropdown sources (no four-call waterfall). */
export async function fetchReferenceData(): Promise<ReferenceData> {
  const res = await apiClient.get<{ success: boolean } & ReferenceData>('/marketing/reference-data');
  return {
    clients: res.data?.clients ?? [],
    categories: res.data?.categories ?? [],
    pillars: res.data?.pillars ?? [],
    campaigns: res.data?.campaigns ?? [],
    platforms: res.data?.platforms ?? [],
    objectives: res.data?.objectives ?? [],
  };
}

/** Admin view — includes deactivated rows so they can be reactivated. */
export async function fetchAllReferenceData(): Promise<ReferenceData> {
  const res = await apiClient.get<{ success: boolean } & ReferenceData>('/marketing/reference-data?includeInactive=true');
  return {
    clients: res.data?.clients ?? [],
    categories: res.data?.categories ?? [],
    pillars: res.data?.pillars ?? [],
    campaigns: res.data?.campaigns ?? [],
    platforms: res.data?.platforms ?? [],
    objectives: res.data?.objectives ?? [],
  };
}

export type ReferenceTable = (typeof REFERENCE_TABLES)[number]['key'];

/* ── M10 #45: notification event settings (admin) ──────────────────────────── */

export interface ContentNotificationSettings {
  assignment_enabled: boolean;
  stage_enabled: boolean;
  approver_enabled: boolean;
  decision_enabled: boolean;
  [key: string]: boolean;
}

export async function fetchNotificationSettings(): Promise<ContentNotificationSettings> {
  const res = await apiClient.get<{ success: boolean; settings: ContentNotificationSettings }>(
    '/marketing/notification-settings',
  );
  return res.data.settings;
}

/** Partial update: only the toggles sent are changed, so the four stay independent. */
export async function saveNotificationSettings(
  patch: Partial<ContentNotificationSettings>,
): Promise<ContentNotificationSettings> {
  const res = await apiClient.put<{ success: boolean; settings: ContentNotificationSettings }>(
    '/marketing/notification-settings', patch,
  );
  return res.data.settings;
}

export async function createReferenceItem(table: ReferenceTable, name: string): Promise<ReferenceItem> {
  const res = await apiClient.post<{ success: boolean; item: ReferenceItem }>(`/marketing/reference-data/${table}`, { name });
  return res.data.item;
}

export async function updateReferenceItem(
  table: ReferenceTable,
  id: number,
  patch: { name?: string; active?: boolean; sort_order?: number },
): Promise<ReferenceItem> {
  const res = await apiClient.put<{ success: boolean; item: ReferenceItem }>(`/marketing/reference-data/${table}/${id}`, patch);
  return res.data.item;
}

/** One row of the Content Card table view. */
export interface ContentListRow {
  id: number;
  contentId: string | null;
  title: string;
  format: string | null;
  priority: string;
  platforms: string[];
  stage: string;
  stageLabel: string;
  ownerId: number | null;
  ownerName: string | null;
  designerName?: string | null;
  videographerName?: string | null;
  editorName?: string | null;
  approverId?: number | null;
  objective?: string | null;
  nearestDeadline: string | null; // YYYY-MM-DD
  createdAt?: string;
  clientId?: number | null;
  archived: boolean;
}

/** Active (non-archived) cards. Archived rows are excluded server-side. */
/** Shared board filters (see lib/marketing/contentBoardFilters) + optional
 *  hasDeadline for the Deadline view. Same param names the Kanban query uses. */
export async function fetchContentList(params: Record<string, string> = {}): Promise<ContentListRow[]> {
  const qs = new URLSearchParams(params).toString();
  const res = await apiClient.get<{ success: boolean; contents: ContentListRow[] }>(
    `/marketing/content/list${qs ? `?${qs}` : ''}`,
  );
  return res.data?.contents ?? [];
}

/* ── M06 #29: stage history (reads the existing activity audit) ────────────── */

export interface StageHistoryEntry {
  id: number;
  blocked: boolean;
  from: string | null;
  fromLabel: string | null;
  to: string | null;
  toLabel: string | null;
  reason: string | null;
  denied: string | null;
  actorId: number;
  actorName: string | null;
  createdAt: string;
}

export async function fetchStageHistory(contentId: number): Promise<StageHistoryEntry[]> {
  const res = await apiClient.get<{ success: boolean; history: StageHistoryEntry[] }>(
    `/marketing/content/${contentId}/history`,
  );
  return res.data?.history ?? [];
}

/* ── M03 readiness gates ───────────────────────────────────────────────────── */

/** Flip a workflow gate. The server re-checks the actor AND the legality of the
 *  transition, so this is an affordance — never the enforcement point. */
/* ── M09 Resubmission (#40) + Performance (#41) ────────────────────────────── */

/**
 * Resubmit after Changes Requested. The response note is OPTIONAL — an empty
 * one is simply not recorded and never blocks the move. The SERVER verifies the
 * Content Owner, the stage and that changes were actually requested.
 */
export async function resubmitForReview(
  id: number, responseNote?: string,
): Promise<{ content: MarketingContent; responseNoteRecorded: boolean }> {
  const res = await apiClient.patch<{ success: boolean; content: MarketingContent; responseNoteRecorded: boolean }>(
    `/marketing/content/${id}/resubmit`, responseNote ? { responseNote } : {},
  );
  return { content: res.data.content, responseNoteRecorded: res.data.responseNoteRecorded };
}

export interface PerformanceField {
  key: string;
  label: string;
  unit: string | null;
  currency: boolean;
}

export interface PerformanceSchema {
  stage: string;
  /** Metric definitions ALREADY filtered to the card's Content Type by the
   *  server — Watch Time simply is not in the list for a Poster. */
  metrics: PerformanceField[];
  notesKey: string;
  editable: boolean;
  hasPerformanceData: boolean;
}

export async function fetchPerformanceSchema(id: number): Promise<PerformanceSchema> {
  const res = await apiClient.get<{ success: boolean } & PerformanceSchema>(`/marketing/content/${id}/performance`);
  return {
    stage: res.data?.stage ?? '',
    metrics: res.data?.metrics ?? [],
    notesKey: res.data?.notesKey ?? 'learnings',
    editable: res.data?.editable ?? false,
    hasPerformanceData: res.data?.hasPerformanceData ?? false,
  };
}

/**
 * Partial save: only the keys sent are touched. '' clears a metric back to the
 * missing state; 0 stores a real zero. Negatives and text are rejected server-side.
 */
export async function saveContentMetrics(
  id: number, metrics: Record<string, string | number | null>,
): Promise<MarketingContent> {
  const res = await apiClient.patch<{ success: boolean; content: MarketingContent }>(
    `/marketing/content/${id}/metrics`, { metrics },
  );
  return res.data.content;
}

/* ── M08 Scheduling (#38) + Publishing Record (#39) ────────────────────────── */

export interface ScheduleData {
  /** Multi-select. `platform` is the legacy single value, kept in step. */
  platforms?: string[];
  platform?: string | null;
  date?: string | null;   // YYYY-MM-DD — planned date, never a Date object
  time?: string | null;   // HH:MM — optional
  caption?: string | null;
  hashtags?: string[];
  scheduled?: boolean;
  scheduledAt?: string | null;
  scheduledBy?: number | null;
  captionReady?: boolean;
}

export interface PublishedLink { done?: boolean; url?: string | null }

/** The actual publication event — server-written, never sent by the client. */
export interface PublishRecord {
  publishedAt?: string | null;
  publishedBy?: number | null;
}

/**
 * What may be SENT when saving a schedule. Hashtags accept either the stored
 * list or the raw text a user typed — the server normalises both into one
 * canonical list, so the UI never has to parse them.
 */
export interface ScheduleInput extends Omit<ScheduleData, 'hashtags'> {
  hashtags?: string[] | string;
}

/**
 * Save the scheduling record. Pass `markScheduled` to also move the card to
 * Stage 8 — the SERVER validates the Publishing Date and owns the transition.
 */
export async function saveContentSchedule(
  id: number, scheduleData: ScheduleInput, markScheduled = false,
): Promise<MarketingContent> {
  const res = await apiClient.patch<{ success: boolean; content: MarketingContent }>(
    `/marketing/content/${id}/schedule`, { scheduleData, markScheduled },
  );
  return res.data.content;
}

/**
 * Record the publication and move to Stage 9. `publishedAt` is NOT sent: the
 * server stamps it from its own clock and refuses a second publication.
 */
export async function markContentPublished(
  id: number, publishedLinks: Record<string, PublishedLink>,
): Promise<{ content: MarketingContent; publishRecord: PublishRecord }> {
  const res = await apiClient.patch<{ success: boolean; content: MarketingContent; publishRecord: PublishRecord }>(
    `/marketing/content/${id}/publish`, { publishedLinks },
  );
  return { content: res.data.content, publishRecord: res.data.publishRecord };
}

export async function setContentReadiness(
  id: number,
  gate: 'strategy' | 'copy' | 'production',
  ready: boolean,
): Promise<MarketingContent> {
  const res = await apiClient.patch<{ success: boolean; content: MarketingContent }>(
    `/marketing/content/${id}/readiness`, { gate, ready },
  );
  return res.data.content;
}

/** Mirrors the server rules so the UI shows the same locks (display only). */
export const canEditStrategyUi = (has: (k: any) => boolean) => has('marketing.content.edit');
export const canToggleReadyUi = (has: (k: any) => boolean) => has('marketing.content.approve');
/** Copy is locked until Strategy is Ready — a workflow gate, so it applies to
 *  everyone including Admin, exactly as the backend enforces. */
export const isCopyUnlocked = (c: { strategy_ready?: boolean } | null) => !!c?.strategy_ready;

/** M04 Creative Style / Tone presets (free text is allowed alongside). */
export const STYLE_TONE_PRESETS = ['minimal', 'corporate', 'cinematic', 'funny', 'premium'] as const;


/* ── M10 #46 audit log + #47/#48 CSV exports ───────────────────────────────── */

export interface AuditEntry {
  id: number;
  type: string;
  typeLabel: string;
  description: string;
  actorId: number;
  actorName: string | null;
  contentId: number | null;
  fromStageLabel: string | null;
  toStageLabel: string | null;
  decision: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AuditPage {
  entries: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
  types: { key: string; label: string }[];
}

export async function fetchAuditLog(params: Record<string, string> = {}): Promise<AuditPage> {
  const qs = new URLSearchParams(params).toString();
  const res = await apiClient.get<{ success: boolean } & AuditPage>(`/marketing/audit${qs ? `?${qs}` : ''}`);
  return {
    entries: res.data?.entries ?? [],
    total: res.data?.total ?? 0,
    limit: res.data?.limit ?? 100,
    offset: res.data?.offset ?? 0,
    types: res.data?.types ?? [],
  };
}

/**
 * Trigger a CSV download. The SERVER builds the file from the same filtered
 * query the view uses and names it, so the browser only has to save the bytes —
 * there is no second, client-side notion of what a row or a filename is.
 */
export async function downloadContentExport(
  kind: 'content-cards' | 'deadlines', params: Record<string, string> = {},
): Promise<void> {
  const qs = new URLSearchParams(params).toString();
  const res = await apiClient.get(`/marketing/export/${kind}${qs ? `?${qs}` : ''}`, { responseType: 'blob' });
  const disposition = String(res.headers?.['content-disposition'] ?? '');
  const fallback = kind === 'deadlines' ? 'deadline_list_export.csv' : 'content_cards_export.csv';
  const name = /filename="?([^"]+)"?/.exec(disposition)?.[1] ?? fallback;
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
