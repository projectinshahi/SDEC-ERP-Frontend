'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, Trash2, Paperclip, Upload, X, CheckCircle2, XCircle,
  FileText, Users as UsersIcon, PenLine, Palette, Clapperboard, Scissors,
  ShieldCheck, CalendarClock, Send, BarChart3, Lightbulb, Lock, CheckCircle, Plus, Link2, Sparkles, Wrench, History,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { formatINR } from '@/lib/utils/currency';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { fetchUsers, type UserDbResponse } from '@/lib/api/users';
import { StageBackReasonModal, type StageBackRequest } from '@/components/marketing/StageBackReasonModal';
import { CardDetailSkeleton, ListSkeleton } from '@/components/marketing/ContentSkeletons';
import { FieldError } from '@/components/marketing/FieldError';
import {
  collect, hasErrors, requiredText, validUrl, validDate, validTime,
  dateOrder, nonNegativeNumber, fieldErrorsFromApi, invalidInputCls,
  type FieldErrors,
} from '@/lib/marketing/contentValidation';
import {
  ReviewChecklist, ApproverReadOnlyView, ApprovalActionPanel, ApprovalStatusBadge,
} from '@/components/marketing/ReviewApprovalPanel';
import {
  fetchContent, updateContent, moveContentStage, setContentApproval, deleteContent,
  uploadContentAttachments, deleteContentAttachment,
  CONTENT_STAGES, BLOCKED_STAGE, CONTENT_PRIORITIES, CONTENT_PLATFORMS, CONTENT_FORMATS, CONTENT_OBJECTIVES,
  setContentReadiness,
  fetchReferenceData,
  isCopyUnlocked,
  isBackwardMove,
  fetchWorkOutputs, addWorkOutput, updateWorkOutput, deleteWorkOutput, type WorkOutput,
  fetchStageHistory, type StageHistoryEntry,
  saveContentSchedule, markContentPublished,
  resubmitForReview, fetchPerformanceSchema, saveContentMetrics,
  type PerformanceSchema,
  fetchReviewChecklist, setReviewChecklistItem, fetchRevisionHistory,
  type ReviewChecklistState, type ReviewChecklistItem, type RevisionEntry, type ApprovalStatus,
  isDesignType,
  isShootType,
  STYLE_TONE_PRESETS,
  type ReferenceItem, type ReferenceData,
  type MarketingContent,
} from '@/lib/api/marketingContent';

const ALL_STAGES = [...CONTENT_STAGES, BLOCKED_STAGE];
/** Human stage name for toast copy — never a raw key. */
const stageLabelOf = (key: string) => ALL_STAGES.find((s) => s.key === key)?.label ?? key;
const cap = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30';
const labelCls = 'mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300';

/** The message the shared api-client puts on a rejected request. */
const apiError = (e: unknown): string | undefined => (e as { details?: { error?: string } } | null)?.details?.error;

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
};

/* Per-stage tracked checklist items (persisted under stage_data.<section>). */
const CHECKLISTS: { section: string; title: string; icon: any; items: { key: string; label: string }[] }[] = [
  {
    section: 'strategy', title: 'Strategy & Planning', icon: FileText,
    items: [
      { key: 'topicApproved', label: 'Topic approved' },
      { key: 'objectiveSet', label: 'Content objective defined' },
      { key: 'audienceSet', label: 'Target audience defined' },
      { key: 'formatDecided', label: 'Format decided' },
      { key: 'ctaDecided', label: 'CTA decided' },
    ],
  },
  {
    section: 'design', title: 'Creative / Design', icon: Palette,
    items: [
      { key: 'posterDesign', label: 'Poster / carousel design' },
      { key: 'thumbnail', label: 'Thumbnail / cover' },
      { key: 'visualAssets', label: 'Visual assets ready' },
    ],
  },
  {
    section: 'production', title: 'Production', icon: Clapperboard,
    items: [
      { key: 'shootPending', label: 'Shoot pending' },
      { key: 'shootCompleted', label: 'Shoot completed' },
      { key: 'assetsCollected', label: 'Assets collected' },
    ],
  },
  {
    section: 'editing', title: 'Editing', icon: Scissors,
    items: [
      { key: 'firstEdit', label: 'First edit' },
      { key: 'internalReview', label: 'Internal review' },
      { key: 'corrections', label: 'Corrections done' },
    ],
  },
];

/* Publishing uses CONTENT_PLATFORMS — the same list the scheduling form and the
 * server-side validation use, so a platform can never be schedulable but not
 * publishable. (The old local subset was a second, drifting copy.) */

