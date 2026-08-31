'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, Trash2, Paperclip, Upload, X, CheckCircle2, XCircle,
  FileText, Users as UsersIcon, PenLine, Palette, Clapperboard, Scissors,
  ShieldCheck, CalendarClock, Send, BarChart3,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { fetchUsers, type UserDbResponse } from '@/lib/api/users';
import {
  fetchContent, updateContent, moveContentStage, setContentApproval, deleteContent,
  uploadContentAttachments, deleteContentAttachment,
  CONTENT_STAGES, BLOCKED_STAGE, CONTENT_PRIORITIES, CONTENT_PLATFORMS, CONTENT_FORMATS, CONTENT_OBJECTIVES,
  type MarketingContent,
} from '@/lib/api/marketingContent';

const ALL_STAGES = [...CONTENT_STAGES, BLOCKED_STAGE];
const cap = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30';
const labelCls = 'mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300';

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

const METRIC_FIELDS = [
  { key: 'reach', label: 'Reach' },
  { key: 'views', label: 'Views' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'leads', label: 'Leads' },
  { key: 'conversion', label: 'Conversion' },
] as const;

const PUBLISH_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'youtube'] as const;

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
  const [metrics, setMetrics] = useState<any>({});
  const [approvalNote, setApprovalNote] = useState('');
  const [uploading, setUploading] = useState(false);

  const hydrate = useCallback((c: MarketingContent) => {
    setContent(c);
    setCore({
      title: c.title, description: c.description ?? '', format: c.format ?? '', priority: c.priority,
      objective: c.objective ?? '', targetAudience: c.target_audience ?? '', platform: c.platform ?? '',
      cta: c.cta ?? '', references: c.references_text ?? '', notes: c.notes ?? '', deadline: c.deadline ?? '',
    });
    setTeam({
      ownerId: c.owner_id ?? '', designerId: c.designer_id ?? '',
      videographerId: c.videographer_id ?? '', editorId: c.editor_id ?? '',
    });
    setCopy({ script: c.copy_data?.script ?? '', caption: c.copy_data?.caption ?? '', hook: c.copy_data?.hook ?? '', voiceover: c.copy_data?.voiceover ?? '' });
    const sd = c.stage_data ?? {};
    setChecks(Object.fromEntries(CHECKLISTS.map((cl) => [cl.section, { ...(sd[cl.section] ?? {}) }])));
    setSchedule({ platform: sd.schedule?.platform ?? '', date: sd.schedule?.date ?? '', time: sd.schedule?.time ?? '', captionReady: !!sd.schedule?.captionReady });
    setPublished({ ...(sd.published ?? {}) });
    setMetrics({ ...(c.metrics ?? {}) });
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
  useEffect(() => { fetchUsers('marketing').then(setUsers).catch(() => setUsers([])); }, []);

  const save = async (key: string, payload: any, okMsg = 'Saved.') => {
    setSavingKey(key);
    try {
      await updateContent(id, payload);
      hydrate(await fetchContent(id));
      toast(okMsg, 'success');
    } catch (err: any) {
      toast(err?.details?.error || 'Save failed.', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const onMoveStage = async (stage: string) => {
    if (!content || stage === content.stage) return;
    const prev = content.stage;
    setContent({ ...content, stage });
    try {
      await moveContentStage(id, stage);
      toast(`Moved to ${ALL_STAGES.find((s) => s.key === stage)?.label ?? stage}.`, 'success');
    } catch (err: any) {
      setContent((c) => (c ? { ...c, stage: prev } : c));
      toast(err?.details?.error || 'Could not move stage.', 'error');
    }
  };

  const onApproval = async (status: 'approved' | 'rejected') => {
    setSavingKey('approval');
    try {
      await setContentApproval(id, status, approvalNote.trim() || undefined);
      hydrate(await fetchContent(id));
      setApprovalNote('');
      toast(`Content ${status}.`, 'success');
    } catch (err: any) {
      toast(err?.details?.error || 'Approval update failed.', 'error');
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
      toast('Content deleted.', 'success');
      router.push('/dashboard/marketing/content');
    } catch (err: any) {
      toast(err?.details?.error || 'Delete failed.', 'error');
    }
  };

  const onUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      await uploadContentAttachments(id, Array.from(files));
      hydrate(await fetchContent(id));
      toast('Attachment uploaded.', 'success');
    } catch (err: any) {
      toast(err?.details?.error || 'Upload failed.', 'error');
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

  if (loading) return <div className="flex items-center justify-center py-24 text-gray-300"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  if (error || !content) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-12 text-center">
        <p className="text-sm text-rose-600">{error ?? 'Content not found.'}</p>
        <button onClick={() => router.push('/dashboard/marketing/content')} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700">Back to board</button>
      </div>
    );
  }

  const stageLabel = ALL_STAGES.find((s) => s.key === content.stage)?.label ?? content.stage;
  const recordedMetrics = METRIC_FIELDS.filter((m) => content.metrics?.[m.key] !== undefined && content.metrics?.[m.key] !== null && content.metrics?.[m.key] !== '');

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
          action={canEdit && <SaveButton saving={savingKey === 'core'} onClick={() => save('core', { ...core, deadline: core.deadline || null })} />}>
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
                <option value="">Not set</option>
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
                <option value="">Not set</option>
                {CONTENT_OBJECTIVES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Platform</label>
              <select value={core.platform ?? ''} onChange={(e) => setCore({ ...core, platform: e.target.value })} className={inputCls} disabled={!canEdit}>
                <option value="">Not set</option>
                {CONTENT_PLATFORMS.map((p) => <option key={p} value={p}>{cap(p)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Deadline</label>
              <input type="date" value={core.deadline ?? ''} onChange={(e) => setCore({ ...core, deadline: e.target.value })} className={inputCls} disabled={!canEdit} />
            </div>
            <div>
              <label className={labelCls}>CTA</label>
              <input value={core.cta ?? ''} onChange={(e) => setCore({ ...core, cta: e.target.value })} className={inputCls} disabled={!canEdit} />
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
          <Section icon={UsersIcon} title="Team"
            action={canAssign && <SaveButton saving={savingKey === 'team'} onClick={() => save('team', {
              ownerId: team.ownerId ? Number(team.ownerId) : null,
              designerId: team.designerId ? Number(team.designerId) : null,
              videographerId: team.videographerId ? Number(team.videographerId) : null,
              editorId: team.editorId ? Number(team.editorId) : null,
            }, 'Assignments saved.')} />}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([['ownerId', 'Owner (Content Strategist)'], ['designerId', 'Designer'], ['videographerId', 'Videographer'], ['editorId', 'Editor']] as const).map(([k, label]) => (
                <div key={k}>
                  <label className={labelCls}>{label}</label>
                  <select value={team[k] ?? ''} onChange={(e) => setTeam({ ...team, [k]: e.target.value })} className={inputCls} disabled={!canAssign}>
                    {userOptions}
                  </select>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Script / Copy ───────────────────────────────────────────────── */}
          <Section icon={PenLine} title="Script / Copy"
            action={canEdit && <SaveButton saving={savingKey === 'copy'} onClick={() => save('copy', { copyData: copy }, 'Script & copy saved.')} />}>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Hook</label>
                <input value={copy.hook ?? ''} onChange={(e) => setCopy({ ...copy, hook: e.target.value })} className={inputCls} disabled={!canEdit} placeholder="Opening hook" />
              </div>
              <div>
                <label className={labelCls}>Script</label>
                <textarea value={copy.script ?? ''} onChange={(e) => setCopy({ ...copy, script: e.target.value })} className={inputCls} rows={4} disabled={!canEdit} />
              </div>
              <div>
                <label className={labelCls}>Caption</label>
                <textarea value={copy.caption ?? ''} onChange={(e) => setCopy({ ...copy, caption: e.target.value })} className={inputCls} rows={2} disabled={!canEdit} placeholder="Caption + hashtags" />
              </div>
              <div>
                <label className={labelCls}>Voice-over / on-screen text</label>
                <textarea value={copy.voiceover ?? ''} onChange={(e) => setCopy({ ...copy, voiceover: e.target.value })} className={inputCls} rows={2} disabled={!canEdit} />
              </div>
            </div>
          </Section>
        </div>

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

        {/* ── Review / Approval ─────────────────────────────────────────────── */}
        <Section icon={ShieldCheck} title="Review / Approval">
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Current status: <b>{content.approval_status ? cap(content.approval_status) : 'Not reviewed'}</b>
              {content.stage_data?.review?.note && <span className="block text-xs text-gray-400">Note: {content.stage_data.review.note}</span>}
            </p>
            {canApprove ? (
              <>
                <textarea value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} className={inputCls} rows={2} placeholder="Decision note / final corrections (optional)" />
                <div className="flex gap-2">
                  <button onClick={() => onApproval('approved')} disabled={savingKey === 'approval'}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button onClick={() => onApproval('rejected')} disabled={savingKey === 'approval'}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs italic text-gray-400">Approval requires the Approve Content permission.</p>
            )}
          </div>
        </Section>

        {/* ── Scheduled ─────────────────────────────────────────────────────── */}
        <Section icon={CalendarClock} title="Scheduled Publishing"
          action={canSchedule && <SaveButton saving={savingKey === 'schedule'} onClick={() => save('schedule', { scheduleData: schedule }, 'Schedule saved.')} />}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Platform</label>
              <select value={schedule.platform ?? ''} onChange={(e) => setSchedule({ ...schedule, platform: e.target.value })} className={inputCls} disabled={!canSchedule}>
                <option value="">Not selected</option>
                {CONTENT_PLATFORMS.map((p) => <option key={p} value={p}>{cap(p)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" value={schedule.date ?? ''} onChange={(e) => setSchedule({ ...schedule, date: e.target.value })} className={inputCls} disabled={!canSchedule} />
              </div>
              <div>
                <label className={labelCls}>Time</label>
                <input type="time" value={schedule.time ?? ''} onChange={(e) => setSchedule({ ...schedule, time: e.target.value })} className={inputCls} disabled={!canSchedule} />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300 sm:col-span-2">
              <input type="checkbox" checked={!!schedule.captionReady} disabled={!canSchedule}
                onChange={(e) => setSchedule({ ...schedule, captionReady: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
              Caption & hashtags ready
            </label>
          </div>
        </Section>

        {/* ── Published ─────────────────────────────────────────────────────── */}
        <Section icon={Send} title="Published"
          action={canPublish && <SaveButton saving={savingKey === 'published'} onClick={() => save('published', { publishedData: published }, 'Published info saved.')} />}>
          <div className="space-y-2">
            {PUBLISH_PLATFORMS.map((p) => (
              <div key={p} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2">
                <label className="flex w-28 cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={!!published[p]?.done} disabled={!canPublish}
                    onChange={(e) => setPublished((prev) => ({ ...prev, [p]: { ...prev[p], done: e.target.checked } }))}
                    className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                  {cap(p)}
                </label>
                <input
                  value={published[p]?.url ?? ''}
                  onChange={(e) => setPublished((prev) => ({ ...prev, [p]: { ...prev[p], url: e.target.value } }))}
                  disabled={!canPublish}
                  className={classNames(inputCls, 'flex-1 min-w-[180px] py-1.5 text-xs')}
                  placeholder="Post URL (optional)"
                />
              </div>
            ))}
          </div>
        </Section>

        {/* ── Performance / Analytics ───────────────────────────────────────── */}
        <Section icon={BarChart3} title="Performance / Analytics"
          action={canAnalytics && <SaveButton saving={savingKey === 'metrics'} onClick={() => {
            const clean: Record<string, any> = {};
            for (const m of METRIC_FIELDS) {
              const v = metrics[m.key];
              if (v !== undefined && v !== '') clean[m.key] = Number(v);
            }
            if (metrics.learnings !== undefined) clean.learnings = metrics.learnings;
            save('metrics', { metrics: clean }, 'Performance saved.');
          }} />}>
          <div className="space-y-3">
            {/* Only actually-recorded values are shown as results — never fabricated. */}
            {recordedMetrics.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {recordedMetrics.map((m) => (
                  <div key={m.key} className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-2 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{m.label}</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{content.metrics?.[m.key]}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {METRIC_FIELDS.map((m) => (
                <div key={m.key}>
                  <label className={labelCls}>{m.label}</label>
                  <input type="number" min={0} value={metrics[m.key] ?? ''} disabled={!canAnalytics}
                    onChange={(e) => setMetrics({ ...metrics, [m.key]: e.target.value })} className={inputCls} placeholder="—" />
                </div>
              ))}
            </div>
            <div>
              <label className={labelCls}>Learnings</label>
              <textarea value={metrics.learnings ?? ''} disabled={!canAnalytics}
                onChange={(e) => setMetrics({ ...metrics, learnings: e.target.value })} className={inputCls} rows={2}
                placeholder="What worked, what to repeat, what to avoid…" />
            </div>
          </div>
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
                        } catch { toast('Failed to delete attachment.', 'error'); }
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
    </div>
  );
}