/** Card wrapper for one detail section. */
function Section({ icon: Icon, title, children, action }: { icon: any; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
          <Icon className="h-4 w-4 text-cyan-600" /> {title}
        </h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SaveButton({ saving, onClick, disabled }: { saving: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving || disabled}
      className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
    >
      {saving && <Loader2 className="h-3 w-3 animate-spin" />} Save
    </button>
  );
}

export default function ContentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const router = useRouter();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();

  // Granular-OR-coarse, mirroring the backend's authorization exactly.
  const canEdit = hasPermission('marketing.content.edit');
  const canMove = hasPermission('marketing.content.move') || canEdit;
  const canAssign = hasPermission('marketing.content.assign') || canEdit;
  const canApprove = hasPermission('marketing.content.approve');
  const canSchedule = hasPermission('marketing.content.schedule') || canEdit;
  const canPublish = hasPermission('marketing.content.publish') || canEdit;
  const canAnalytics = hasPermission('marketing.content.analytics') || canEdit;
  const canDelete = hasPermission('marketing.content.delete');
  // M03: editing Strategy/Copy uses the edit key; flipping a readiness GATE uses
  // the workflow-authority key, so a Writer can author but not declare Ready.
  const canToggleReady = hasPermission('marketing.content.approve');

  const { user } = useAuth();
  const { isSuperAdmin } = usePermissions();
  // Auth exposes the user id as a string; card assignments are numeric ids.
  const currentUserId = user?.id != null ? Number(user.id) : null;

  const [content, setContent] = useState<MarketingContent | null>(null);
  const [users, setUsers] = useState<UserDbResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Editable buffers per section (populated from the loaded content).
  const [core, setCore] = useState<any>({});
  const [team, setTeam] = useState<any>({});
  const [copy, setCopy] = useState<any>({});
  const [checks, setChecks] = useState<Record<string, Record<string, boolean>>>({});
  const [schedule, setSchedule] = useState<any>({});
  const [published, setPublished] = useState<Record<string, { done?: boolean; url?: string }>>({});
  /** Free-text hashtag entry; the server normalises it into the stored list. */
  const [hashtagDraft, setHashtagDraft] = useState('');
  /* Inline field errors per form. Kept separate so an error in one section can
     never blank another section's message, and cleared only when that form is
     resubmitted — the user's typed values are never discarded. */
  const [woErrors, setWoErrors] = useState<FieldErrors>({});
  const [schedErrors, setSchedErrors] = useState<FieldErrors>({});
  const [metricErrors, setMetricErrors] = useState<FieldErrors>({});
  const [prodErrors, setProdErrors] = useState<FieldErrors>({});
  const [copyErrors, setCopyErrors] = useState<FieldErrors>({});
  const [creativeErrors, setCreativeErrors] = useState<FieldErrors>({});
  const [publishErrors, setPublishErrors] = useState<FieldErrors>({});
  /** M09 #40 — optional note the Content Owner adds when resubmitting. */
  const [responseNote, setResponseNote] = useState('');
  /** M09 #41 — metric definitions come from the server ALREADY filtered to the
   *  card's Content Type, so Watch Time is simply absent for a Poster. */
  const [perfSchema, setPerfSchema] = useState<PerformanceSchema | null>(null);
  const [metrics, setMetrics] = useState<any>({});
  const [strategy, setStrategy] = useState<{ coreMessage: string; hook: string; notes: string }>({ coreMessage: '', hook: '', notes: '' });
  const [cta, setCta] = useState('');
  const [pillarId, setPillarId] = useState('');
  const [pillars, setPillars] = useState<ReferenceItem[]>([]);
  const [refLists, setRefLists] = useState<ReferenceData | null>(null);
  const [copyM03, setCopyM03] = useState<{ mainCopy: string; supportingInfo: string; requiredText: string }>({ mainCopy: '', supportingInfo: '', requiredText: '' });
  const [refLinks, setRefLinks] = useState<string[]>([]);
  const [creative, setCreative] = useState<{ styleTone: string; styleToneCustom: string; brandRequirements: string; specialInstructions: string }>(
    { styleTone: '', styleToneCustom: '', brandRequirements: '', specialInstructions: '' });
  const [visualRefs, setVisualRefs] = useState<string[]>([]);
  const [prod, setProd] = useState<Record<string, string>>({});
  const [workOutputs, setWorkOutputs] = useState<WorkOutput[]>([]);
  const [history, setHistory] = useState<StageHistoryEntry[]>([]);
  const [stageBack, setStageBack] = useState<StageBackRequest | null>(null);
  const [checklist, setChecklist] = useState<ReviewChecklistState>({ stage: '', applies: false, items: [], complete: false });
  const [checklistBusy, setChecklistBusy] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<RevisionEntry[]>([]);
  /* Separate in-flight flags per async panel. Without these the empty message
     renders on first paint (the state starts as []), which reads as "no data"
     when the request has not even returned yet. */
  const [historyLoading, setHistoryLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [woForm, setWoForm] = useState<{ id: number | null; label: string; url: string }>({ id: null, label: '', url: '' });
  const [woSaving, setWoSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const hydrate = useCallback((c: MarketingContent) => {
    setContent(c);
    setCore({
      title: c.title, description: c.description ?? '', format: c.format ?? '', priority: c.priority,
      objective: c.objective ?? '', targetAudience: c.target_audience ?? '', platform: c.platform ?? '',
      references: c.references_text ?? '', notes: c.notes ?? '', deadline: c.deadline ?? '',
    });
    setTeam({
      ownerId: c.owner_id ?? '', designerId: c.designer_id ?? '',
      videographerId: c.videographer_id ?? '', editorId: c.editor_id ?? '',
      scriptwriterId: c.scriptwriter_id ?? '', talentId: c.talent_id ?? '', approverId: c.approver_id ?? '',
    });
    setCopy({ script: c.copy_data?.script ?? '', caption: c.copy_data?.caption ?? '', hook: c.copy_data?.hook ?? '', voiceover: c.copy_data?.voiceover ?? '' });
    const sd = c.stage_data ?? {};
    setChecks(Object.fromEntries(CHECKLISTS.map((cl) => [cl.section, { ...(sd[cl.section] ?? {}) }])));
    // M08: platforms is the multi-select; the legacy single `platform` seeds it
    // so a card scheduled before this change keeps its value.
    setSchedule({
      platforms: sd.schedule?.platforms ?? (sd.schedule?.platform ? [sd.schedule.platform] : []),
      platform: sd.schedule?.platform ?? '',
      date: sd.schedule?.date ?? '',
      time: sd.schedule?.time ?? '',
      caption: sd.schedule?.caption ?? '',
      hashtags: sd.schedule?.hashtags ?? [],
      scheduled: !!sd.schedule?.scheduled,
      scheduledAt: sd.schedule?.scheduledAt ?? null,
      captionReady: !!sd.schedule?.captionReady,
    });
    setHashtagDraft((sd.schedule?.hashtags ?? []).join(' '));
    setPublished({ ...(sd.published ?? {}) });
    setMetrics({ ...(c.metrics ?? {}) });
    setStrategy({
      coreMessage: c.strategy_data?.coreMessage ?? '',
      hook: c.strategy_data?.hook ?? '',
      notes: c.strategy_data?.notes ?? '',
    });
    // CTA and Content Pillar come from the SAME fields Basics uses — there is no
    // second copy of either value.
    setCta(c.cta ?? '');
    setPillarId(c.pillar_id ? String(c.pillar_id) : '');
    setCopyM03({
      mainCopy: (c.copy_data as any)?.mainCopy ?? '',
      supportingInfo: (c.copy_data as any)?.supportingInfo ?? '',
      requiredText: (c.copy_data as any)?.requiredText ?? '',
    });
    setRefLinks(Array.isArray((c.copy_data as any)?.referenceLinks) ? [...(c.copy_data as any).referenceLinks] : []);
    setCreative({
      styleTone: c.creative_direction?.styleTone ?? '',
      styleToneCustom: c.creative_direction?.styleToneCustom ?? '',
      brandRequirements: c.creative_direction?.brandRequirements ?? '',
      specialInstructions: c.creative_direction?.specialInstructions ?? '',
    });
    setVisualRefs(Array.isArray(c.creative_direction?.visualReferences) ? [...c.creative_direction!.visualReferences!] : []);
    // Both production families are hydrated; only the active one is rendered, so
    // the hidden set is never lost when Content Type changes.
    const pd = (c.production_data ?? {}) as any;
    setProd({
      dimensions: pd.design?.dimensions ?? '',
      slideCount: pd.design?.slideCount != null ? String(pd.design.slideCount) : '',
      designReference: pd.design?.designReference ?? '',
      firstDraftDeadline: pd.design?.firstDraftDeadline ?? '',
      designFinalDeadline: pd.design?.finalDeadline ?? '',
      location: pd.shoot?.location ?? '',
      props: pd.shoot?.props ?? '',
      equipment: pd.shoot?.equipment ?? '',
      shootDate: pd.shoot?.shootDate ?? '',
      editDeadline: pd.shoot?.editDeadline ?? '',
      shootFinalDeadline: pd.shoot?.finalDeadline ?? '',
    });
    // Work Outputs ship WITH the card, so the list and the Stage 7 affordance
    // can never show a count the server disagrees with.
    setWorkOutputs(c.workOutputs ?? []);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      hydrate(await fetchContent(id));
    } catch (err: any) {
      setError(err?.details?.error || err?.message || 'Failed to load content.');
    } finally {
      setLoading(false);
    }
  }, [id, hydrate]);

  useEffect(() => { if (Number.isInteger(id)) load(); }, [id, load]);
  // Stage history reads the EXISTING activity audit — no second history store.
  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    fetchStageHistory(id)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [id]);
  useEffect(() => { if (Number.isInteger(id)) loadHistory(); }, [id, loadHistory]);
  // M07: the checklist and the revision log are read from the server, so the
  // approval affordances are driven by persisted state, never by local guesses.
  const loadReview = useCallback(() => {
    setReviewLoading(true);
    Promise.all([
      fetchReviewChecklist(id).then(setChecklist).catch(() => undefined),
      fetchRevisionHistory(id).then((r) => setRevisions(r.revisions)).catch(() => setRevisions([])),
    ]).finally(() => setReviewLoading(false));
  }, [id]);
  useEffect(() => { if (Number.isInteger(id)) loadReview(); }, [id, loadReview]);
  const loadPerformance = useCallback(() => {
    fetchPerformanceSchema(id).then(setPerfSchema).catch(() => setPerfSchema(null));
  }, [id]);
  useEffect(() => { if (Number.isInteger(id)) loadPerformance(); }, [id, loadPerformance]);
  useEffect(() => { fetchUsers('marketing').then(setUsers).catch(() => setUsers([])); }, []);
  // Content Pillar options come from the SAME admin reference data the Basics
  // form uses — one request, no duplicate source.
  /* Keep the WHOLE reference payload: Objective and Platform are admin-managed
     lists too (M10 #43), so a deactivated value must disappear from this page's
     selects exactly as it does from the Create form. */
  useEffect(() => {
    fetchReferenceData()
      .then((d) => { setPillars(d.pillars); setRefLists(d); })
      .catch(() => { setPillars([]); setRefLists(null); });
  }, []);

  /**
   * ONE option list, rendered by BOTH Content Pillar controls. Reference data is
   * active-only, so a pillar that an admin deactivated after the card was
   * created is kept as an explicit option — otherwise the select would fall back
   * to "Not set" and the next save would silently wipe the stored value.
   */
  /* Same rule as the Create form: prefer the admin-managed list, fall back to
     the constants only when the list has not been populated. `null` means the
     request has not returned yet, so nothing stale is offered meanwhile. */
  const objectiveOptions = useMemo(
    () => (refLists ? (refLists.objectives.length ? refLists.objectives.map((o) => o.name) : [...CONTENT_OBJECTIVES]) : []),
    [refLists],
  );
  const platformOptions = useMemo(
    () => (refLists ? (refLists.platforms.length ? refLists.platforms.map((o) => o.name) : [...CONTENT_PLATFORMS]) : []),
    [refLists],
  );

  const pillarOptions = useMemo(() => {
    const opts = pillars.map((o) => ({ value: String(o.id), label: o.name }));
    if (pillarId && !opts.some((o) => o.value === pillarId)) {
      opts.unshift({ value: pillarId, label: `Content Pillar #${pillarId} (inactive)` });
    }
    return opts;
  }, [pillars, pillarId]);

  const save = async (key: string, payload: any, okMsg = 'Card saved successfully') => {
    setSavingKey(key);
    try {
      await updateContent(id, payload);
      /* Refresh the CARD only — `hydrate` re-seeds every section buffer, so
       * saving one section used to silently wipe unsaved edits in all the
       * others (and still show a success toast). The saved section's own inputs
       * already hold exactly what was just persisted, so nothing needs
       * re-seeding for it. */
      setContent(await fetchContent(id));
      toast(okMsg, 'success');
    } catch (err: any) {
      toast(apiError(err) || 'Unable to save the card', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  /**
   * Work Output mutations. Author and timestamp are never sent — the server
   * derives both. After each mutation the list is re-read from the server, so
   * the Stage 7 affordance is driven by persisted rows, never local state.
   */
  const refreshWorkOutputs = useCallback(async () => {
    setWorkOutputs(await fetchWorkOutputs(id));
  }, [id]);

  const onSaveWorkOutput = async () => {
    const label = woForm.label.trim();
    const url = woForm.url.trim();
    /* Field-level errors render NEXT TO the inputs — a toast alone would not
       tell the user which of the two is wrong. Submit is blocked while any
       remain, and the typed values are left untouched. */
    const errs = collect({
      label: requiredText(label, 'Label'),
      url: requiredText(url, 'URL') ?? validUrl(url, 'URL'),
    });
    setWoErrors(errs);
    if (hasErrors(errs)) return;

    setWoSaving(true);                       // also blocks double-submit
    try {
      if (woForm.id == null) await addWorkOutput(id, label, url);
      else await updateWorkOutput(id, woForm.id, label, url);
      setWoForm({ id: null, label: '', url: '' });
      setWoErrors({});
      await refreshWorkOutputs();
      toast(woForm.id == null ? 'Work Output link added successfully' : 'Work Output link updated successfully', 'success');
    } catch (err) {
      // Server-side field errors are mapped back onto the fields.
      const mapped = fieldErrorsFromApi(err);
      setWoErrors(mapped);
      if (!hasErrors(mapped)) toast(apiError(err) || 'Unable to save the Work Output link', 'error');
    } finally {
      setWoSaving(false);
    }
  };

  const onDeleteWorkOutput = async (w: WorkOutput) => {
    if (!(await confirm({ title: 'Remove Work Output?', message: `Remove '${w.label}'? This cannot be undone.`, confirmLabel: 'Remove', intent: 'danger' }))) return;
    try {
      await deleteWorkOutput(id, w.id);
      if (woForm.id === w.id) setWoForm({ id: null, label: '', url: '' });
      await refreshWorkOutputs();
      toast('Work Output link removed successfully', 'success');
    } catch (err) {
      toast(apiError(err) || 'Unable to remove the Work Output link', 'error');
    }
  };

  const onMoveStage = async (stage: string) => {
    if (!content || stage === content.stage) return;
    const prev = content.stage;

    // Same canonical rule as the Kanban board, through the SAME modal: a
    // backward move asks for a reason before anything is changed, so cancelling
    // leaves the selector and the card exactly as they were.
    if (isBackwardMove(prev, stage)) {
      setStageBack({ cardId: id, cardTitle: content.title, from: prev, to: stage });
      return;
    }
    // Same fix as the board: a gate-rejected forward move must explain itself.
    try {
      await commitStage(prev, stage);
    } catch (err) {
      toast(apiError(err) || `Unable to move the card to ${stageLabelOf(stage)}`, 'error');
    }
  };

  /** The one place this page persists a stage change. */
  const commitStage = async (prev: string, stage: string, reason?: string) => {
    setContent((c) => (c ? { ...c, stage } : c));
    try {
      await moveContentStage(id, stage, reason);
      toast(`Card moved to ${stageLabelOf(stage)}`, 'success');
      loadHistory();
    } catch (err) {
      setContent((c) => (c ? { ...c, stage: prev } : c));
      throw err;
    }
  };

  /**
   * M08 #38 — save the scheduling record, optionally marking it Scheduled.
   * The SERVER validates the Publishing Date and owns the Stage 8 move; this
   * only reports what it decided. No stage is ever set from here.
   */
  const onSaveSchedule = async (markScheduled: boolean) => {
    /* Publishing Date is the server's one hard requirement for Mark as
       Scheduled, so it is checked here too — inline, and only when the user is
       actually marking it scheduled (a plain save may legitimately be partial). */
    const errs = collect({
      date: markScheduled ? requiredText(schedule.date, 'Publishing Date') ?? validDate(schedule.date, 'Publishing Date')
                          : validDate(schedule.date, 'Publishing Date'),
      time: validTime(schedule.time, 'Publishing Time'),
    });
    setSchedErrors(errs);
    if (hasErrors(errs)) return;

    setSavingKey('schedule');
    try {
      hydrate(await saveContentSchedule(id, {
        platforms: schedule.platforms ?? [],
        date: schedule.date || null,
        time: schedule.time || null,
        caption: schedule.caption ?? null,
        hashtags: hashtagDraft,
        captionReady: !!schedule.captionReady,
      }, markScheduled));
      loadHistory();
      toast(markScheduled ? 'Card marked as scheduled successfully' : 'Scheduling details saved successfully', 'success');
    } catch (err) {
      const mapped = fieldErrorsFromApi(err);
      setSchedErrors(mapped);
      if (!hasErrors(mapped)) toast(apiError(err) || 'Unable to save the scheduling details', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  /** M08 #39 — record the publication. publishedAt is stamped by the server. */
  const onMarkPublished = async () => {
    /* Publishing is write-once: the server records the timestamp and refuses a
       second attempt. A malformed URL on ANY platform aborts the whole call, so
       each row is checked here and flagged individually first. */
    const errs = collect(Object.fromEntries(
      Object.entries(published).map(([platform, v]) => [platform, validUrl(v?.url, `${cap(platform)} URL`)]),
    ));
    setPublishErrors(errs);
    if (hasErrors(errs)) return;
    setPublishErrors({});

    setSavingKey('published');
    try {
      const { content: row } = await markContentPublished(id, published);
      hydrate(row);
      loadHistory();
      toast('Card marked as published successfully', 'success');
    } catch (err) {
      const mapped = fieldErrorsFromApi(err);
      // The server keys these as `publishedLinks.<platform>` — strip the prefix
      // so the message lands on the right row.
      const byPlatform = Object.fromEntries(
        Object.entries(mapped).map(([k, v]) => [k.replace(/^publishedLinks\./, ''), v]),
      );
      setPublishErrors(byPlatform);
      if (!hasErrors(byPlatform)) toast(apiError(err) || 'Unable to record the publication', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  /**
   * M09 #40 — resubmit for review. The note is optional; the server records it
   * as its own revision entry only when it is non-empty, and owns the stage move.
   */
  const onResubmit = async () => {
    setSavingKey('resubmit');
    try {
      const { content: row } = await resubmitForReview(id, responseNote.trim() || undefined);
      hydrate(row);
      setResponseNote('');
      loadReview();
      loadHistory();
      toast('Card resubmitted for review successfully', 'success');
    } catch (err) {
      toast(apiError(err) || 'Unable to resubmit the card for review', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  /** M09 #41 — partial metrics save. Only edited keys are sent. */
  /**
   * Production save. The backend rejects a Final Deadline that precedes the
   * First Draft / Edit / Shoot date, and any non-http(s) design reference — the
   * same rules are checked here so the offending FIELD is marked instead of the
   * whole section failing with one toast.
   */
  /**
   * The backend rejects the WHOLE Copy / Creative save if any single reference
   * URL is malformed, naming only the first one. Checking the list here shows
   * the user exactly which row is wrong before anything is sent.
   */
  const firstBadUrl = (links: string[], label: string): string | undefined => {
    for (const link of links) {
      const problem = validUrl(link, label);
      if (problem) return `${problem} — check “${link.trim()}”`;
    }
    return undefined;
  };

  const saveCopy = async (payload: Record<string, unknown>) => {
    const errs = collect({ referenceLinks: firstBadUrl(refLinks, 'Reference link') });
    setCopyErrors(errs);
    if (hasErrors(errs)) return;
    setCopyErrors({});
    await save('copym03', payload, 'Copy saved successfully');
  };

  const saveCreative = async (payload: Record<string, unknown>) => {
    const errs = collect({ visualReferences: firstBadUrl(visualRefs, 'Visual reference') });
    setCreativeErrors(errs);
    if (hasErrors(errs)) return;
    setCreativeErrors({});
    await save('creative', payload, 'Creative direction saved successfully');
  };

  const saveProduction = async (payload: Record<string, unknown>) => {
    const design = isDesignType(content?.format);
    const errs = collect(design ? {
      designReference: validUrl(prod.designReference, 'Design Reference URL'),
      firstDraftDeadline: validDate(prod.firstDraftDeadline, 'First Draft Deadline'),
      designFinalDeadline: validDate(prod.designFinalDeadline, 'Final Deadline')
        ?? dateOrder(prod.firstDraftDeadline, prod.designFinalDeadline, 'First Draft Deadline', 'Final Deadline'),
    } : {
      shootDate: validDate(prod.shootDate, 'Shoot Date'),
      editDeadline: validDate(prod.editDeadline, 'Edit Deadline'),
      // Final must not precede EITHER upstream date — report the earliest breach.
      shootFinalDeadline: validDate(prod.shootFinalDeadline, 'Final Deadline')
        ?? dateOrder(prod.shootDate, prod.shootFinalDeadline, 'Shoot Date', 'Final Deadline')
        ?? dateOrder(prod.editDeadline, prod.shootFinalDeadline, 'Edit Deadline', 'Final Deadline'),
    });
    setProdErrors(errs);
    if (hasErrors(errs)) return;
    setProdErrors({});
    await save('prod', payload, 'Production details saved successfully');
  };

  const onSaveMetrics = async () => {
    /* Numeric metrics reject negatives on the server; check the same rule here
       so the offending metric is marked rather than the whole save failing with
       one toast. '' stays valid — it means "not entered". */
    const errs = collect(Object.fromEntries(
      (perfSchema?.metrics ?? []).map((f) => [f.key, nonNegativeNumber(metrics[f.key], f.label)]),
    ));
    setMetricErrors(errs);
    if (hasErrors(errs)) return;

    setSavingKey('metrics');
    try {
      const patch: Record<string, string | number | null> = {};
      for (const f of perfSchema?.metrics ?? []) {
        const v = metrics[f.key];
        // undefined = untouched this session, so it is not sent at all and the
        // stored value is left alone. '' is an explicit clear.
        if (v !== undefined) patch[f.key] = v === '' ? null : v;
      }
      if (metrics.learnings !== undefined) patch.learnings = metrics.learnings;
      hydrate(await saveContentMetrics(id, patch));
      loadPerformance();
      toast('Performance data saved successfully', 'success');
    } catch (err) {
      const mapped = fieldErrorsFromApi(err);
      setMetricErrors(mapped);
      if (!hasErrors(mapped)) toast(apiError(err) || 'Unable to save the performance data', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const onToggleChecklist = async (item: ReviewChecklistItem, checked: boolean) => {
    setChecklistBusy(item.key);
    try {
      setChecklist(await setReviewChecklistItem(id, item.key, checked));
      // The tick is audited server-side; refresh the log so it shows up at once.
      loadReview();
    } catch (err) {
      toast(apiError(err) || 'Unable to update the review checklist', 'error');
    } finally {
      setChecklistBusy(null);
    }
  };

  /**
   * ONE approval call. The server validates the Approver identity, the stage,
   * checklist completeness and the revision notes, then routes the stage,
   * resets the checklist when required, appends the revision entry and notifies
   * the Content Owner. The page simply re-reads everything it changed.
   */
  const onDecision = async (status: ApprovalStatus, notes: string) => {
    setSavingKey('approval');
    try {
      await setContentApproval(id, status, notes || undefined);
      hydrate(await fetchContent(id));
      loadReview();
      loadHistory();
      toast('Approval submitted successfully', 'success');
    } finally {
      setSavingKey(null);
    }
  };

  const onReadiness = async (gate: 'strategy' | 'copy' | 'production', ready: boolean) => {
    setSavingKey(`ready-${gate}`);
    try {
      hydrate(await setContentReadiness(id, gate, ready));
      toast(`${gate === 'strategy' ? 'Strategy' : gate === 'copy' ? 'Copy' : 'Production'} ${ready ? 'marked' : 'unmarked'} as Ready.`, 'success');
    } catch (err: any) {
      // Surfaces the server's workflow message (e.g. Copy already started).
      toast(apiError(err) || 'Unable to change the readiness gate', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Delete Content?',
      message: 'This permanently deletes the content item and its attachments. This action cannot be undone.',
      confirmLabel: 'Delete',
      intent: 'danger',
    });
    if (!ok) return;
    try {
      await deleteContent(id);
      toast('Content card deleted successfully', 'success');
      router.push('/dashboard/marketing/content');
    } catch (err: any) {
      toast(apiError(err) || 'Unable to delete the card', 'error');
    }
  };

  const onUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      await uploadContentAttachments(id, Array.from(files));
      hydrate(await fetchContent(id));
      toast('Attachment uploaded successfully', 'success');
    } catch (err: any) {
      toast(apiError(err) || 'Unable to upload the attachment', 'error');
    } finally {
      setUploading(false);
    }
  };

  const userOptions = useMemo(() => (
    <>
      <option value="">Unassigned</option>
      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
    </>
  ), [users]);

  // Matches the real header + two-column section grid, so nothing shifts.
  if (loading) return <CardDetailSkeleton />;
  if (error || !content) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-12 text-center">
        <p className="text-sm text-rose-600">{error ?? 'Content not found.'}</p>
        <button onClick={() => router.push('/dashboard/marketing/content')} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700">Back to board</button>
      </div>
    );
  }

  /* M07 authorization — MIRRORS the server rules exactly (contentReview.service):
   * the approve PERMISSION says a user may approve something; the card's
   * approver_id says who may approve THIS card. Both are required, and Admin
   * keeps the standard bypass. These are affordances only — every rule is
   * re-checked server-side against the persisted row. */
  const isAssignedApprover = content.approver_id != null && content.approver_id === currentUserId;
  const canDecide = isSuperAdmin || (canApprove && isAssignedApprover);
  const canCheckReview = isSuperAdmin || canEdit || (canApprove && isAssignedApprover);

  // M08 — the PLAN and the EVENT are read from two separate stores, so one can
  // never overwrite the other. publishedAt is the historical publication time.
  /* M09 #40 — resubmission is offered only for the exact situation it exists
   * for: the card is in Editing BECAUSE changes were requested, and the viewer
   * is the Content Owner. The server re-checks all three. */
  const awaitingResubmit = content.stage === 'editing' && content.approval_status === 'changes_requested';
  const canResubmit = isSuperAdmin || (content.owner_id != null && content.owner_id === currentUserId);
  // M09 #41 — the server decides whether performance is editable (stage gate).
  const performanceOpen = perfSchema?.editable === true;

  const isScheduled = !!schedule.scheduled;
  const publishedAt: string | null = content.stage_data?.publishRecord?.publishedAt ?? null;

  const stageLabel = ALL_STAGES.find((s) => s.key === content.stage)?.label ?? content.stage;
  /* Summary tiles show only metrics that hold a REAL recorded value. A stored 0
   * qualifies (it was entered); null/undefined/'' do not. */
  const recordedMetrics = (perfSchema?.metrics ?? []).filter((m) => {
    const v = content.metrics?.[m.key];
    return typeof v === 'number' && Number.isFinite(v);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => router.push('/dashboard/marketing/content')} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800" aria-label="Back to board">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-gray-900 dark:text-white">
              {content.format ? `${cap(content.format)} | ` : ''}{content.title}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Created by {content.createdByName ?? '—'} · {new Date(content.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={classNames('inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold', PRIORITY_BADGE[content.priority] ?? PRIORITY_BADGE.medium)}>
            {cap(content.priority)}
          </span>
          {content.approval_status && (
            <span className={classNames('inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold',
              content.approval_status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : content.approval_status === 'rejected' ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700')}>
              {content.approval_status === 'approved' ? <CheckCircle2 className="h-3 w-3" /> : content.approval_status === 'rejected' ? <XCircle className="h-3 w-3" /> : null}
              {cap(content.approval_status)}
            </span>
          )}
          {/* Stage mover — persisted through the same API the board's drag uses. */}
          <select
            value={content.stage}
            onChange={(e) => onMoveStage(e.target.value)}
            disabled={!canMove}
            className={classNames(inputCls, 'w-auto py-1.5 text-xs font-semibold')}
            title={canMove ? 'Move to another stage' : `Stage: ${stageLabel}`}
          >
            {ALL_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          {canDelete && (
            <button onClick={onDelete} className="rounded-lg border border-rose-200 p-2 text-rose-500 hover:bg-rose-50" title="Delete content">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* ── Overview ─────────────────────────────────────────────────────── */}
        <Section icon={FileText} title="Overview"
          action={canEdit && <SaveButton saving={savingKey === 'core'} onClick={() => save('core', {
            ...core,
            // Required by the backend: omit rather than send '' — an empty
            // string is "present but invalid" to the partial validator and
            // made the whole Overview unsavable.
            format: core.format || undefined,
            objective: core.objective || undefined,
            deadline: core.deadline || null,
            // The SAME canonical values the Strategy section writes — sent from
            // the shared state, so whichever section is saved persists exactly
            // what both are currently showing.
            cta: cta.trim(),
            pillarId: pillarId ? Number(pillarId) : null,
          })} />}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Title</label>
              <input value={core.title ?? ''} onChange={(e) => setCore({ ...core, title: e.target.value })} className={inputCls} disabled={!canEdit} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea value={core.description ?? ''} onChange={(e) => setCore({ ...core, description: e.target.value })} className={inputCls} rows={2} disabled={!canEdit} />
            </div>
            <div>
              <label className={labelCls}>Format</label>
              <select value={core.format ?? ''} onChange={(e) => setCore({ ...core, format: e.target.value })} className={inputCls} disabled={!canEdit}>
                {CONTENT_FORMATS.map((f) => <option key={f} value={f}>{cap(f)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select value={core.priority ?? 'medium'} onChange={(e) => setCore({ ...core, priority: e.target.value })} className={inputCls} disabled={!canEdit}>
                {CONTENT_PRIORITIES.map((p) => <option key={p} value={p}>{cap(p)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Objective</label>
              <select value={core.objective ?? ''} onChange={(e) => setCore({ ...core, objective: e.target.value })} className={inputCls} disabled={!canEdit}>
                {(core.objective && !objectiveOptions.includes(core.objective)
                  ? [core.objective, ...objectiveOptions] : objectiveOptions
                ).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Platform</label>
              <select value={core.platform ?? ''} onChange={(e) => setCore({ ...core, platform: e.target.value })} className={inputCls} disabled={!canEdit}>
                <option value="">Not set</option>
                {(core.platform && !platformOptions.includes(core.platform)
                  ? [core.platform, ...platformOptions] : platformOptions
                ).map((p) => <option key={p} value={p}>{cap(p)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Deadline</label>
              <input type="date" value={core.deadline ?? ''} onChange={(e) => setCore({ ...core, deadline: e.target.value })} className={inputCls} disabled={!canEdit} />
            </div>
            {/* CTA and Content Pillar are ONE value each, held in ONE state and
                rendered by both Basics and Strategy — editing either control
                updates the other instantly because there is nothing to sync. */}
            <div>
              <label className={labelCls} htmlFor="ov-cta">CTA</label>
              <input id="ov-cta" value={cta} onChange={(e) => setCta(e.target.value)} className={inputCls} disabled={!canEdit} />
            </div>
            <div>
              <label className={labelCls} htmlFor="ov-pillar">Content Pillar</label>
              <select id="ov-pillar" value={pillarId} onChange={(e) => setPillarId(e.target.value)} className={inputCls} disabled={!canEdit}>
                <option value="">{pillarOptions.length ? 'Not set' : 'None configured'}</option>
                {pillarOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-gray-400">Shared with Strategy — changing it here updates both.</p>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Target Audience</label>
              <input value={core.targetAudience ?? ''} onChange={(e) => setCore({ ...core, targetAudience: e.target.value })} className={inputCls} disabled={!canEdit} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>References</label>
              <textarea value={core.references ?? ''} onChange={(e) => setCore({ ...core, references: e.target.value })} className={inputCls} rows={2} disabled={!canEdit} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea value={core.notes ?? ''} onChange={(e) => setCore({ ...core, notes: e.target.value })} className={inputCls} rows={2} disabled={!canEdit} />
            </div>
          </div>
        </Section>

        <div className="space-y-4">
          {/* ── Team ────────────────────────────────────────────────────────── */}
          <Section icon={UsersIcon} title="Team Assignment"
            action={canAssign && <SaveButton saving={savingKey === 'team'} onClick={() => save('team', {
              ownerId: team.ownerId ? Number(team.ownerId) : null,
              designerId: team.designerId ? Number(team.designerId) : null,
              videographerId: team.videographerId ? Number(team.videographerId) : null,
              editorId: team.editorId ? Number(team.editorId) : null,
              scriptwriterId: team.scriptwriterId ? Number(team.scriptwriterId) : null,
              talentId: team.talentId ? Number(team.talentId) : null,
              approverId: team.approverId ? Number(team.approverId) : null,
            }, 'Assignments saved.')} />}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([['ownerId', 'Owner (Content Strategist)'], ['designerId', 'Designer'], ['videographerId', 'Videographer'], ['editorId', 'Editor'], ['scriptwriterId', 'Writer / Scriptwriter'], ['talentId', 'Talent / Presenter'], ['approverId', 'Approver']] as const).map(([k, label]) => (
                <div key={k}>
                  <label className={labelCls}>{label}</label>
                  <select value={team[k] ?? ''} onChange={(e) => setTeam({ ...team, [k]: e.target.value })} className={inputCls} disabled={!canAssign}>
                    {userOptions}
                  </select>
                </div>
              ))}
            </div>
          </Section>

          {/* ── M03 STRATEGY (#11) + Strategy Ready (#12) ─────────────────── */}
          <Section icon={Lightbulb} title="Strategy"
            action={canEdit && (
              <SaveButton saving={savingKey === 'strategy'} onClick={() => save('strategy', {
                strategyData: strategy,
                // CTA + Content Pillar write to the SAME fields Basics owns, so
                // the two sections can never hold different values.
                cta: cta.trim(),
                pillarId: pillarId ? Number(pillarId) : null,
              }, 'Strategy saved.')} />
            )}>
            <div className="space-y-3">
              {/* Readiness banner — visible to EVERYONE (view != edit). */}
              <div className={classNames('flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                content.strategy_ready ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-600')}>
                {content.strategy_ready ? <CheckCircle className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                <span className="font-semibold">{content.strategy_ready ? 'Strategy Ready' : 'Strategy not ready'}</span>
                {content.strategy_ready && content.strategy_ready_at && (
                  <span className="text-xs">
                    · Marked by {content.strategyReadyByName ?? 'a team member'} on{' '}
                    {new Date(content.strategy_ready_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {canToggleReady && (
                  <button type="button" disabled={savingKey === 'ready-strategy'}
                    onClick={() => onReadiness('strategy', !content.strategy_ready)}
                    className={classNames('ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60',
                      content.strategy_ready ? 'bg-gray-500 hover:bg-gray-600' : 'bg-emerald-600 hover:bg-emerald-700')}>
                    {savingKey === 'ready-strategy' && <Loader2 className="h-3 w-3 animate-spin" />}
                    {content.strategy_ready ? 'Unmark Ready' : 'Mark Strategy as Ready'}
                  </button>
                )}
              </div>

              <div>
                <label className={labelCls} htmlFor="st-core">Core Message</label>
                <textarea id="st-core" value={strategy.coreMessage} onChange={(e) => setStrategy({ ...strategy, coreMessage: e.target.value })}
                  className={inputCls} rows={3} disabled={!canEdit} placeholder="What the audience should understand" />
              </div>
              <div>
                <label className={labelCls} htmlFor="st-hook">Hook / Main Idea</label>
                <textarea id="st-hook" value={strategy.hook} onChange={(e) => setStrategy({ ...strategy, hook: e.target.value })}
                  className={inputCls} rows={2} disabled={!canEdit} placeholder="What grabs attention" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls} htmlFor="st-cta">CTA</label>
                  <input id="st-cta" value={cta} onChange={(e) => setCta(e.target.value)} className={inputCls}
                    disabled={!canEdit} placeholder="What the audience should do" />
                </div>
                <div>
                  <label className={labelCls} htmlFor="st-pillar">Content Pillar</label>
                  <select id="st-pillar" value={pillarId} onChange={(e) => setPillarId(e.target.value)} className={inputCls} disabled={!canEdit}>
                    <option value="">{pillarOptions.length ? 'Not set' : 'None configured'}</option>
                    {pillarOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <p className="mt-1 text-[11px] text-gray-400">Shared with Basics — changing it here updates both.</p>
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="st-notes">Notes / Additional Details</label>
                <textarea id="st-notes" value={strategy.notes} onChange={(e) => setStrategy({ ...strategy, notes: e.target.value })}
                  className={inputCls} rows={3} disabled={!canEdit} />
              </div>
              {!canEdit && <p className="text-xs italic text-gray-400">Read-only — editing Strategy requires the Edit Content permission.</p>}
            </div>
          </Section>

          {/* ── M03 COPY / SCRIPT (#13) + Copy Ready (#14) ────────────────────
              Locked until Strategy is Ready. The lock is a WORKFLOW gate, so it
              applies to everyone including Admin — the backend rejects Copy
              writes while Strategy is not Ready, this only mirrors it. */}
          <Section icon={PenLine} title="Copy / Script"
            action={canEdit && isCopyUnlocked(content) && (
              <SaveButton saving={savingKey === 'copym03'} onClick={() => saveCopy({
                copyData: { ...copyM03, referenceLinks: refLinks.map((l) => l.trim()).filter(Boolean) },
              })} />
            )}>
            <div className="space-y-3">
              <div className={classNames('flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                content.copy_ready ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-600')}>
                {content.copy_ready ? <CheckCircle className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                <span className="font-semibold">{content.copy_ready ? 'Copy Ready' : 'Copy not ready'}</span>
                {content.copy_ready && content.copy_ready_at && (
                  <span className="text-xs">
                    · Marked by {content.copyReadyByName ?? 'a team member'} on{' '}
                    {new Date(content.copy_ready_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {canToggleReady && isCopyUnlocked(content) && (
                  <button type="button" disabled={savingKey === 'ready-copy'}
                    onClick={() => onReadiness('copy', !content.copy_ready)}
                    className={classNames('ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60',
                      content.copy_ready ? 'bg-gray-500 hover:bg-gray-600' : 'bg-emerald-600 hover:bg-emerald-700')}>
                    {savingKey === 'ready-copy' && <Loader2 className="h-3 w-3 animate-spin" />}
                    {content.copy_ready ? 'Unmark Ready' : 'Mark Copy as Ready'}
                  </button>
                )}
              </div>

              {!isCopyUnlocked(content) ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Lock className="h-7 w-7 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Copy is locked until Strategy is marked Ready.</p>
                  <p className="text-xs text-gray-400">Any Copy already written is preserved and will reappear once Strategy is Ready.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className={labelCls} htmlFor="cp-main">Main Copy / Script</label>
                    <textarea id="cp-main" value={copyM03.mainCopy} onChange={(e) => setCopyM03({ ...copyM03, mainCopy: e.target.value })}
                      className={classNames(inputCls, 'font-mono')} rows={10} disabled={!canEdit}
                      placeholder="Headline, body copy, dialogue, voiceover…" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cp-support">Supporting Information</label>
                    <textarea id="cp-support" value={copyM03.supportingInfo} onChange={(e) => setCopyM03({ ...copyM03, supportingInfo: e.target.value })}
                      className={inputCls} rows={3} disabled={!canEdit} placeholder="Key points and context" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="cp-required">Required Text</label>
                    <textarea id="cp-required" value={copyM03.requiredText} onChange={(e) => setCopyM03({ ...copyM03, requiredText: e.target.value })}
                      className={inputCls} rows={2} disabled={!canEdit} placeholder="Text that must appear in the final content" />
                  </div>

                  {/* Reference / Source Links — each URL is its own entry. */}
                  <div>
                    <span className={labelCls}>Reference / Source Links</span>
                    <div className="space-y-2">
                      {refLinks.map((link, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Link2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          <input
                            value={link}
                            onChange={(e) => setRefLinks((prev) => prev.map((l, j) => (j === i ? e.target.value : l)))}
                            aria-invalid={!!copyErrors.referenceLinks}
                            className={inputCls} disabled={!canEdit} placeholder="https://example.com/reference"
                            aria-label={`Reference link ${i + 1}`}
                          />
                          {canEdit && (
                            <button type="button" onClick={() => setRefLinks((prev) => prev.filter((_, j) => j !== i))}
                              aria-label={`Remove reference link ${i + 1}`}
                              className="shrink-0 rounded p-1 text-gray-400 hover:text-rose-500">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {!refLinks.length && <p className="text-xs text-gray-400">No reference links yet.</p>}
                      {canEdit && (
                        <button type="button" onClick={() => setRefLinks((prev) => [...prev, ''])}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 hover:underline">
                          <Plus className="h-3.5 w-3.5" /> Add Reference Link
                        </button>
                      )}
                      {/* One message for the list — names the offending URL. */}
                      <FieldError message={copyErrors.referenceLinks} />
                    </div>
                  </div>
                  {!canEdit && <p className="text-xs italic text-gray-400">Read-only — editing Copy requires the Edit Content permission.</p>}
                </>
              )}
            </div>
          </Section>
        </div>

        {/* ── M04 CREATIVE DIRECTION (#15) ──────────────────────────────────
            A DISTINCT concept from the Production Briefing below — separate
            section, separate store. */}
        <Section icon={Sparkles} title="Creative Direction"
          action={canEdit && (
            <SaveButton saving={savingKey === 'creative'} onClick={() => saveCreative({
              creativeDirection: { ...creative, visualReferences: visualRefs.map((l) => l.trim()).filter(Boolean) },
            })} />
          )}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="cd-tone">Creative Style / Tone</label>
                <select id="cd-tone" value={creative.styleTone} onChange={(e) => setCreative({ ...creative, styleTone: e.target.value })} className={inputCls} disabled={!canEdit}>
                  <option value="">Not set</option>
                  {STYLE_TONE_PRESETS.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="cd-tone-custom">Additional / Custom Style</label>
                <input id="cd-tone-custom" value={creative.styleToneCustom} onChange={(e) => setCreative({ ...creative, styleToneCustom: e.target.value })}
                  className={inputCls} disabled={!canEdit} placeholder="Free text — optional, works with or without a preset" />
              </div>
            </div>

            {/* Visual References — each URL is a separate entry, rendered as a
                safe external link (noopener/noreferrer). */}
            <div>
              <span className={labelCls}>Visual References</span>
              <div className="space-y-2">
                {visualRefs.map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <input value={link} aria-invalid={!!creativeErrors.visualReferences}
                      onChange={(e) => setVisualRefs((prev) => prev.map((l, j) => (j === i ? e.target.value : l)))}
                      className={inputCls} disabled={!canEdit} placeholder="https://example.com/reference"
                      aria-label={`Visual reference ${i + 1}`} />
                    {link.trim() && (
                      <a href={link.trim()} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 text-xs font-semibold text-cyan-600 hover:underline" aria-label={`Open visual reference ${i + 1}`}>Open</a>
                    )}
                    {canEdit && (
                      <button type="button" onClick={() => setVisualRefs((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`Remove visual reference ${i + 1}`} className="shrink-0 rounded p-1 text-gray-400 hover:text-rose-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {!visualRefs.length && <p className="text-xs text-gray-400">No visual references yet.</p>}
                {canEdit && (
                  <button type="button" onClick={() => setVisualRefs((prev) => [...prev, ''])}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 hover:underline">
                    <Plus className="h-3.5 w-3.5" /> Add Visual Reference
                  </button>
                )}
                <FieldError message={creativeErrors.visualReferences} />
              </div>
            </div>

            <div>
              <label className={labelCls} htmlFor="cd-brand">Brand Requirements</label>
              <textarea id="cd-brand" value={creative.brandRequirements} onChange={(e) => setCreative({ ...creative, brandRequirements: e.target.value })}
                className={inputCls} rows={3} disabled={!canEdit} placeholder="Logo usage, colours, fonts, brand guideline notes" />
            </div>
            <div>
              <label className={labelCls} htmlFor="cd-special">Special Instructions</label>
              <textarea id="cd-special" value={creative.specialInstructions} onChange={(e) => setCreative({ ...creative, specialInstructions: e.target.value })}
                className={inputCls} rows={3} disabled={!canEdit} placeholder="Instructions for the designer / editor / production team" />
            </div>
            {!canEdit && <p className="text-xs italic text-gray-400">Read-only — editing requires the Edit Content permission.</p>}
          </div>
        </Section>

        {/* ── M04 PRODUCTION BRIEFING (#16 / #17) ───────────────────────────
            Exactly ONE family renders, chosen by Content Type. The other
            family's stored values are untouched — switching type changes
            visibility only. */}
        <Section icon={Wrench} title={isDesignType(content.format) ? 'Production — Poster / Carousel' : isShootType(content.format) ? 'Production — Reel / Video' : 'Production'}
          action={canEdit && (isDesignType(content.format) || isShootType(content.format)) && (
            <SaveButton saving={savingKey === 'prod'} onClick={() => saveProduction({
              productionFields: isDesignType(content.format)
                ? { dimensions: prod.dimensions, slideCount: prod.slideCount, designReference: prod.designReference,
                    firstDraftDeadline: prod.firstDraftDeadline, finalDeadline: prod.designFinalDeadline }
                : { location: prod.location, props: prod.props, equipment: prod.equipment,
                    shootDate: prod.shootDate, editDeadline: prod.editDeadline, finalDeadline: prod.shootFinalDeadline },
            })} />
          )}>
          <div className="space-y-3">
            {/* Production Ready banner — visible to everyone (view != edit). */}
            <div className={classNames('flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm',
              content.production_ready ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-600')}>
              {content.production_ready ? <CheckCircle className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              <span className="font-semibold">{content.production_ready ? 'Production Ready' : 'Production not ready'}</span>
              {content.production_ready && content.production_ready_at && (
                <span className="text-xs">
                  · Marked by {content.productionReadyByName ?? 'a team member'} on{' '}
                  {new Date(content.production_ready_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {canToggleReady && (
                <button type="button" disabled={savingKey === 'ready-production'}
                  onClick={() => onReadiness('production', !content.production_ready)}
                  className={classNames('ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60',
                    content.production_ready ? 'bg-gray-500 hover:bg-gray-600' : 'bg-emerald-600 hover:bg-emerald-700')}>
                  {savingKey === 'ready-production' && <Loader2 className="h-3 w-3 animate-spin" />}
                  {content.production_ready ? 'Unmark Ready' : 'Mark Production Ready'}
                </button>
              )}
            </div>
            {isShootType(content.format) && !prod.shootFinalDeadline && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                A Final Deadline is required before Production can be marked Ready.
              </p>
            )}

            {/* TEAM assignments — displayed READ-ONLY. Team is the source of
                truth; change them in the Team section above. */}
            <div className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Assigned Team (read-only)</p>
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                {(isDesignType(content.format)
                  ? [['Designer', content.designerName]]
                  : [['Scriptwriter', content.scriptwriterName], ['Talent / Presenter', content.talentName],
                     ['Videographer', content.videographerName], ['Editor', content.editorName]]
                ).map(([label, name]) => (
                  <div key={label as string}>
                    <p className="text-[11px] font-semibold text-gray-400">{label}</p>
                    <p className="text-gray-700 dark:text-gray-300">{(name as string) ?? <span className="text-gray-400">Unassigned</span>}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-gray-400">Change assignments in the Team section — they are not editable here.</p>
            </div>

            {isDesignType(content.format) ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls} htmlFor="pr-dim">Dimensions / Size</label>
                  <input id="pr-dim" value={prod.dimensions ?? ''} onChange={(e) => setProd({ ...prod, dimensions: e.target.value })} className={inputCls} disabled={!canEdit} placeholder="e.g. 1080x1350" />
                </div>
                <div>
                  <label className={labelCls} htmlFor="pr-slides">Number of Slides</label>
                  <input id="pr-slides" type="number" min={0} value={prod.slideCount ?? ''} onChange={(e) => setProd({ ...prod, slideCount: e.target.value })} className={inputCls} disabled={!canEdit} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="pr-designref">Design Reference</label>
                  <div className="flex items-center gap-2">
                    <input id="pr-designref" value={prod.designReference ?? ''} onChange={(e) => setProd({ ...prod, designReference: e.target.value })} aria-invalid={!!prodErrors.designReference} className={classNames(inputCls, prodErrors.designReference && invalidInputCls)} disabled={!canEdit} placeholder="https://…" />
                  <FieldError message={prodErrors.designReference} />
                    {prod.designReference?.trim() && (
                      <a href={prod.designReference.trim()} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-cyan-600 hover:underline">Open</a>
                    )}
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="pr-firstdraft">First Draft Deadline</label>
                  <input id="pr-firstdraft" type="date" max={prod.designFinalDeadline || undefined} value={prod.firstDraftDeadline ?? ''} onChange={(e) => setProd({ ...prod, firstDraftDeadline: e.target.value })} aria-invalid={!!prodErrors.firstDraftDeadline} className={classNames(inputCls, prodErrors.firstDraftDeadline && invalidInputCls)} disabled={!canEdit} />
                  <FieldError message={prodErrors.firstDraftDeadline} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="pr-designfinal">Final Deadline</label>
                  <input id="pr-designfinal" type="date" min={prod.firstDraftDeadline || undefined} value={prod.designFinalDeadline ?? ''} onChange={(e) => setProd({ ...prod, designFinalDeadline: e.target.value })} aria-invalid={!!prodErrors.designFinalDeadline} className={classNames(inputCls, prodErrors.designFinalDeadline && invalidInputCls)} disabled={!canEdit} />
                  <FieldError message={prodErrors.designFinalDeadline} />
                </div>
              </div>
            ) : isShootType(content.format) ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="pr-loc">Location</label>
                  <input id="pr-loc" value={prod.location ?? ''} onChange={(e) => setProd({ ...prod, location: e.target.value })} className={inputCls} disabled={!canEdit} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="pr-props">Props</label>
                  <textarea id="pr-props" value={prod.props ?? ''} onChange={(e) => setProd({ ...prod, props: e.target.value })} className={inputCls} rows={2} disabled={!canEdit} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="pr-equip">Equipment</label>
                  <textarea id="pr-equip" value={prod.equipment ?? ''} onChange={(e) => setProd({ ...prod, equipment: e.target.value })} className={inputCls} rows={2} disabled={!canEdit} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="pr-shoot">Shoot Date</label>
                  <input id="pr-shoot" type="date" max={prod.shootFinalDeadline || undefined} value={prod.shootDate ?? ''} onChange={(e) => setProd({ ...prod, shootDate: e.target.value })} aria-invalid={!!prodErrors.shootDate} className={classNames(inputCls, prodErrors.shootDate && invalidInputCls)} disabled={!canEdit} />
                  <FieldError message={prodErrors.shootDate} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="pr-edit">Edit Deadline</label>
                  <input id="pr-edit" type="date" max={prod.shootFinalDeadline || undefined} value={prod.editDeadline ?? ''} onChange={(e) => setProd({ ...prod, editDeadline: e.target.value })} aria-invalid={!!prodErrors.editDeadline} className={classNames(inputCls, prodErrors.editDeadline && invalidInputCls)} disabled={!canEdit} />
                  <FieldError message={prodErrors.editDeadline} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="pr-shootfinal">Final Deadline</label>
                  <input id="pr-shootfinal" type="date" value={prod.shootFinalDeadline ?? ''} onChange={(e) => setProd({ ...prod, shootFinalDeadline: e.target.value })} aria-invalid={!!prodErrors.shootFinalDeadline} className={classNames(inputCls, prodErrors.shootFinalDeadline && invalidInputCls)} disabled={!canEdit} />
                  <FieldError message={prodErrors.shootFinalDeadline} />
                </div>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">Set a Content Type to enter production details.</p>
            )}
            {!canEdit && <p className="text-xs italic text-gray-400">Read-only — editing requires the Edit Content permission.</p>}

            {/* ── M04 #27 Work Output links ──────────────────────────────────
                Recorded deliverables. The server derives the author and the
                timestamp and owns every authorization decision — the buttons
                below are affordances, and a rejected call surfaces its reason
                through the existing toast. */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
              <div className="mb-2 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-cyan-600" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Work Output</h3>
                <span className="rounded-full bg-gray-200/80 dark:bg-gray-800 px-2 py-0.5 text-[11px] font-bold leading-none text-gray-600 dark:text-gray-400">
                  {workOutputs.length}
                </span>
              </div>
              {workOutputs.length ? (
                <ul className="space-y-2">
                  {workOutputs.map((w) => (
                    <li key={w.id} className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200" title={w.label}>{w.label}</p>
                          {/* break-all keeps a very long URL inside the card */}
                          <a href={w.url} target="_blank" rel="noopener noreferrer"
                            className="block break-all text-xs font-medium text-cyan-600 hover:underline">
                            {w.url}
                          </a>
                          <p className="mt-0.5 text-[11px] text-gray-400">
                            Added by {w.addedByName ?? 'Unknown'} ·{' '}
                            {new Date(w.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button type="button" onClick={() => setWoForm({ id: w.id, label: w.label, url: w.url })}
                            className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                            Edit
                          </button>
                          <button type="button" onClick={() => onDeleteWorkOutput(w)}
                            className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-gray-200 dark:border-gray-800 px-3 py-4 text-center text-xs text-gray-400">
                  No Work Output recorded yet. At least one link is required before this card can enter Review / Approval.
                </p>
              )}

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
                <div>
                  <input value={woForm.label} onChange={(e) => setWoForm({ ...woForm, label: e.target.value })}
                    aria-label="Work Output label" aria-invalid={!!woErrors.label}
                    className={classNames(inputCls, woErrors.label && invalidInputCls)}
                    placeholder="Label (e.g. First Draft)" maxLength={120} />
                  <FieldError message={woErrors.label} />
                </div>
                <div>
                  <input value={woForm.url} onChange={(e) => setWoForm({ ...woForm, url: e.target.value })}
                    // Blur-validated: a URL is worth flagging before submit.
                    onBlur={() => setWoErrors((p) => ({ ...p, url: validUrl(woForm.url, 'URL') ?? '' }))}
                    aria-label="Work Output URL" aria-invalid={!!woErrors.url}
                    className={classNames(inputCls, woErrors.url && invalidInputCls)}
                    placeholder="https://…" />
                  <FieldError message={woErrors.url} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={onSaveWorkOutput} disabled={woSaving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
                    {woSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                    {woForm.id == null ? <><Plus className="h-3 w-3" /> Add</> : 'Update'}
                  </button>
                  {woForm.id != null && (
                    <button type="button" onClick={() => setWoForm({ id: null, label: '', url: '' })}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── M06 #29 Stage History ──────────────────────────────────────────
            Rendered from the EXISTING activity audit rows. Entries are
            append-only, so every move — including each recorded backward
            reason — stays visible for the life of the card. */}
        <Section icon={CalendarClock} title="Stage History">
          {history.length ? (
            <ol className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className={classNames(
                  'rounded-lg border px-3 py-2 text-xs',
                  h.blocked
                    ? 'border-rose-200 bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-950/10'
                    : 'border-gray-200 dark:border-gray-800',
                )}>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {h.fromLabel ?? '—'} <span className="text-gray-400">→</span> {h.toLabel ?? '—'}
                    {h.blocked && <span className="ml-1 text-[10px] font-bold uppercase text-rose-600">blocked</span>}
                  </p>
                  {h.reason && (
                    <p className="mt-0.5 text-gray-600 dark:text-gray-300">
                      <span className="font-semibold">Reason:</span> {h.reason}
                    </p>
                  )}
                  {h.denied && <p className="mt-0.5 text-rose-600">{h.denied}</p>}
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {h.actorName ?? 'Unknown'} ·{' '}
                    {new Date(h.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            historyLoading ? <ListSkeleton rows={3} /> : (
              <div className="py-4 text-center">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">No stage changes recorded yet</p>
                <p className="mt-0.5 text-[11px] text-gray-400">Moving this card between stages will record an entry here.</p>
              </div>
            )
          )}
        </Section>

        {/* ── Stage checklists (Strategy / Design / Production / Editing) ────── */}
        {CHECKLISTS.map((cl) => (
          <Section key={cl.section} icon={cl.icon} title={cl.title}
            action={canEdit && <SaveButton saving={savingKey === cl.section} onClick={() => save(cl.section, { stageData: { [cl.section]: checks[cl.section] ?? {} } }, `${cl.title} saved.`)} />}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {cl.items.map((item) => (
                <label key={item.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={!!checks[cl.section]?.[item.key]}
                    disabled={!canEdit}
                    onChange={(e) => setChecks((prev) => ({ ...prev, [cl.section]: { ...prev[cl.section], [item.key]: e.target.checked } }))}
                    className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </Section>
        ))}

        {/* ── M07 Review & Approval ──────────────────────────────────────────
            Checklist (#34), read-only Approver view + decision panel (#35/#36).
            Everything shown here is re-validated server-side. */}
        <Section icon={ShieldCheck} title="Review / Approval"
          action={<ApprovalStatusBadge status={content.approval_status} />}>
          <div className="space-y-3">
            {content.stage === 'review' ? (
              <>
                <ReviewChecklist
                  state={checklist}
                  canCheck={canCheckReview}
                  busyItem={checklistBusy}
                  onToggle={onToggleChecklist}
                />

                {canDecide ? (
                  <>
                    <ApproverReadOnlyView content={content} />
                    <ApprovalActionPanel
                      current={content.approval_status}
                      checklistComplete={checklist.complete}
                      saving={savingKey === 'approval'}
                      onSubmit={onDecision}
                    />
                  </>
                ) : (
                  <p className="text-xs italic text-gray-400">
                    {content.approver_id
                      ? `Only ${content.approverName ?? 'the assigned Approver'} can decide on this card.`
                      : 'No Approver is assigned to this card yet — assign one in the Team section.'}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                The review checklist and approval actions become available when the card is in
                Review / Approval. Current stage: <b>{ALL_STAGES.find((x) => x.key === content.stage)?.label ?? content.stage}</b>.
              </p>
            )}

            {content.stage_data?.review?.note && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Latest notes:</span> {content.stage_data.review.note}
              </p>
            )}

            {/* M09 #40 — resubmission with an OPTIONAL response note. */}
            {awaitingResubmit && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/10">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Changes were requested on this card.
                </p>
                {canResubmit ? (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300" htmlFor="response-note">
                        Response note <span className="font-normal text-gray-400">(optional)</span>
                      </label>
                      <textarea
                        id="response-note"
                        value={responseNote}
                        onChange={(e) => setResponseNote(e.target.value)}
                        rows={3}
                        placeholder="What did you change in response to the review?"
                        className={inputCls}
                      />
                    </div>
                    <button type="button" onClick={onResubmit} disabled={savingKey === 'resubmit'}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">
                      {savingKey === 'resubmit' && <Loader2 className="h-3 w-3 animate-spin" />}
                      <ShieldCheck className="h-3.5 w-3.5" /> Resubmit for review
                    </button>
                  </>
                ) : (
                  <p className="text-xs italic text-gray-500">
                    The Content Owner{content.ownerName ? ` (${content.ownerName})` : ''} resubmits this card once the changes are made.
                  </p>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* ── M07 #37 Revision History ───────────────────────────────────────
            A read-only projection of the append-only approval audit. There is
            no edit or delete control here for ANY role, by design. */}
        <Section icon={History} title="Revision History">
          {revisions.length ? (
            <ol className="space-y-2">
              {revisions.map((r) => (
                <li key={r.id} className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {r.entryType === 'response_note' ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300">
                        <PenLine className="h-3 w-3" /> {r.decisionLabel}
                      </span>
                    ) : (
                      <ApprovalStatusBadge status={r.decision} />
                    )}
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {r.approverName ?? 'Unknown'}
                    </span>
                    <span className="ml-auto text-[11px] text-gray-400">
                      {new Date(r.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {r.revisionNotes && (
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs text-gray-600 dark:text-gray-300">
                      {r.revisionNotes}
                    </p>
                  )}
                  {r.toStage && r.fromStage && r.toStage !== r.fromStage && (
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      Moved to {ALL_STAGES.find((x) => x.key === r.toStage)?.label ?? r.toStage}
                      {r.checklistReset && ' · review checklist reset for the next cycle'}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : reviewLoading ? (
            // Loading and empty are DIFFERENT states — the empty message never
            // appears while the request is still in flight.
            <ListSkeleton rows={2} />
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">No approval decisions yet</p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                Every Approved, Changes Requested or Rejected decision on this card will be listed here.
              </p>
            </div>
          )}
        </Section>

        {/* ── M08 #38 Scheduling ─────────────────────────────────────────────
            Records the PLAN inside the ERP. Nothing is posted to any external
            platform. The Publishing Date requirement and the Stage 8 move are
            both enforced server-side. */}
        <Section icon={CalendarClock} title="Scheduling"
          action={canSchedule && (
            <SaveButton saving={savingKey === 'schedule'} onClick={() => onSaveSchedule(false)} />
          )}>
          <div className="space-y-3">
            {isScheduled && (
              <p className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle className="h-4 w-4" />
                <span className="font-semibold">Marked as Scheduled</span>
                {schedule.scheduledAt && (
                  <span className="text-xs">
                    · {new Date(schedule.scheduledAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className={labelCls}>Platform(s)</span>
                <div className="flex flex-wrap gap-1">
                  {CONTENT_PLATFORMS.map((p) => {
                    const on = (schedule.platforms ?? []).includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={on}
                        disabled={!canSchedule}
                        onClick={() => setSchedule({
                          ...schedule,
                          platforms: on
                            ? (schedule.platforms ?? []).filter((x: string) => x !== p)
                            : [...(schedule.platforms ?? []), p],
                        })}
                        className={classNames(
                          'rounded-md border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-60',
                          on
                            ? 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
                        )}
                      >
                        {cap(p)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="sch-date">Publishing Date <span className="text-rose-600">*</span></label>
                <input id="sch-date" type="date" value={schedule.date ?? ''}
                  onChange={(e) => setSchedule({ ...schedule, date: e.target.value })}
                  aria-invalid={!!schedErrors.date}
                  className={classNames(inputCls, schedErrors.date && invalidInputCls)} disabled={!canSchedule} />
                <FieldError message={schedErrors.date} />
              </div>
              <div>
                <label className={labelCls} htmlFor="sch-time">Publishing Time</label>
                <input id="sch-time" type="time" value={schedule.time ?? ''}
                  onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
                  aria-invalid={!!schedErrors.time}
                  className={classNames(inputCls, schedErrors.time && invalidInputCls)} disabled={!canSchedule} />
                <FieldError message={schedErrors.time} />
                <p className="mt-1 text-[11px] text-gray-400">Optional — left empty if not decided.</p>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="sch-caption">Caption</label>
                <textarea id="sch-caption" value={schedule.caption ?? ''}
                  onChange={(e) => setSchedule({ ...schedule, caption: e.target.value })}
                  className={inputCls} rows={3} disabled={!canSchedule} placeholder="Optional" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="sch-hashtags">Hashtags</label>
                <input id="sch-hashtags" value={hashtagDraft}
                  onChange={(e) => setHashtagDraft(e.target.value)}
                  className={inputCls} disabled={!canSchedule}
                  placeholder="Optional — separate with spaces or commas" />
                {!!(schedule.hashtags ?? []).length && (
                  <span className="mt-1 flex flex-wrap gap-1">
                    {(schedule.hashtags as string[]).map((h) => (
                      <span key={h} className="inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-700">{h}</span>
                    ))}
                  </span>
                )}
              </div>
            </div>

            {canSchedule && !isScheduled && (
              <button type="button" disabled={savingKey === 'schedule'} onClick={() => onSaveSchedule(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {savingKey === 'schedule' && <Loader2 className="h-3 w-3 animate-spin" />}
                <CalendarClock className="h-3.5 w-3.5" /> Mark as Scheduled
              </button>
            )}
            {!canSchedule && <p className="text-xs italic text-gray-400">Read-only — scheduling requires the Schedule Content permission.</p>}
          </div>
        </Section>

        {/* ── M08 #39 Publishing Record ──────────────────────────────────────
            What ACTUALLY happened. Scheduling data above is never replaced by
            it, and the published timestamp comes from the server clock. */}
        <Section icon={Send} title="Publishing Record"
          action={publishedAt && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Published
            </span>
          )}>
          <div className="space-y-3">
            {publishedAt ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <span className="font-semibold">Published at</span>{' '}
                {new Date(publishedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {content.stage_data?.publishRecord?.publishedBy && (
                  <span className="block text-xs">
                    Recorded by {users.find((u) => u.id === content.stage_data?.publishRecord?.publishedBy)?.name ?? 'a team member'}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                The actual publication time is recorded by the server when this card is marked as published.
              </p>
            )}

            <div className="space-y-2">
              <span className={labelCls}>Published link per platform</span>
              {CONTENT_PLATFORMS.map((p) => (
                <div key={p} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2">
                  <label className="flex w-28 cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={!!published[p]?.done} disabled={!canPublish || !!publishedAt}
                      onChange={(e) => setPublished((prev) => ({ ...prev, [p]: { ...prev[p], done: e.target.checked } }))}
                      className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                    {cap(p)}
                  </label>
                  {publishedAt && published[p]?.url ? (
                    <a href={published[p]!.url as string} target="_blank" rel="noopener noreferrer"
                      className="min-w-0 flex-1 break-all text-xs font-medium text-cyan-600 hover:underline">
                      {published[p]!.url}
                    </a>
                  ) : (
                    <div className="min-w-[180px] flex-1">
                      <input
                        value={published[p]?.url ?? ''}
                        onChange={(e) => setPublished((prev) => ({ ...prev, [p]: { ...prev[p], url: e.target.value } }))}
                        onBlur={() => setPublishErrors((prev) => ({ ...prev, [p]: validUrl(published[p]?.url, `${cap(p)} URL`) ?? '' }))}
                        disabled={!canPublish || !!publishedAt}
                        aria-label={`${cap(p)} post URL`}
                        aria-invalid={!!publishErrors[p]}
                        className={classNames(inputCls, 'w-full py-1.5 text-xs', publishErrors[p] && invalidInputCls)}
                        placeholder="Post URL (optional)"
                      />
                      <FieldError message={publishErrors[p]} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {canPublish && !publishedAt && content.stage === 'scheduled' && (
              <button type="button" disabled={savingKey === 'published'} onClick={onMarkPublished}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {savingKey === 'published' && <Loader2 className="h-3 w-3 animate-spin" />}
                <Send className="h-3.5 w-3.5" /> Mark as Published
              </button>
            )}
            {canPublish && !publishedAt && content.stage !== 'scheduled' && (
              <p className="text-xs italic text-gray-400">
                A card can be marked as published once it is in Scheduled. Current stage: <b>{stageLabel}</b>.
              </p>
            )}
            {!canPublish && <p className="text-xs italic text-gray-400">Publishing requires the Publish Content permission.</p>}
          </div>
        </Section>

        {/* ── M09 #41 Performance & Analytics ────────────────────────────────
            Field list comes from the SERVER already filtered to the Content
            Type, so Watch Time cannot render for a Poster. Every value is
            optional and saved partially; missing stays missing, and 0 is a real
            recorded zero — never a fabricated default. */}
        <Section icon={BarChart3} title="Performance & Analytics"
          action={canAnalytics && performanceOpen && (
            <SaveButton saving={savingKey === 'metrics'} onClick={onSaveMetrics} />
          )}>
          {!performanceOpen ? (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Performance data can be recorded once the card is Published.
              Current stage: <b>{stageLabel}</b>.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Only actually-recorded values are summarised — nothing invented. */}
              {recordedMetrics.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {recordedMetrics.map((m) => (
                    <div key={m.key} className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-2 text-center">
                      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400" title={m.label}>{m.label}</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        {m.currency ? formatINR(Number(content.metrics?.[m.key])) : String(content.metrics?.[m.key])}
                        {m.unit ? <span className="ml-0.5 text-[10px] font-normal text-gray-400">{m.unit}</span> : null}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {(perfSchema?.metrics ?? []).map((m) => (
                  <div key={m.key}>
                    <label className={labelCls} htmlFor={`perf-${m.key}`}>
                      {m.label}{m.unit ? <span className="font-normal text-gray-400"> ({m.unit})</span> : null}
                    </label>
                    <input
                      id={`perf-${m.key}`}
                      type="number"
                      min={0}
                      step={m.currency ? '0.01' : '1'}
                      inputMode="decimal"
                      value={metrics[m.key] ?? ''}
                      disabled={!canAnalytics}
                      onChange={(e) => setMetrics({ ...metrics, [m.key]: e.target.value })}
                      onBlur={() => setMetricErrors((p) => ({ ...p, [m.key]: nonNegativeNumber(metrics[m.key], m.label) ?? '' }))}
                      aria-invalid={!!metricErrors[m.key]}
                      className={classNames(inputCls, metricErrors[m.key] && invalidInputCls)}
                      placeholder="—"
                    />
                    <FieldError message={metricErrors[m.key]} />
                  </div>
                ))}
              </div>

              <div>
                <label className={labelCls} htmlFor="perf-learnings">Notes / Learnings</label>
                <textarea id="perf-learnings" value={metrics.learnings ?? ''} disabled={!canAnalytics}
                  onChange={(e) => setMetrics({ ...metrics, learnings: e.target.value })} className={inputCls} rows={3}
                  placeholder="What worked, what to repeat, what to avoid…" />
              </div>
              {!canAnalytics && <p className="text-xs italic text-gray-400">Read-only — editing metrics requires the Analytics permission.</p>}
            </div>
          )}
        </Section>

        {/* ── Attachments ───────────────────────────────────────────────────── */}
        <Section icon={Paperclip} title={`Attachments (${content.attachments?.length ?? 0})`}
          action={canEdit && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
              <input type="file" multiple className="hidden" onChange={(e) => { onUpload(e.target.files); e.target.value = ''; }} />
            </label>
          )}>
          {content.attachments?.length ? (
            <ul className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {content.attachments.map((a) => (
                <li key={a.id} className="flex items-center gap-2 py-2">
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <a href={a.file_url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-cyan-700 hover:underline dark:text-cyan-300">
                    {a.file_name}
                  </a>
                  <span className="shrink-0 text-[11px] text-gray-400">
                    {a.uploaderName ?? '—'} · {(a.file_size / 1024).toFixed(0)} KB
                  </span>
                  {canEdit && (
                    <button
                      onClick={async () => {
                        const ok = await confirm({ title: 'Delete Attachment?', message: `Remove '${a.file_name}'? This cannot be undone.`, confirmLabel: 'Delete', intent: 'danger' });
                        if (!ok) return;
                        try {
                          await deleteContentAttachment(id, a.id);
                          hydrate(await fetchContent(id));
                        } catch { toast('Unable to delete the attachment', 'error'); }
                      }}
                      className="shrink-0 rounded p-1 text-gray-400 hover:text-rose-500"
                      aria-label={`Delete ${a.file_name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-gray-400">No attachments yet — reference images, posters, videos, thumbnails and design files live here.</p>
          )}
        </Section>
      </div>

      {/* #29 — mandatory reason for a backward move (detail-page path). */}
      <StageBackReasonModal
        key={stageBack ? `${stageBack.cardId}-${stageBack.to}` : 'none'}
        request={stageBack}
        onCancel={() => setStageBack(null)}
        onConfirm={async (reason) => {
          const req = stageBack!;
          await commitStage(req.from, req.to, reason);
          setStageBack(null);
        }}
      />
    </div>
  );
}
