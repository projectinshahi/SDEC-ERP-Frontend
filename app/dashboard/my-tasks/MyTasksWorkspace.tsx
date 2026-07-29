'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Suspense, type ChangeEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import {
  Inbox, Send, Plus, ChevronDown, ChevronUp, Loader2, ListTodo, Search,
  Calendar, User, Users, Flag, Clock, Paperclip, RefreshCw, Pencil, Trash2, ShieldAlert,
  MessageCircle, Activity, Download, BarChart3, AtSign, X, ArrowLeft,
  Star, MoreHorizontal, FileText, SlidersHorizontal, Award,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';
import { usesTaskPoints } from '@/lib/permissions/moduleAccess';
import { PointDistributionModal } from '@/components/tasks/mytasks/PointDistributionModal';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import {
  fetchMyTaskWorkspace, deleteMyTask, updateMyTaskStatus, uploadMyTaskAttachment,
  type MyTask, type MyTaskWorkspace as MyTaskWorkspaceData, type MyTaskActivity,
  type PointAllocation,
} from '@/lib/api/myTasks';
import { MyTaskChat } from '@/components/tasks/mytasks/MyTaskChat';
import { ExportTaskPdfButton } from '@/components/tasks/mytasks/ExportTaskPdfButton';
import { CreateMyTaskModal } from '@/components/tasks/mytasks/CreateMyTaskModal';
import { TaskDashboard } from './TaskDashboard';

type Bucket = 'inbox' | 'outbox';
const COLLAPSE_KEY = 'my-tasks-details-collapsed';

/**
 * Primary navigation. Inbox/Outbox drive the workspace `bucket`; Analytics renders
 * the existing <TaskDashboard />. Kept as one list so the tab bar is a single strip,
 * but the underlying state (bucket + view) is unchanged.
 */
type TabKey = Bucket | 'analytics';
const TABS: { key: TabKey; label: string; icon: any; hint: string }[] = [
  { key: 'inbox', label: 'Inbox', icon: Inbox, hint: 'Tasks assigned to me' },
  { key: 'outbox', label: 'Outbox', icon: Send, hint: 'Tasks I created' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, hint: 'Organisation-wide task analytics' },
];

// ── Inbox filters (client-side over the already-fetched inbox; no extra API) ──
type DateKey = 'today' | 'delayed' | 'upcoming';
const DATE_FILTERS: { key: DateKey | 'all'; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'delayed', label: 'Delayed' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'all', label: 'All' },
];
// Default Inbox view = all tasks, as requested by user.
const DEFAULT_DATE_FILTERS: (DateKey | 'all')[] = ['all'];
const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'done', label: 'Done' },
  { key: 'approved', label: 'Approved' },
];
const COMPLETED_STATUSES = ['done', 'approved'];
// Read-state filter. Reuses the EXISTING per-user `unread` flag the card badges
// already use (server-computed: never opened OR changed since last open OR unread
// chat messages / @mentions). This adds NO second unread mechanism — it only
// filters on the flag the workspace payload already carries.
type ReadKey = 'all' | 'unread' | 'read';
const READ_FILTERS: { key: ReadKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];
function matchRead(t: MyTask, mode: ReadKey): boolean {
  if (mode === 'unread') return !!t.unread;
  if (mode === 'read') return !t.unread;
  return true;
}

/**
 * Instant text search across the fields a user actually looks a task up by:
 * Task Name, Creator (Owner), Task In-Charge, Assigned Members and Project.
 * Purely client-side over the already-fetched workspace payload — no API call.
 * (Department is not part of this payload; the Analytics dashboard already has a
 * server-side Department filter, which is where that dimension is applicable.)
 */
function matchSearch(t: MyTask, needle: string): boolean {
  if (!needle) return true;
  const inChargeName = t.inChargeId ? t.members.find((m) => m.id === t.inChargeId)?.name : null;
  const haystack = [t.title, t.createdBy?.name, inChargeName, t.projectName, ...t.members.map((m) => m.name)];
  return haystack.some((s) => !!s && s.toLowerCase().includes(needle));
}

/**
 * Debounced mirror of a value. The filters are client-side, so this is about render
 * cost rather than API traffic: typing stays instant while the filter pass over a
 * large list runs at most once per `delay`.
 */
function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
// Per-tab date defaults: Inbox opens on actionable work (Today + Delayed);
// Outbox opens on everything the user created.
const DEFAULT_DATE_BY_BUCKET: Record<'inbox' | 'outbox', string[]> = {
  inbox: DEFAULT_DATE_FILTERS,
  outbox: ['all'],
};

// Full standard status workflow (dropdown offers every stage, incl. Waiting & Approved).
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'done', label: 'Done' },
  { value: 'approved', label: 'Approved' },
];
// Standard waiting-dependency reasons; 'Other' reveals a free-text field.
const WAITING_REASONS = ['Client', 'CEO', 'HR', 'Accounts', 'Another Team', 'Other'];
function statusMeta(s: string) {
  if (s === 'approved') return { label: 'Approved', tone: 'bg-green-100 text-green-700 border-green-300' };
  if (s === 'done') return { label: 'Done', tone: 'bg-violet-50 text-violet-700 border-violet-200' };
  if (s === 'waiting') return { label: 'Waiting', tone: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (s === 'in_progress') return { label: 'In Progress', tone: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (s === 'todo') return { label: 'To Do', tone: 'bg-slate-100 text-slate-600 border-slate-200' };
  return { label: s || '—', tone: 'bg-slate-100 text-slate-600 border-slate-200' };
}
function priorityMeta(p: string) {
  const v = (p || '').toLowerCase();
  if (['high', 'urgent', 'critical'].includes(v)) return { dot: 'bg-rose-500', text: 'text-rose-600', badge: 'bg-rose-50 text-rose-700 border-rose-200', label: v === 'urgent' ? 'Urgent' : 'High' };
  if (['low', 'minor'].includes(v)) return { dot: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Low' };
  return { dot: 'bg-amber-500', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Medium' };
}
function todayYmd(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

/**
 * True on phones (<768px). Drives the DEDICATED mobile UI; tablet (≥768px) and
 * desktop keep the existing layout untouched. SSR-safe (false until mounted), so it
 * matches the server render, then flips on the client after `matchMedia` resolves.
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return isMobile;
}

// Mobile Due chips = single-select quick presets over the existing dateFilters/statusFilters.
// All/Today/Delayed/Upcoming set the DATE bucket only (leaving Status/Read untouched);
// Status + Read are the finer axes, moved into the Filter bottom-sheet. All axes drive the
// SAME state + the matchDateStatus / matchRead engines the desktop uses (no mobile-specific
// filter logic).
const MOBILE_CHIPS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'delayed', label: 'Delayed' },
  { key: 'upcoming', label: 'Upcoming' },
];

// Deterministic coloured ring for the circular task-ID badge (mobile), matching the
// reference's varied ID circles. Stable per task, so the same task keeps its colour.
const CIRCLE_RINGS = [
  'border-indigo-500 text-indigo-600', 'border-violet-500 text-violet-600',
  'border-blue-500 text-blue-600', 'border-emerald-500 text-emerald-600',
  'border-amber-500 text-amber-600', 'border-rose-500 text-rose-600',
  'border-cyan-500 text-cyan-600', 'border-orange-500 text-orange-600',
];
const taskRing = (id: number) => CIRCLE_RINGS[Math.abs(id) % CIRCLE_RINGS.length];

/**
 * Mobile Filter bottom-sheet (phones only). Houses the advanced Status + Read filters
 * that used to sit as inline dropdowns, keeping the list header clean (Search + Filter
 * button + Due chips). It edits a local DRAFT seeded from the currently-applied filters
 * and commits ONLY on Apply — reusing the EXACT same statusFilters/readFilter state and
 * the matchDateStatus/matchRead engine the desktop uses (no mobile-specific filter logic).
 * The parent conditionally mounts it, so the scroll-lock/Escape effect is leak-free.
 * Rendered inside `.mytasks-scope`, so it inherits the My Tasks dark palette.
 */
function MobileFilterSheet({
  initialStatus, initialRead, initialInCharge = null, inChargeOptions, onApply, onClose,
}: {
  initialStatus: Set<string>;
  initialRead: ReadKey;
  initialInCharge?: number | null;
  /** Provided ONLY on the Outbox → renders the reused Task In-Charge searchable dropdown. */
  inChargeOptions?: { id: number; name: string }[];
  onApply: (status: Set<string>, read: ReadKey, inCharge: number | null) => void;
  onClose: () => void;
}) {
  const [draftStatus, setDraftStatus] = useState<Set<string>>(() => new Set(initialStatus));
  const [draftRead, setDraftRead] = useState<ReadKey>(() => initialRead);
  const [draftInCharge, setDraftInCharge] = useState<number | null>(() => initialInCharge);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const toggleStatus = (key: string) => setDraftStatus((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const pillCls = (active: boolean) => classNames(
    'rounded-full px-3.5 py-2 text-[13px] font-semibold transition',
    active ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Filter tasks">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden="true" />
      {/* No `overflow-hidden` on the panel: the reused In-Charge dropdown is absolutely
          positioned and must float over the sheet un-clipped. Status + Read live in a
          scrollable region so the pinned footer stays reachable when the sheet is
          height-constrained (landscape / large text); the In-Charge row + footer are pinned
          (shrink-0), which ALSO keeps the In-Charge dropdown out of the scroll clip. */}
      <div className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl border-t border-gray-100 bg-white shadow-2xl animate-slide-up">
        {/* Grab handle */}
        <div className="flex shrink-0 justify-center pt-3"><span className="h-1.5 w-10 rounded-full bg-gray-300" /></div>
        <div className="flex shrink-0 items-center justify-between px-5 py-3">
          <h2 className="text-base font-bold text-gray-900">Filters</h2>
          <button type="button" onClick={onClose} aria-label="Close filters"
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        {/* Status + Read — scrollable when the sheet can't fit its content. overflow-y-auto
            self-resolves this flex child's min-size to 0, so it shrinks + scrolls while the
            footer stays pinned. It clips its OWN descendants only — the In-Charge dropdown is
            a sibling below, so it is never clipped by this box. */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pt-1 pb-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">Status</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setDraftStatus(new Set())} className={pillCls(draftStatus.size === 0)}>All</button>
              {STATUS_FILTERS.map((f) => (
                <button key={f.key} type="button" onClick={() => toggleStatus(f.key)} className={pillCls(draftStatus.has(f.key))}>{f.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">Read Status</p>
            <div className="flex flex-wrap gap-2">
              {READ_FILTERS.map((f) => (
                <button key={f.key} type="button" onClick={() => setDraftRead(f.key)} className={pillCls(draftRead === f.key)}>{f.label}</button>
              ))}
            </div>
          </div>
        </div>
        {/* Task In-Charge — Outbox only. Pinned OUTSIDE the scroll region (shrink-0) so the
            reused searchable dropdown (openUp) floats over the sheet without being clipped. */}
        {inChargeOptions && (
          <div className="shrink-0 px-5 pb-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">Task In-Charge</p>
            <InChargeFilter options={inChargeOptions} value={draftInCharge} onChange={setDraftInCharge} openUp />
          </div>
        )}
        <div className="flex shrink-0 items-center gap-3 border-t border-gray-100 px-5 py-3">
          <button type="button" onClick={() => { setDraftStatus(new Set()); setDraftRead('all'); setDraftInCharge(null); }}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">Reset</button>
          <button type="button" onClick={() => { onApply(draftStatus, draftRead, draftInCharge); onClose(); }}
            className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">Apply</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile due line in the reference format: "Overdue • 10 Jul 2026 • 05:33 PM" (rose),
 * "Today • …" (emerald), "Upcoming • …" (gray). Approved is neutralised (finalized,
 * exits the overdue workflow — mirrors the shared fmtDue rule). Mobile-only formatter,
 * so the desktop/tablet fmtDue is untouched.
 */
function mobileDue(task: MyTask): { text: string; tone: string } {
  const ymd = task.dueDate;
  if (!ymd) return { text: 'No due date', tone: 'text-gray-400' };
  const dateStr = new Date(ymd + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = formatTime12h(task.dueTime);
  const time = timeStr ? ` • ${timeStr}` : '';
  const today = todayYmd();
  if (task.status === 'approved') return { text: `Due ${dateStr}${time}`, tone: 'text-gray-500' };
  if (ymd < today) return { text: `Overdue • ${dateStr}${time}`, tone: 'text-rose-600' };
  if (ymd === today) return { text: `Today • ${dateStr}${time}`, tone: 'text-emerald-600' };
  return { text: `Upcoming • ${dateStr}${time}`, tone: 'text-gray-500' };
}

/** Right-aligned "last activity" time on a mobile card: clock time if today, else date. */
function mobileActivityTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

// Client-only favourites (localStorage) — a per-device star, NO API/DB change.
const FAV_KEY = 'my-tasks-favorites';
function readFavorites(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try { return new Set<number>(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); } catch { return new Set(); }
}
function useFavorite(taskId: number): [boolean, () => void] {
  const [fav, setFav] = useState(false);
  useEffect(() => { setFav(readFavorites().has(taskId)); }, [taskId]);
  const toggle = useCallback(() => {
    const s = readFavorites();
    if (s.has(taskId)) s.delete(taskId); else s.add(taskId);
    try { localStorage.setItem(FAV_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
    setFav(s.has(taskId));
  }, [taskId]);
  return [fav, toggle];
}
function formatTime12h(time?: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtDue(ymd?: string | null, time?: string | null, status?: string): { label: string; tone: string } {
  if (!ymd) return { label: 'No due date', tone: 'text-gray-400' };
  const today = todayYmd();
  const nice = new Date(ymd + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = formatTime12h(time);
  const timeSuffix = timeStr ? ` • ${timeStr}` : '';
  // An APPROVED task is finalized — it exits the overdue workflow entirely, so its due
  // date is shown NEUTRALLY (never "Overdue"/"Due today", never the rose/amber accent),
  // even if it was completed after the due date. Every other status is unchanged.
  if (status !== 'approved') {
    if (ymd === today) return { label: `Due today${timeSuffix}`, tone: 'text-amber-600 font-semibold' };
    if (ymd < today) return { label: `Overdue · ${nice}${timeSuffix}`, tone: 'text-rose-600 font-semibold' };
  }
  return { label: `Due ${nice}${timeSuffix}`, tone: 'text-gray-500' };
}
// Which date bucket a task falls into (undated → upcoming). Drives the Inbox date filter.
function dateBucketOf(task: MyTask): DateKey {
  if (!task.dueDate) return 'upcoming';
  const t = todayYmd();
  if (task.dueDate < t) return 'delayed';
  if (task.dueDate === t) return 'today';
  return 'upcoming';
}
// Shared Date+Status match. `strictDelayed` (Outbox) excludes COMPLETED tasks from
// the Delayed bucket per its spec ("overdue AND not completed"); Inbox passes false
// so its existing behaviour is unchanged.
function matchDateStatus(t: MyTask, dSel: Set<string>, sSel: Set<string>, strictDelayed: boolean): boolean {
  let dateOk = dSel.size === 0 || dSel.has('all');
  if (!dateOk) {
    const b = dateBucketOf(t);
    // 'waiting' and 'approved' are NEVER in the Delayed bucket anywhere: waiting =
    // dependency outside the assignee's control; approved = finalized, so it exits the
    // overdue workflow (even if completed after its due date). 'done' is excluded from
    // Delayed only on the Outbox (strict) — non-approved behaviour is unchanged.
    const notDelayed = b === 'delayed'
      && (t.status === 'waiting' || t.status === 'approved' || (strictDelayed && COMPLETED_STATUSES.includes(t.status)));
    dateOk = dSel.has(b) && !notDelayed;
  }
  const statusOk = sSel.size === 0 || sSel.has(t.status);
  return dateOk && statusOk;
}
// Optional Waiting-Reason filter — only narrows Waiting tasks; a no-op (passes) when
// unset or for non-waiting tasks, so it composes cleanly with the Status filter.
function matchWaitingReason(t: MyTask, reason: string | null): boolean {
  return reason == null || t.status !== 'waiting' || (t.waitingReason ?? null) === reason;
}
function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
function initials(name: string) {
  return (name || '?').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}
function MemberAvatars({ members }: { members: { id: number; name: string }[] }) {
  if (!members.length) return <span className="text-[11px] text-gray-400">No members</span>;
  const shown = members.slice(0, 3);
  const extra = members.length - shown.length;
  return (
    <span className="flex items-center -space-x-1.5">
      {shown.map((m) => (
        <span key={m.id} title={m.name} className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-indigo-100 text-[9px] font-bold text-indigo-700">
          {initials(m.name)}
        </span>
      ))}
      {extra > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-100 text-[9px] font-bold text-gray-500">+{extra}</span>}
    </span>
  );
}

/* ── left-panel task card ─────────────────────────────────────────────────
   Compact, scannable: title · priority + status badges · due date+time · owner
   & in-charge · member avatars. Unread tasks get a subtle red left accent + dot. */
function TaskRow({ task, active, onClick, showDirection }: { task: MyTask; active: boolean; onClick: () => void; showDirection?: boolean }) {
  const prio = priorityMeta(task.priority);
  const due = fmtDue(task.dueDate, task.dueTime, task.status);
  const st = statusMeta(task.status);
  const inChargeName = task.inChargeId ? (task.members.find((m) => m.id === task.inChargeId)?.name || '—') : '—';
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'w-full rounded-xl border px-3.5 py-3 text-left transition',
        active
          ? 'border-indigo-400 bg-indigo-50/60 ring-1 ring-indigo-200'
          : task.unread
            ? 'border-gray-200 border-l-4 border-l-rose-500 bg-rose-50/30 hover:bg-rose-50/50'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
      )}
    >
      {/* Title + unread indicators */}
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          {task.unread && !active && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" title="Unread" />}
          <span className={classNames('truncate text-sm text-gray-800', task.unread && !active ? 'font-bold' : 'font-semibold')}>{task.title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {/* Unread @mention badge — visible ONLY to the mentioned user (the count is
              computed per-user server-side) and cleared when they open the task. */}
          {task.unreadMentions > 0 && !active && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700"
              title={`${task.unreadMentions} unread mention${task.unreadMentions === 1 ? '' : 's'} of you`}
            >
              <AtSign className="h-2.5 w-2.5" />
              {task.unreadMentions > 1 && task.unreadMentions}
            </span>
          )}
          {task.unreadCount > 0 && !active && (
            <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white"
              title={`${task.unreadCount} unread message${task.unreadCount === 1 ? '' : 's'}`}>{task.unreadCount}</span>
          )}
        </span>
      </div>

      {/* Priority + Status (+ Sent/Received direction) */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={classNames('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', prio.badge)}>
          <span className={classNames('h-1.5 w-1.5 rounded-full', prio.dot)} /> {prio.label}
        </span>
        <span className={classNames('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', st.tone)}
          title={task.status === 'waiting' && task.waitingReason ? `Waiting: ${task.waitingReason}` : undefined}>{st.label}</span>
        {showDirection && (
          <span
            className={classNames('inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold',
              task.createdByMe ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600')}
            title={task.createdByMe ? 'Created by me (Sent)' : 'Assigned to me (Received)'}
          >
            {task.createdByMe ? 'Sent' : 'Received'}
          </span>
        )}
      </div>

      {/* Due date + time (combined) */}
      <div className={classNames('mt-2 flex items-center gap-1 text-[11px]', due.tone)}>
        <Calendar className="h-3 w-3" /> {due.label}
      </div>

      {/* Owner + In-Charge */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1">
          <User className="h-3 w-3 text-gray-400" /> Owner: <span className="font-medium text-gray-700">{task.createdBy?.name || '—'}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden>⭐</span> In-Charge: <span className="font-medium text-gray-700">{inChargeName}</span>
        </span>
      </div>

      {/* Assigned members */}
      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[11px] text-gray-400">Members:</span>
        <MemberAvatars members={task.members} />
      </div>
    </button>
  );
}

/* ── details panel ────────────────────────────────────────────────────── */
function DetailRow({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <div className="text-sm text-gray-800 break-words">{children}</div>
      </div>
    </div>
  );
}

function UserAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const s = size === 'md' ? 'h-9 w-9 text-xs' : 'h-6 w-6 text-[9px]';
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  return (
    <div className={classNames('inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold shrink-0 shadow-sm', s)}>
      {initials}
    </div>
  );
}

function ActivityTimeline({ activities }: { activities: MyTaskActivity[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
          <Activity className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-700">No activity yet</h3>
        <p className="text-xs text-gray-500 mt-1">Activity will appear here as changes are made.</p>
      </div>
    );
  }
  return (
    <div className="space-y-0 px-5 py-4">
      {activities.map((act, i) => (
        <div key={act.id} className="flex gap-3.5 text-sm relative">
          <div className="flex flex-col items-center">
            <UserAvatar name={act.user?.name || '??'} size="md" />
            {i !== activities.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1.5 min-h-[16px]" />}
          </div>
          <div className="pb-5 pt-0.5 flex-1 min-w-0">
            <p className="text-gray-800 leading-snug">
              <span className="font-semibold text-gray-900">{act.user?.name || 'Unknown'}</span>{' '}
              <span className="text-gray-600">{act.action}</span>
            </p>
            {act.details && typeof act.details === 'object' && Object.keys(act.details).length > 0 && (
              <div className="mt-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1.5 rounded-lg">
                {act.details.from && act.details.to ? (
                  <span>{act.details.from} → {act.details.to}</span>
                ) : (
                  <span>{JSON.stringify(act.details)}</span>
                )}
              </div>
            )}
            <p className="mt-1 text-[11px] text-gray-400">{fmtDate(act.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Description with Read More / Read Less.
 *
 * The clamp is CSS (`line-clamp-4`), so it truncates at a LINE boundary — never
 * mid-word — while `whitespace-pre-wrap` keeps the author's line breaks intact.
 * The toggle appears only when the text ACTUALLY overflows (measured from the DOM
 * rather than guessed from character count), so short descriptions render exactly
 * as they do today, with no button.
 */
function TaskDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    // Measure ONLY while clamped: once expanded the element is at full height, so a
    // re-measure would conclude it "fits" and wrongly hide the Read Less action.
    if (!el || expanded) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    // A narrower panel can push a short description past 4 lines — re-check on resize.
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, expanded]);

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <p
        ref={ref}
        className={classNames(
          'whitespace-pre-wrap text-sm leading-relaxed text-gray-700',
          !expanded && 'line-clamp-4',
        )}
      >
        {text}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-700 hover:underline"
        >
          {expanded ? 'Read Less' : 'Read More'}
        </button>
      )}
    </div>
  );
}

/** Reason picker shown when a task moves to (or edits) Waiting status. Self-contained
    overlay — reuses the ERP amber "waiting" tone; 'Other' reveals a free-text field. */
function WaitingReasonModal({
  open, initial, onCancel, onConfirm,
}: {
  open: boolean; initial: string; onCancel: () => void; onConfirm: (reason: string) => void;
}) {
  const presetOf = (v: string) => (v && WAITING_REASONS.includes(v) ? v : v ? 'Other' : 'Client');
  const [choice, setChoice] = useState<string>(() => presetOf(initial));
  const [custom, setCustom] = useState<string>(() => (initial && !WAITING_REASONS.includes(initial) ? initial : ''));
  // Re-seed whenever the picker (re)opens — the reason differs per task/transition.
  useEffect(() => {
    if (open) {
      setChoice(presetOf(initial));
      setCustom(initial && !WAITING_REASONS.includes(initial) ? initial : '');
    }
  }, [open, initial]);
  if (!open) return null;
  const finalReason = choice === 'Other' ? custom.trim() : choice;
  const valid = finalReason.length > 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <ShieldAlert className="h-4 w-4 text-amber-500" /> Waiting — select a reason
        </h3>
        <p className="mt-1 text-xs text-gray-500">Why is this task blocked? Stored on the task and logged to its Activity Timeline.</p>
        <div className="mt-3 space-y-1.5">
          {WAITING_REASONS.map((r) => (
            <label key={r} className={classNames('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm',
              choice === r ? 'border-amber-300 bg-amber-50' : 'border-gray-200 hover:bg-gray-50')}>
              <input type="radio" name="waitingReason" checked={choice === r} onChange={() => setChoice(r)}
                className="h-3.5 w-3.5 text-amber-600 focus:ring-amber-500" />
              <span className="font-medium text-gray-700">{r}</span>
            </label>
          ))}
          {choice === 'Other' && (
            <input autoFocus value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={255}
              placeholder="Describe the dependency…"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500" />
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
          <button type="button" disabled={!valid} onClick={() => onConfirm(finalReason)}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40">Set Waiting</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Attachment upload control for the details / mobile Attachments tab. Any task
 * PARTICIPANT (creator / In-Charge / assigned member) can share files — reuses the
 * existing uploadMyTaskAttachment API + Cloudinary + Socket.IO (the backend logs the
 * activity and fans out `mytask_changed`, so all participants see it in real time).
 * Rendered only inside the details panel, which non-participants can never open.
 */
function AttachmentUpload({ taskId, onUploaded }: { taskId: number; onUploaded: () => void }) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      await uploadMyTaskAttachment(taskId, fd);
      onUploaded();
      toast(files.length === 1 ? 'Attachment uploaded.' : `${files.length} attachments uploaded.`, 'success');
    } catch {
      toast('Failed to upload attachment(s).', 'error');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  return (
    <>
      <input ref={inputRef} type="file" multiple onChange={onChange} className="hidden" aria-hidden="true" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        {busy ? 'Uploading…' : 'Upload files'}
      </button>
    </>
  );
}

function DetailsPanel({
  task, collapsed, onToggle, canEdit, canDelete, onEdit, onDelete, onStatus, onBack,
  canExecute, canApprove, currentUserId, generatedBy, onUploaded,
}: {
  task: MyTask; collapsed: boolean; onToggle: () => void;
  canEdit: boolean; canDelete: boolean;
  onEdit: () => void; onDelete: () => void; onStatus: (s: string, waitingReason?: string) => void;
  /** Mobile-only: return to the task list (WhatsApp-style back). */
  onBack: () => void;
  /** Execution rights: change status / waiting reason (creator, In-Charge, admin). */
  canExecute: boolean;
  /** Owner rights: approve the task (creator / admin only). */
  canApprove: boolean;
  currentUserId?: number;
  /** Exporter name for the "Generated by" line on the PDF. */
  generatedBy: string;
  /** Refresh the workspace after an attachment upload (real-time also refetches). */
  onUploaded: () => void;
}) {
  const prio = priorityMeta(task.priority);
  const due = fmtDue(task.dueDate, task.dueTime, task.status);
  const st = statusMeta(task.status);
  const [activeTab, setActiveTab] = useState<'chat' | 'attachments' | 'timeline'>('chat');
  const [waitingOpen, setWaitingOpen] = useState(false); // Waiting-reason picker
  // Points are a Development-side concept; Sales users get the plain task view.
  const { user: pointsUser } = useAuth();
  const showPoints = usesTaskPoints(pointsUser);

  // Everyone who can be @mentioned = Owner (creator) + In-Charge + assigned members,
  // de-duplicated by id and excluding inactive accounts. The creator is included even
  // when they never assigned themselves (In-Charge is always a member already).
  const mentionables = useMemo(() => {
    const byId = new Map<number, { id: number; name: string }>();
    const c = task.createdBy;
    if (c && c.id && c.active !== false) byId.set(c.id, { id: c.id, name: c.name });
    for (const m of task.members) if (m.active !== false) byId.set(m.id, { id: m.id, name: m.name });
    return [...byId.values()];
  }, [task.createdBy, task.members]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
        {/* WhatsApp-style back — mobile only. Desktop keeps the persistent split view,
            where the list is always beside the details and Back would be meaningless. */}
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to task list"
          className="-ml-2 shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 lg:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={classNames('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', st.tone)}>{st.label}</span>
            <span className={classNames('inline-flex items-center gap-1 text-xs font-semibold', prio.text)}>
              <span className={classNames('h-2 w-2 rounded-full', prio.dot)} /> {prio.label}
            </span>
          </div>
          <h2 className="mt-1.5 truncate text-lg font-bold text-gray-900">{task.title}</h2>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {/* Export the whole task as a PDF — available to anyone who can view the
              task (the panel only renders for accessible tasks; no extra gating). */}
          <ExportTaskPdfButton task={task} generatedBy={generatedBy} />
          {canEdit && (
            <button type="button" onClick={onEdit} title="Edit task" className="rounded-lg p-2 sm:p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"><Pencil className="h-4 w-4" /></button>
          )}
          {canDelete && (
            <button type="button" onClick={onDelete} title="Delete task" className="rounded-lg p-2 sm:p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
          )}
          <button type="button" onClick={onToggle} className="rounded-lg p-2 sm:p-1.5 text-gray-400 hover:bg-gray-50 transition-colors">
            {collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* The 55% cap + inner scroll only make sense in the fixed-height desktop
          pane; on mobile the details simply flow above the chat (one page scroll). */}
      {!collapsed && (
        <div className="shrink-0 lg:max-h-[55%] lg:overflow-y-auto">
          {/* ── SECTION 1 & 2: Basic Info + Responsibility side-by-side ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
            {/* Section 1: Basic Information */}
            <div className="p-5 space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                <Flag className="h-3 w-3" /> Basic Information
              </h3>

              {task.description ? (
                <TaskDescription text={task.description} />
              ) : (
                <p className="text-sm italic text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">No description provided.</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <DetailRow icon={Flag} label="Priority"><span className={prio.text}>{prio.label}</span></DetailRow>
                <DetailRow icon={ListTodo} label="Status">
                  {canExecute ? (
                    <select
                      value={task.status}
                      onChange={(e) => {
                        const v = e.target.value;
                        // 'waiting' needs a reason first — open the picker instead of
                        // committing; the controlled select reverts to task.status until confirmed.
                        if (v === 'waiting') setWaitingOpen(true);
                        else onStatus(v);
                      }}
                      className="rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition"
                    >
                      {/* Approve is the owner's verification step — hidden from the
                          In-Charge. Kept when it IS the current status, otherwise a
                          controlled <select> would render blank on an approved task. */}
                      {STATUS_OPTIONS
                        .filter((o) => o.value !== 'approved' || canApprove || task.status === 'approved')
                        .map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : st.label}
                </DetailRow>
                <DetailRow icon={Calendar} label="Due"><span className={due.tone}>{due.label}</span></DetailRow>
                <DetailRow icon={Clock} label="Created">{fmtDate(task.createdAt)}</DetailRow>
                {/* Same row as the mobile panel — Task Details must show the points
                    on BOTH breakpoints. Hidden for users outside the points system. */}
                {showPoints && (
                  <DetailRow icon={Award} label="Estimated Points">
                    <span className="font-medium text-gray-700">
                      {task.estimatedPoints || 0}
                      <span className="ml-1.5 text-xs font-normal text-gray-400">
                        {task.status === 'approved' ? 'awarded' : 'awarded after approval'}
                      </span>
                    </span>
                  </DetailRow>
                )}
              </div>

              {task.status === 'waiting' && (
                <DetailRow icon={ShieldAlert} label="Waiting Reason">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {task.waitingReason || '—'}
                    </span>
                    {canExecute && (
                      <button type="button" onClick={() => setWaitingOpen(true)} className="text-xs font-medium text-indigo-600 hover:underline">
                        Edit
                      </button>
                    )}
                  </span>
                </DetailRow>
              )}

              <WaitingReasonModal
                open={waitingOpen}
                initial={task.waitingReason || ''}
                onCancel={() => setWaitingOpen(false)}
                onConfirm={(reason) => { setWaitingOpen(false); onStatus('waiting', reason); }}
              />
            </div>

            {/* Section 2: Responsibility */}
            <div className="p-5 space-y-4 bg-gray-50/40">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                <Users className="h-3 w-3" /> Responsibility
              </h3>

              <div className="space-y-4">
                <DetailRow icon={User} label="Created By (Owner)">
                  <div className="flex items-center gap-2 mt-0.5">
                    <UserAvatar name={task.createdBy?.name || '?'} />
                    <span className="font-medium text-gray-700">{task.createdBy?.name || '—'}</span>
                  </div>
                </DetailRow>

                {task.inChargeId && (
                  <DetailRow icon={User} label="Task In-Charge">
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-sm font-medium text-blue-700 shadow-sm">
                        ⭐ <UserAvatar name={task.members.find((m) => m.id === task.inChargeId)?.name || '?'} />
                        {task.members.find((m) => m.id === task.inChargeId)?.name || 'Unknown'}
                      </span>
                    </div>
                  </DetailRow>
                )}

                <DetailRow icon={Users} label="Assigned Members">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {task.members.length ? task.members.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm">
                        <UserAvatar name={m.name} />
                        {m.name}
                      </span>
                    )) : (
                      <span className="text-sm text-gray-400 italic">No members assigned</span>
                    )}
                  </div>
                </DetailRow>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 3: Activity (Tabs) — ALWAYS mounted, independent of `collapsed`, so
          Task Chat + Activity Timeline stay visible AND MyTaskChat's mount effect keeps
          advancing the per-user read cursor (markMyTaskRead). Collapse hides only the
          details grid above. ── */}
      <div className="flex flex-col flex-1 min-h-0 border-t border-gray-200">
        {/* Tab bar */}
        {/* MOBILE: three equal-width tabs with short labels, so the row always fits
                the viewport (the full labels totalled ~450px and overflowed a 375px
                screen, clipping the last tab AND pushing the whole panel sideways).
                `min-w-0` lets a tab shrink; `overflow-x-auto` is a safety net so an
                unusually long count can never force the page wide again.
                DESKTOP (sm+): reverts to the original auto-width tabs + full labels. */}
        <div className="flex items-center overflow-x-auto border-b border-gray-100 bg-gray-50/80 px-2 shrink-0">
          {[
            { key: 'chat' as const, icon: MessageCircle, label: 'Task Chat', short: 'Chat', count: 0 },
            { key: 'attachments' as const, icon: Paperclip, label: 'Attachments', short: 'Files', count: task.attachments.length },
            { key: 'timeline' as const, icon: Activity, label: 'Activity Timeline', short: 'Activity', count: (task.activities || []).length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              title={tab.label}
              className={classNames(
                'flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2 py-3 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap sm:flex-none sm:justify-start sm:px-3.5',
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              <tab.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="sm:hidden">{tab.short}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span className="ml-0.5 shrink-0 rounded-full bg-gray-200 px-1.5 py-px text-[10px] font-bold text-gray-600">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 bg-white relative min-h-[340px]">
          {activeTab === 'chat' && (
            <div className="absolute inset-0">
              <MyTaskChat key={task.id} taskId={task.id} currentUserId={currentUserId} members={mentionables} />
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="p-5 space-y-4">
              {/* Any participant (creator / In-Charge / member) can share files. */}
              <AttachmentUpload taskId={task.id} onUploaded={onUploaded} />
              {task.attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {task.attachments.map((a) => (
                    <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-indigo-300 hover:shadow-md group">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100 transition-colors">
                        <Paperclip className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-800">{a.file_name}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {(a.file_size / 1024).toFixed(1)} KB
                          {a.uploader?.name && <> • Uploaded by {a.uploader.name}</>}
                        </p>
                      </div>
                      <Download className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
                    <Paperclip className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">No attachments available</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-[220px]">Files attached to this task will appear here.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="h-full overflow-y-auto">
              <ActivityTimeline activities={task.activities || []} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════ MOBILE (<768px) — dedicated experience ══════════════════
 * A phone-only PRESENTATION layer over the SAME data + handlers the desktop uses.
 * Reuses every leaf (MyTaskChat, ActivityTimeline, UserAvatar, TaskDescription,
 * DetailRow, WaitingReasonModal, ExportTaskPdfButton, fmtDue/statusMeta/priorityMeta,
 * STATUS_OPTIONS) — NO new business logic, NO new API, NO duplicate of the desktop
 * DetailsPanel behaviour. The tablet (≥768px) + desktop tree is left untouched.
 * ─────────────────────────────────────────────────────────────────────────────── */

/** Overlapping member avatars with a "+N more" chip (reuses the existing UserAvatar). */
function MemberAvatarGroup({ members, max = 3 }: { members: { id: number; name: string }[]; max?: number }) {
  if (!members.length) return <span className="text-sm italic text-gray-400">No members assigned</span>;
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <div key={m.id} title={m.name} className={classNames('rounded-full ring-2 ring-white', i > 0 && '-ml-2')}>
          <UserAvatar name={m.name} />
        </div>
      ))}
      {extra > 0 && (
        <span className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 ring-2 ring-white">
          +{extra}
        </span>
      )}
    </div>
  );
}

/** One item in the mobile bottom navigation (count badge overlaps the icon). */
function BottomTab({ active, icon: Icon, label, count, onClick }: {
  active: boolean; icon: any; label: string; count?: number; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className={classNames('flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-colors',
        active ? 'text-indigo-600' : 'text-gray-500')}>
      <span className="relative">
        <Icon className="h-5 w-5" />
        {count != null && count > 0 && (
          <span className="absolute -right-2.5 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </span>
      {label}
    </button>
  );
}

/** Reference-matched mobile task card: circular coloured ID badge · title · due line
 *  (Overdue/Today/Upcoming • date • time) · last-activity time · unread badge. */
function MobileTaskCard({ task, onOpen }: { task: MyTask; onOpen: () => void }) {
  const due = mobileDue(task);
  const unread = !!task.unread || task.unreadCount > 0;
  const at = mobileActivityTime(task.updatedAt);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-left shadow-sm transition active:scale-[0.99]"
    >
      <div className={classNames('flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 bg-white', taskRing(task.id))}>
        <span className="text-[11px] font-bold leading-none">{task.id}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={classNames('truncate text-[15px] text-gray-900', unread ? 'font-bold' : 'font-semibold')}>{task.title}</p>
        <p className={classNames('mt-0.5 truncate text-[12px] font-medium', due.tone)}>{due.text}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {at && <span className="text-[11px] text-gray-400">{at}</span>}
        <div className="flex items-center gap-1">
          {task.unreadMentions > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-500"><AtSign className="h-3 w-3" />{task.unreadMentions}</span>
          )}
          {unread && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
              {task.unreadCount > 0 ? task.unreadCount : '•'}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/** Full-screen mobile Task Details sheet: collapsed-by-default header + expandable
 *  info panel + the existing Chat / Files / Activity tabs (chat pins its own input). */
function MyTaskMobileDetails({
  task, onBack, canEdit, canDelete, canExecute, canApprove, onEdit, onDelete, onStatus, currentUserId, generatedBy, onUploaded,
}: {
  task: MyTask; onBack: () => void;
  canEdit: boolean; canDelete: boolean; canExecute: boolean; canApprove: boolean;
  onEdit: () => void; onDelete: () => void; onStatus: (s: string, waitingReason?: string) => void;
  currentUserId?: number; generatedBy: string;
  onUploaded: () => void;
}) {
  const [expanded, setExpanded] = useState(false); // collapsed by default (spec)
  const [activeTab, setActiveTab] = useState<'chat' | 'attachments' | 'timeline'>('chat');
  const [waitingOpen, setWaitingOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Points are a Development-side concept; Sales users get the plain task view.
  const { user } = useAuth();
  const showPoints = usesTaskPoints(user);
  const [fav, toggleFav] = useFavorite(task.id);
  const prio = priorityMeta(task.priority);
  const st = statusMeta(task.status);
  const due = mobileDue(task);
  const inCharge = task.inChargeId ? task.members.find((m) => m.id === task.inChargeId) : null;

  // Same mentionables set the desktop panel builds: creator + members, active only.
  const mentionables = useMemo(() => {
    const byId = new Map<number, { id: number; name: string }>();
    const c = task.createdBy;
    if (c && c.id && c.active !== false) byId.set(c.id, { id: c.id, name: c.name });
    for (const m of task.members) if (m.active !== false) byId.set(m.id, { id: m.id, name: m.name });
    return [...byId.values()];
  }, [task.createdBy, task.members]);

  // Lock the page behind the sheet so only the chat / list scrolls under it.
  // Capture the original overflow ONCE and restore it only when the sheet closes…
  const originalOverflow = useRef<string>('');
  useEffect(() => {
    originalOverflow.current = document.body.style.overflow;
    return () => { document.body.style.overflow = originalOverflow.current; };
  }, []);
  // …but RE-ASSERT the lock on every render: a child Modal (Edit / Delete-confirm)
  // reuses the shared Modal, which sets body.overflow='unset' on close. Opening one
  // from inside this still-mounted sheet would otherwise leave the page unlocked.
  useEffect(() => { document.body.style.overflow = 'hidden'; });

  const TABS3 = [
    { key: 'chat' as const, icon: MessageCircle, label: 'Chat', count: 0 },
    { key: 'attachments' as const, icon: Paperclip, label: 'Files', count: task.attachments.length },
    { key: 'timeline' as const, icon: Activity, label: 'Activity', count: (task.activities || []).length },
  ];

  const dueDateText = task.dueDate
    ? `${new Date(task.dueDate + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}${formatTime12h(task.dueTime) ? ` • ${formatTime12h(task.dueTime)}` : ''}`
    : 'No due date';

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      {/* ── Top app bar: Back · "Task Details" · ⋯ (Export / Edit / Delete) ── */}
      <div className="relative flex shrink-0 items-center gap-1 border-b border-gray-100 px-2 py-2.5">
        <button type="button" onClick={onBack} aria-label="Back to task list"
          className="shrink-0 rounded-lg p-2 text-gray-600 transition hover:bg-gray-50 active:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[16px] font-bold text-gray-900">Task Details</h1>
        <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="More actions" aria-haspopup="menu"
          className="shrink-0 rounded-lg p-2 text-gray-500 transition hover:bg-gray-50"><MoreHorizontal className="h-5 w-5" /></button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
            <div role="menu" className="absolute right-2 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              <ExportTaskPdfButton task={task} generatedBy={generatedBy} label="Export PDF"
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60" />
              {canEdit && (
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"><Pencil className="h-4 w-4" /> Edit task</button>
              )}
              {canDelete && (
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onDelete(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"><Trash2 className="h-4 w-4" /> Delete task</button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Task summary card: circular ID badge · title · due line · expand · star ── */}
      <div className="shrink-0 border-b border-gray-100">
        <div className="flex items-center gap-3 px-3 py-3">
          <div className={classNames('flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 bg-white', taskRing(task.id))}>
            <span className="text-[11px] font-bold leading-none">{task.id}</span>
          </div>
          <button type="button" onClick={() => setExpanded((v) => !v)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-[15px] font-bold text-gray-900">{task.title}</p>
            <p className={classNames('mt-0.5 truncate text-[12px] font-medium', due.tone)}>{due.text}</p>
          </button>
          <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-50">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          <button type="button" onClick={toggleFav} aria-pressed={fav}
            aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
            className="shrink-0 rounded-lg p-1.5 transition hover:bg-gray-50">
            <Star className={classNames('h-5 w-5 transition', fav ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
          </button>
        </div>

        {/* ── Expanded info panel (reference field layout) ── */}
        {expanded && (
          <div className="max-h-[52vh] divide-y divide-gray-100 overflow-y-auto border-t border-gray-100 bg-white">
            <div className="grid grid-cols-2 gap-3 px-4 py-3">
              <DetailRow icon={ListTodo} label="Status">
                {canExecute ? (
                  <select
                    value={task.status}
                    onChange={(e) => { const v = e.target.value; if (v === 'waiting') setWaitingOpen(true); else onStatus(v); }}
                    className="mt-0.5 rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                  >
                    {STATUS_OPTIONS
                      .filter((o) => o.value !== 'approved' || canApprove || task.status === 'approved')
                      .map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : <span className={classNames('mt-0.5 inline-block rounded-md border px-2 py-0.5 text-xs font-semibold', st.tone)}>{st.label}</span>}
              </DetailRow>
              <DetailRow icon={Flag} label="Priority"><span className={classNames('mt-0.5 inline-block rounded-md border px-2 py-0.5 text-xs font-semibold', prio.badge)}>{prio.label}</span></DetailRow>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 py-3">
              <DetailRow icon={Calendar} label="Due Date"><span className={classNames('font-medium', due.tone)}>{dueDateText}</span></DetailRow>
              <DetailRow icon={Clock} label="Created"><span className="font-medium text-gray-700">{fmtDate(task.createdAt)}</span></DetailRow>
              {/* Points count toward performance only once the task is approved,
                  so say which state they're in rather than showing a bare number.
                  Hidden entirely for users outside the points system (e.g. Sales). */}
              {showPoints && (
              <DetailRow icon={Award} label="Estimated Points">
                <span className="font-medium text-gray-700">
                  {task.estimatedPoints || 0}
                  <span className="ml-1.5 text-xs font-normal text-gray-400">
                    {task.status === 'approved' ? 'awarded' : 'awarded after approval'}
                  </span>
                </span>
              </DetailRow>
              )}
            </div>
            <div className="px-4 py-3">
              <DetailRow icon={FileText} label="Description">
                {task.description ? <div className="mt-0.5"><TaskDescription text={task.description} /></div> : <span className="italic text-gray-400">No description</span>}
              </DetailRow>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 py-3">
              <DetailRow icon={User} label="Created By">
                <span className="mt-0.5 inline-flex min-w-0 items-center gap-1.5"><UserAvatar name={task.createdBy?.name || '?'} /> <span className="truncate font-medium text-gray-700">{task.createdBy?.name || '—'}</span></span>
              </DetailRow>
              {inCharge && (
                <DetailRow icon={User} label="Task In-Charge">
                  <span className="mt-0.5 inline-flex min-w-0 items-center gap-1.5"><UserAvatar name={inCharge.name} /> <span className="truncate font-medium text-gray-700">{inCharge.name}</span></span>
                </DetailRow>
              )}
            </div>
            <div className="px-4 py-3">
              <DetailRow icon={Users} label="Assigned Members">
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {task.members.length ? task.members.map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700"><UserAvatar name={m.name} /> {m.name}</span>
                  )) : <span className="text-sm italic text-gray-400">No members assigned</span>}
                </div>
              </DetailRow>
            </div>
            {(task.projectName || task.projectId) && (
              <div className="px-4 py-3"><DetailRow icon={ListTodo} label="Project / Module"><span className="font-medium text-gray-700">{task.projectName ?? String(task.projectId)}</span></DetailRow></div>
            )}
            <div className="px-4 py-3"><DetailRow icon={Users} label="Members"><div className="mt-1"><MemberAvatarGroup members={task.members} /></div></DetailRow></div>
            {task.status === 'waiting' && (
              <div className="px-4 py-3">
                <DetailRow icon={ShieldAlert} label="Waiting Reason">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{task.waitingReason || '—'}</span>
                    {canExecute && <button type="button" onClick={() => setWaitingOpen(true)} className="text-xs font-medium text-indigo-600 hover:underline">Edit</button>}
                  </span>
                </DetailRow>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex shrink-0 items-center border-b border-gray-100 bg-gray-50/80">
        {TABS3.map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className={classNames('flex min-w-0 flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-[13px] font-semibold transition-colors',
              activeTab === tab.key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500')}>
            <tab.icon className="h-3.5 w-3.5 shrink-0" /> {tab.label}
            {tab.count > 0 && <span className="rounded-full bg-gray-200 px-1.5 py-px text-[10px] font-bold text-gray-600">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Tab content — fills the rest of the screen; MyTaskChat pins its own input. ── */}
      <div className="relative min-h-0 flex-1 bg-white">
        {activeTab === 'chat' && (
          <div className="absolute inset-0">
            <MyTaskChat key={task.id} taskId={task.id} currentUserId={currentUserId} members={mentionables} />
          </div>
        )}
        {activeTab === 'attachments' && (
          <div className="h-full space-y-3 overflow-y-auto p-4">
            {/* Any participant (creator / In-Charge / member) can share files. */}
            <AttachmentUpload taskId={task.id} onUploaded={onUploaded} />
            {task.attachments.length ? (
              <div className="space-y-2.5">
                {task.attachments.map((a) => (
                  <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition active:bg-gray-50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500"><Paperclip className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-800">{a.file_name}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">{(a.file_size / 1024).toFixed(1)} KB{a.uploader?.name && <> • {a.uploader.name}</>}</p>
                    </div>
                    <Download className="h-4 w-4 shrink-0 text-gray-300" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100"><Paperclip className="h-6 w-6 text-gray-400" /></div>
                <h3 className="text-sm font-semibold text-gray-700">No attachments available</h3>
                <p className="mt-1 max-w-[220px] text-xs text-gray-500">Files attached to this task will appear here.</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'timeline' && (
          <div className="h-full overflow-y-auto"><ActivityTimeline activities={task.activities || []} /></div>
        )}
      </div>

      <WaitingReasonModal
        open={waitingOpen}
        initial={task.waitingReason || ''}
        onCancel={() => setWaitingOpen(false)}
        onConfirm={(reason) => { setWaitingOpen(false); onStatus('waiting', reason); }}
      />
    </div>
  );
}

/* ── searchable Task In-Charge dropdown (Outbox filter) ───────────────────── */
function InChargeFilter({
  options, value, onChange, openUp = false,
}: {
  options: { id: number; name: string }[];
  value: number | null;
  onChange: (v: number | null) => void;
  /** Open the panel UPWARD (used inside the mobile Filter sheet so it clears the footer);
   *  desktop callers omit it and keep the default downward menu — behaviour unchanged. */
  openUp?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const term = q.trim().toLowerCase();
  const filtered = term ? options.filter((o) => o.name.toLowerCase().includes(term)) : options;
  const selected = options.find((o) => o.id === value) || null;
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={classNames('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition sm:px-2.5 sm:py-1',
          value != null ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
        <User className="h-3 w-3" /> {selected ? selected.name : 'Any In-Charge'} <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className={classNames('absolute left-0 z-30 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg',
          openUp ? 'bottom-full mb-1' : 'mt-1')}>
          <div className="flex items-center gap-1.5 border-b border-gray-100 px-2.5 py-2">
            <Search className="h-3.5 w-3.5 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name…" autoFocus
              className="w-full text-xs text-gray-700 placeholder-gray-400 focus:outline-none" />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            <button type="button" onClick={() => { onChange(null); setOpen(false); setQ(''); }}
              className={classNames('block w-full px-3 py-1.5 text-left text-xs', value == null ? 'font-semibold text-indigo-600' : 'text-gray-600 hover:bg-gray-50')}>
              Any In-Charge
            </button>
            {filtered.map((o) => (
              <button key={o.id} type="button" onClick={() => { onChange(o.id); setOpen(false); setQ(''); }}
                className={classNames('block w-full truncate px-3 py-1.5 text-left text-xs', value === o.id ? 'font-semibold text-indigo-600' : 'text-gray-700 hover:bg-gray-50')}>
                {o.name}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No matches.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── main ─────────────────────────────────────────────────────────────── */
function WorkspaceInner() {
  const { user } = useAuth();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentUserId = user?.id && !isNaN(Number(user.id)) ? Number(user.id) : undefined;
  const isMobile = useIsMobile(); // <768px → dedicated mobile UI; tablet+desktop unchanged
  const canCreate = isSuperAdmin || hasPermission('mytasks.create');
  const canEdit = isSuperAdmin || hasPermission('mytasks.edit');
  const canDelete = isSuperAdmin || hasPermission('mytasks.delete');
  const canAssign = isSuperAdmin || hasPermission('mytasks.assign');
  // Org-wide Task Dashboard (Founder/CEO/HR/Leads/Managers) — toggled in-place.
  const canViewDashboard = isSuperAdmin || hasPermission('mytasks.dashboard.view');
  // Per-task roles — mirror the backend (utils/myTaskAccess.ts) so the UI never
  // offers an action the server will reject. The coarse mytasks.* permission still
  // applies on top; these only narrow it further.
  const isOwnerOf = (t: MyTask) => t.createdByMe || isSuperAdmin;
  const isInChargeOf = (t: MyTask) => currentUserId != null && t.inChargeId === currentUserId;
  const [view, setView] = useState<'workspace' | 'dashboard'>('workspace');

  const [data, setData] = useState<MyTaskWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bucket, setBucket] = useState<Bucket>('inbox');

  // Active tab is DERIVED from the existing state — Analytics is simply
  // view === 'dashboard'. No new state, and no duplicated Analytics implementation:
  // the tab renders the very same <TaskDashboard /> the old header button did.
  const activeTab: TabKey = view === 'dashboard' ? 'analytics' : bucket;
  const selectTab = (key: TabKey) => {
    if (key === 'analytics') { setView('dashboard'); return; }
    setView('workspace');
    setBucket(key);
  };
  // Per-tab filters (client-side). Same Date+Status logic for both tabs — Inbox
  // default = Today+Delayed, Outbox default = All; Outbox adds a Task In-Charge filter.
  const [dateFilters, setDateFilters] = useState<Record<Bucket, Set<string>>>(() => ({
    inbox: new Set(DEFAULT_DATE_BY_BUCKET.inbox),
    outbox: new Set(DEFAULT_DATE_BY_BUCKET.outbox),
  }));
  const [statusFilters, setStatusFilters] = useState<Record<Bucket, Set<string>>>(() => ({
    inbox: new Set<string>(), outbox: new Set<string>(),
  }));
  const [inChargeFilter, setInChargeFilter] = useState<number | null>(null); // Outbox only
  const [waitingReasonFilter, setWaitingReasonFilter] = useState<Record<Bucket, string | null>>({ inbox: null, outbox: null }); // per-bucket, active only when Waiting is filtered
  const [readFilter, setReadFilter] = useState<Record<Bucket, ReadKey>>({ inbox: 'all', outbox: 'all' }); // per-bucket (never global — it would leak across tabs)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false); // mobile Filter bottom-sheet (Status + Read)
  const [search, setSearch] = useState<Record<Bucket, string>>({ inbox: '', outbox: '' }); // per-bucket, like every other filter here
  // Filter on the DEBOUNCED text (keeps typing snappy); `search` drives the input itself.
  const debouncedSearch = useDebouncedValue(search, 200);
  const searchInbox = debouncedSearch.inbox.trim().toLowerCase();
  const searchOutbox = debouncedSearch.outbox.trim().toLowerCase();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Details start COLLAPSED: the header (title + status + priority) is enough to scan,
  // and the chat gets the space. Reuses the existing toggle + sessionStorage, so an
  // explicit "expanded" choice ('0') still wins — only the DEFAULT changed.
  const [collapsed, setCollapsed] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MyTask | null>(null);

  useEffect(() => {
    // Collapsed unless the user explicitly expanded before ('0').
    try { setCollapsed(sessionStorage.getItem(COLLAPSE_KEY) !== '0'); } catch { /* ignore */ }
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try { sessionStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetchMyTaskWorkspace();
      setData(res);
      setError('');
    } catch (err) {
      console.error('Failed to load My Tasks', err);
      if (!silent) setError('Failed to load your tasks. Please try again.');
    } finally {
      if (silent) setRefreshing(false); else setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Real-time: refetch when any task the user is part of changes (created,
  // updated, member add/remove, status, chat). The backend emits 'mytask_changed'
  // to each affected user's personal room (auto-joined on connect).
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socketUrl = apiUrl.endsWith('/api') ? apiUrl.replace('/api', '') : apiUrl;
    const socket = io(socketUrl, { auth: { token }, withCredentials: true });
    let t: any = null;
    socket.on('mytask_changed', () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => loadRef.current(true), 300);
    });
    const onFocus = () => { if (document.visibilityState !== 'hidden') loadRef.current(true); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      if (t) clearTimeout(t);
      socket.disconnect();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    const taskIdStr = searchParams.get('taskId');
    if (taskIdStr && data) {
      const tid = Number(taskIdStr);
      // Attempt to find it in the current data payload
      let found = data.inbox.find((t) => t.id === tid);
      // Deep-link opens the task exactly like a click (openTask clears its unread
      // flags optimistically, with a guard that prevents a data-change render loop).
      if (found) { setBucket('inbox'); openTask(found); }
      else {
        found = data.outbox.find((t) => t.id === tid);
        if (found) { setBucket('outbox'); openTask(found); }
      }

      // Clean up the URL
      if (found) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, data]);

  const lists = useMemo(() => ({
    inbox: data?.inbox ?? [], outbox: data?.outbox ?? [],
  }), [data]);
  const dateSel = dateFilters[bucket];
  const statusSel = statusFilters[bucket];
  const readSel = readFilter[bucket];

  // Mobile Due chips are single-select PRESETS over the same date/status state the desktop
  // multi-select uses (matchDateStatus engine unchanged). All/Today/Delayed/Upcoming set
  // exactly one date bucket and leave Status/Read (the Filter-sheet axes) alone.
  const activeMobileChip = dateSel.has('today') ? 'today'
    : dateSel.has('delayed') ? 'delayed'
      : dateSel.has('upcoming') ? 'upcoming'
        : 'all';
  const applyMobileChip = (chip: string) => {
    setDateFilters((p) => ({ ...p, [bucket]: new Set([chip]) }));
  };
  // Advanced (Filter-sheet) filters currently applied: Status, Read, and (Outbox only)
  // Task In-Charge. Drives the Filter button badge.
  const advancedFilterCount = (statusSel.size > 0 ? 1 : 0)
    + (readSel !== 'all' ? 1 : 0)
    + ((bucket === 'outbox' && inChargeFilter !== null) ? 1 : 0);
  // Mobile exposes Due (chips) + Status + Read + (Outbox) Task In-Charge — all in the Filter
  // sheet. Only the still-hidden Waiting-reason dimension is reset on entering mobile, so a
  // value set at a wider width can't silently filter the list with no control to clear it.
  // In-Charge is NO LONGER reset — the Outbox Filter sheet owns it (full desktop parity).
  useEffect(() => {
    if (!isMobile) return;
    setWaitingReasonFilter({ inbox: null, outbox: null });
  }, [isMobile]);
  // Both tabs filter by Date+Status (a task must match any selected date bucket AND
  // any selected status). Outbox uses the stricter Delayed (excludes completed) and
  // adds the Task In-Charge filter. All client-side over already-fetched data.
  const inboxFiltered = useMemo(
    () => lists.inbox.filter((t) => matchDateStatus(t, dateFilters.inbox, statusFilters.inbox, false)
      && matchWaitingReason(t, waitingReasonFilter.inbox)
      && matchRead(t, readFilter.inbox)
      && matchSearch(t, searchInbox)),
    [lists.inbox, dateFilters.inbox, statusFilters.inbox, waitingReasonFilter.inbox, readFilter.inbox, searchInbox],
  );
  const outboxFiltered = useMemo(
    () => lists.outbox.filter((t) =>
      matchDateStatus(t, dateFilters.outbox, statusFilters.outbox, true)
      && matchWaitingReason(t, waitingReasonFilter.outbox)
      && matchRead(t, readFilter.outbox)
      && matchSearch(t, searchOutbox)
      && (inChargeFilter == null || t.inChargeId === inChargeFilter)),
    [lists.outbox, dateFilters.outbox, statusFilters.outbox, inChargeFilter, waitingReasonFilter.outbox, readFilter.outbox, searchOutbox],
  );
  const currentList = bucket === 'inbox' ? inboxFiltered : outboxFiltered;

  // Task In-Charge options = distinct in-charge users across the user's own tasks
  // (name resolved from each task's members). No duplicates; sorted by name.
  const inChargeOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of lists.outbox) {
      if (t.inChargeId != null && !map.has(t.inChargeId)) {
        const name = t.members.find((m) => m.id === t.inChargeId)?.name;
        if (name) map.set(t.inChargeId, name);
      }
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [lists.outbox]);

  // Distinct Waiting reasons present in the current tab (for the optional reason filter).
  const waitingReasonOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of lists[bucket]) if (t.status === 'waiting' && t.waitingReason) set.add(t.waitingReason);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [lists, bucket]);

  const toggleDate = (key: string) => setDateFilters((prev) => {
    const cur = prev[bucket];
    let next: Set<string>;
    if (key === 'all') next = new Set(['all']);
    else { next = new Set(cur); next.delete('all'); if (next.has(key)) next.delete(key); else next.add(key); }
    return { ...prev, [bucket]: next };
  });
  const toggleStatus = (key: string) => {
    setStatusFilters((prev) => {
      const next = new Set(prev[bucket]);
      if (next.has(key)) next.delete(key); else next.add(key);
      return { ...prev, [bucket]: next };
    });
    // The reason sub-filter only makes sense while Waiting is selected — reset on removal.
    if (key === 'waiting' && statusSel.has('waiting')) setWaitingReasonFilter((prev) => ({ ...prev, [bucket]: null }));
  };
  const clearFilters = () => {
    setDateFilters((prev) => ({ ...prev, [bucket]: new Set(DEFAULT_DATE_BY_BUCKET[bucket]) }));
    setStatusFilters((prev) => ({ ...prev, [bucket]: new Set<string>() }));
    setWaitingReasonFilter((prev) => ({ ...prev, [bucket]: null }));
    setReadFilter((prev) => ({ ...prev, [bucket]: 'all' }));
    setSearch((prev) => ({ ...prev, [bucket]: '' }));
    if (bucket === 'outbox') setInChargeFilter(null);
  };
  const defDates = DEFAULT_DATE_BY_BUCKET[bucket];
  const filtersDirty = statusSel.size > 0
    || dateSel.size !== defDates.length
    || !defDates.every((d) => dateSel.has(d))
    || (bucket === 'outbox' && inChargeFilter !== null)
    || (statusSel.has('waiting') && waitingReasonFilter[bucket] !== null)
    || readFilter[bucket] !== 'all'
    || search[bucket].trim() !== '';

  const selectedTask = useMemo(() => {
    if (selectedId == null || !data) return null;
    return [...data.inbox, ...data.outbox].find((t) => t.id === selectedId) || null;
  }, [selectedId, data]);

  const openTask = (task: MyTask) => {
    setSelectedId(task.id);
    // Mobile only: the details replace the list, so start at the top like opening a
    // WhatsApp conversation. Desktop is a split view — keep the user's scroll position.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Opening a task marks it read (backend read fires from MyTaskChat on mount);
    // clear the unread flag + message count locally so the indicator vanishes at once.
    if (task.unreadCount > 0 || task.unread || task.unreadMentions > 0) {
      setData((prev) => {
        if (!prev) return prev;
        const clr = (arr: MyTask[]) => arr.map((t) => (
          t.id === task.id ? { ...t, unreadCount: 0, unread: false, unreadMentions: 0 } : t
        ));
        return { ...prev, inbox: clr(prev.inbox), outbox: clr(prev.outbox) };
      });
    }
  };

  // Approving a MULTI-assignee task that carries points needs the approver to say
  // who earned them first. Intercepted here — the single place both the desktop and
  // mobile detail panels route their status changes through.
  const [distributeFor, setDistributeFor] = useState<MyTask | null>(null);
  const [distributing, setDistributing] = useState(false);

  const commitStatus = async (taskId: number, status: string, waitingReason?: string, pointsDistribution?: PointAllocation[]) => {
    await updateMyTaskStatus(taskId, status, waitingReason, pointsDistribution);
    await load(true);
  };

  const handleStatus = async (taskId: number, status: string, waitingReason?: string) => {
    const task = data ? [...data.inbox, ...data.outbox].find((t) => t.id === taskId) : null;
    // Single assignee (or a 0-point task) approves immediately, exactly as before.
    if (status === 'approved' && task && (task.estimatedPoints || 0) > 0 && (task.members?.length || 0) > 1) {
      setDistributeFor(task);
      return;
    }
    try { await commitStatus(taskId, status, waitingReason); }
    catch { toast('Failed to update status.', 'error'); }
  };

  const handleDelete = async (task: MyTask) => {
    const ok = await confirm({ title: 'Delete task', message: `Delete "${task.title}"? This also removes its members and chat. This cannot be undone.`, confirmLabel: 'Delete', intent: 'danger' });
    if (!ok) return;
    try {
      await deleteMyTask(task.id);
      if (selectedId === task.id) setSelectedId(null);
      toast('Task deleted.', 'success');
      await load(true);
    } catch { toast('Failed to delete task.', 'error'); }
  };

  const distributionModal = (
    <PointDistributionModal
      isOpen={!!distributeFor}
      task={distributeFor}
      saving={distributing}
      onCancel={() => setDistributeFor(null)}
      onConfirm={async (allocations) => {
        if (!distributeFor) return;
        setDistributing(true);
        try {
          await commitStatus(distributeFor.id, 'approved', undefined, allocations);
          toast('Task approved and points awarded.', 'success');
          setDistributeFor(null);
        } catch {
          // The server re-validates the split; surface its rejection rather than
          // closing the modal on a total that didn't add up.
          toast('Failed to approve. Check the point distribution and try again.', 'error');
        } finally {
          setDistributing(false);
        }
      }}
    />
  );

  return (
    <div className={classNames('mytasks-scope space-y-4', isMobile && 'pb-24')}>
      {distributionModal}
      {/* ── Primary navigation: Inbox | Outbox | Analytics — DESKTOP/TABLET only.
          On mobile (<768px) this is replaced by the fixed BOTTOM navigation below,
          matching the reference. The active tab is DERIVED from `view` + `bucket`. */}
      {!isMobile && (
        <div className="flex items-end justify-between gap-3 border-b border-gray-200">
          <nav className="-mb-px flex items-center gap-0.5 overflow-x-auto" aria-label="My Tasks sections">
            {TABS.filter((t) => t.key !== 'analytics' || canViewDashboard).map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.key;
              const count = t.key === 'analytics' ? null : lists[t.key as Bucket].length;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => selectTab(t.key)}
                  title={t.hint}
                  aria-current={active ? 'page' : undefined}
                  className={classNames(
                    'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4',
                    active
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t.label}
                  {count != null && (
                    <span className={classNames('rounded-full px-1.5 text-[10px] font-bold',
                      active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500')}>{count}</span>
                  )}
                </button>
              );
            })}
          </nav>
          {/* Actions stay with the navigation now that the header is gone. */}
          <div className="flex shrink-0 items-center gap-2 pb-1.5">
            {view === 'workspace' && (
              <button type="button" onClick={() => load(true)} disabled={refreshing} title="Refresh"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 disabled:opacity-60">
                <RefreshCw className={classNames('h-4 w-4', refreshing && 'animate-spin')} />
              </button>
            )}
            {/* New Task lives ONLY in the Outbox (tasks you create/send to others). */}
            {view === 'workspace' && canCreate && bucket === 'outbox' && (
              <button type="button" onClick={() => { setEditing(null); setModalOpen(true); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:px-3.5">
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Task</span><span className="sm:hidden">New</span>
              </button>
            )}
          </div>
        </div>
      )}

      {view === 'dashboard' ? <TaskDashboard /> : isMobile ? (
        /* ── MOBILE (<768px): dedicated task list — Search + Filter chips + compact
           cards. No split view; tapping a card opens the full-screen details sheet
           rendered below (MyTaskMobileDetails). ── */
        <div className="space-y-3">
          {/* Search + Filter — the advanced Status/Read filters live in the bottom-sheet
              opened by this button, keeping the header to Search + Filter + Due chips. */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search[bucket]}
                onChange={(e) => setSearch((prev) => ({ ...prev, [bucket]: e.target.value }))}
                placeholder="Search tasks…"
                aria-label="Search tasks"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
              {search[bucket] && (
                <button type="button" onClick={() => setSearch((prev) => ({ ...prev, [bucket]: '' }))} aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><X className="h-4 w-4" /></button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFilterSheetOpen(true)}
              aria-label="Open filters"
              aria-haspopup="dialog"
              className={classNames(
                'inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition',
                advancedFilterCount > 0
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {advancedFilterCount > 0 && (
                <span className="ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-bold text-white">{advancedFilterCount}</span>
              )}
            </button>
          </div>
          {/* Due filter — single-select date chips. */}
          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
            {MOBILE_CHIPS.map((c) => (
              <button key={c.key} type="button" onClick={() => applyMobileChip(c.key)}
                className={classNames('shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition',
                  activeMobileChip === c.key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600')}>
                {c.label}
              </button>
            ))}
          </div>
          {filterSheetOpen && (
            <MobileFilterSheet
              initialStatus={statusSel}
              initialRead={readSel}
              initialInCharge={inChargeFilter}
              inChargeOptions={bucket === 'outbox' ? inChargeOptions : undefined}
              onClose={() => setFilterSheetOpen(false)}
              onApply={(status, read, inCharge) => {
                setStatusFilters((prev) => ({ ...prev, [bucket]: status }));
                setReadFilter((prev) => ({ ...prev, [bucket]: read }));
                if (bucket === 'outbox') setInChargeFilter(inCharge);
              }}
            />
          )}
          <div className="space-y-2.5">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-300"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-600">{error}</div>
            ) : currentList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center">
                <p className="text-sm font-medium text-gray-500">
                  {bucket === 'inbox'
                    ? (lists.inbox.length > 0 ? 'No tasks match these filters.' : 'Your inbox is empty.')
                    : (lists.outbox.length > 0 ? 'No tasks match these filters.' : 'You have not created any tasks.')}
                </p>
              </div>
            ) : (
              currentList.map((t) => <MobileTaskCard key={t.id} task={t} onOpen={() => openTask(t)} />)
            )}
          </div>
        </div>
      ) : (
        /* TABLET (≥768px) + DESKTOP: the row is pinned to the viewport, so the PAGE never
           scrolls — the task list and the details panel each scroll inside their own
           column (WhatsApp/Slack-style). Unchanged from before this mobile redesign. */
        <div className="flex flex-col gap-5 lg:h-[calc(100vh_-_160px)] lg:flex-row">
          {/* LEFT — the task list.
            MOBILE (WhatsApp-style): this is the "list screen". Once a task is opened
            it steps aside so the details get the full width — never a split screen.
            DESKTOP (lg+): always visible beside the details, exactly as before. */}
          {/* `hidden` + `lg:flex`: the responsive variant is emitted later, so the list
            re-appears as a flex COLUMN on desktop (filters fixed, list scrolls). */}
          <aside className={classNames('lg:flex lg:h-full lg:min-h-0 lg:w-[360px] lg:shrink-0 lg:flex-col', selectedId != null && 'hidden')}>
            {/* (The Inbox/Outbox switch now lives in the primary tab bar above — a
              second strip here would be a duplicate control.) */}

            {/* Filters — combinable Date + Status (both tabs), plus Task In-Charge
              on the Outbox. Instant, client-side over the already-fetched list. */}
            <div className="mb-3 space-y-2 rounded-xl border border-gray-200 bg-white p-2.5 lg:shrink-0">
              {/* Instant search — Task Name, Creator, In-Charge, Members, Project.
                Composes with every filter below; debounced, no API call. */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  value={search[bucket]}
                  onChange={(e) => setSearch((prev) => ({ ...prev, [bucket]: e.target.value }))}
                  placeholder="Search task, creator, in-charge, member or project…"
                  aria-label="Search tasks"
                  className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-7 text-xs text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                />
                {search[bucket] && (
                  <button type="button" onClick={() => setSearch((prev) => ({ ...prev, [bucket]: '' }))}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 w-16 shrink-0 text-[10px] font-bold uppercase tracking-wide text-gray-400">Due</span>
                {DATE_FILTERS.map((f) => (
                  <button key={f.key} type="button" onClick={() => toggleDate(f.key)}
                    className={classNames('rounded-full px-3 py-1.5 text-[11px] font-semibold transition sm:px-2.5 sm:py-1',
                      dateSel.has(f.key) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 w-16 shrink-0 text-[10px] font-bold uppercase tracking-wide text-gray-400">Status</span>
                {STATUS_FILTERS.map((f) => (
                  <button key={f.key} type="button" onClick={() => toggleStatus(f.key)}
                    className={classNames('rounded-full px-3 py-1.5 text-[11px] font-semibold transition sm:px-2.5 sm:py-1',
                      statusSel.has(f.key) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                    {f.label}
                  </button>
                ))}
                {filtersDirty && (
                  <button type="button" onClick={clearFilters}
                    className="ml-auto rounded-full px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50">
                    Clear
                  </button>
                )}
              </div>
              {/* Read state — filters on the existing per-user unread flag. */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 w-16 shrink-0 text-[10px] font-bold uppercase tracking-wide text-gray-400">Read</span>
                {READ_FILTERS.map((f) => (
                  <button key={f.key} type="button" onClick={() => setReadFilter((prev) => ({ ...prev, [bucket]: f.key }))}
                    className={classNames('rounded-full px-3 py-1.5 text-[11px] font-semibold transition sm:px-2.5 sm:py-1',
                      readSel === f.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                    {f.label}
                  </button>
                ))}
              </div>
              {statusSel.has('waiting') && waitingReasonOptions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-0.5 w-16 shrink-0 text-[10px] font-bold uppercase tracking-wide text-gray-400">Reason</span>
                  <button type="button" onClick={() => setWaitingReasonFilter((prev) => ({ ...prev, [bucket]: null }))}
                    className={classNames('rounded-full px-3 py-1.5 text-[11px] font-semibold transition sm:px-2.5 sm:py-1',
                      waitingReasonFilter[bucket] === null ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>All</button>
                  {waitingReasonOptions.map((r) => (
                    <button key={r} type="button" onClick={() => setWaitingReasonFilter((prev) => ({ ...prev, [bucket]: r }))}
                      className={classNames('rounded-full px-3 py-1.5 text-[11px] font-semibold transition sm:px-2.5 sm:py-1',
                        waitingReasonFilter[bucket] === r ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{r}</button>
                  ))}
                </div>
              )}
              {bucket === 'outbox' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-0.5 w-16 shrink-0 text-[10px] font-bold uppercase tracking-wide text-gray-400">In-Charge</span>
                  <InChargeFilter options={inChargeOptions} value={inChargeFilter} onChange={setInChargeFilter} />
                </div>
              )}
            </div>

            {/* The ONLY scroller in this column on desktop — the filters above stay put. */}
            <div className="space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-300"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-600">{error}</div>
              ) : currentList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center">
                  <p className="text-sm font-medium text-gray-500">
                    {bucket === 'inbox'
                      ? (lists.inbox.length > 0 ? 'No tasks match these filters.' : 'Your inbox is empty.')
                      : (lists.outbox.length > 0 ? 'No tasks match these filters.' : 'You have not created any tasks.')}
                  </p>
                </div>
              ) : (
                currentList.map((t) => <TaskRow key={t.id} task={t} active={selectedId === t.id} onClick={() => openTask(t)} showDirection={bucket === 'inbox'} />)
              )}
            </div>
          </aside>

          {/* RIGHT — the details.
            MOBILE: acts as the dedicated "details screen" (full width, Back button in
            its header); hidden entirely while no task is open, so the empty
            "Select a task" placeholder never eats a phone screen.
            DESKTOP: unchanged — always rendered, placeholder included. */}
          <section className={classNames('min-w-0 flex-1 lg:h-full lg:min-h-0', selectedId == null && 'hidden lg:block')}>
            {!selectedTask ? (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-500"><ListTodo className="h-7 w-7" /></div>
                <p className="font-semibold text-gray-600">Select a task</p>
                <p className="mt-1 text-sm text-gray-400">Choose a task from the left to see its details and chat.</p>
              </div>
            ) : (
              /* Mobile-first: let the panel size to its content so the PAGE owns the
                 single scroll. The fixed viewport-height pane (and its inner scroll) is
                 a desktop-only two-column affordance — on a phone it produced a
                 viewport-tall box nested inside an already-scrolling page. */
              <div className="lg:h-full lg:min-h-0">
                <DetailsPanel
                  task={selectedTask}
                  collapsed={collapsed}
                  onToggle={toggleCollapsed}
                  canEdit={canEdit && isOwnerOf(selectedTask)}
                  canDelete={canDelete && isOwnerOf(selectedTask)}
                  canExecute={canEdit && (isOwnerOf(selectedTask) || isInChargeOf(selectedTask))}
                  canApprove={canEdit && isOwnerOf(selectedTask)}
                  onEdit={() => { setEditing(selectedTask); setModalOpen(true); }}
                  onDelete={() => handleDelete(selectedTask)}
                  onStatus={(s, wr) => handleStatus(selectedTask.id, s, wr)}
                  onBack={() => setSelectedId(null)}
                  currentUserId={currentUserId}
                  generatedBy={user?.name ?? ''}
                  onUploaded={() => load(true)}
                />
              </div>
            )}
          </section>
        </div>
      )}

      {/* MOBILE (<768px): full-screen Task Details sheet — replaces the desktop split.
          A fixed overlay above the list; reuses every desktop handler + leaf. */}
      {isMobile && view === 'workspace' && selectedTask && (
        <MyTaskMobileDetails
          task={selectedTask}
          onBack={() => setSelectedId(null)}
          canEdit={canEdit && isOwnerOf(selectedTask)}
          canDelete={canDelete && isOwnerOf(selectedTask)}
          canExecute={canEdit && (isOwnerOf(selectedTask) || isInChargeOf(selectedTask))}
          canApprove={canEdit && isOwnerOf(selectedTask)}
          onEdit={() => { setEditing(selectedTask); setModalOpen(true); }}
          onDelete={() => handleDelete(selectedTask)}
          onStatus={(s, wr) => handleStatus(selectedTask.id, s, wr)}
          currentUserId={currentUserId}
          generatedBy={user?.name ?? ''}
          onUploaded={() => load(true)}
        />
      )}

      {/* MOBILE (<768px): fixed BOTTOM navigation — Inbox · Outbox · Analytics · Add
          Task (matches the reference). The details sheet (z-40) covers it when open. */}
      {isMobile && (
        <nav aria-label="My Tasks" className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t border-gray-200 bg-white shadow-[0_-1px_4px_rgba(15,23,42,0.05)]">
          <BottomTab active={view === 'workspace' && bucket === 'inbox'} icon={Inbox} label="Inbox" count={lists.inbox.length} onClick={() => selectTab('inbox')} />
          <BottomTab active={view === 'workspace' && bucket === 'outbox'} icon={Send} label="Outbox" count={lists.outbox.length} onClick={() => selectTab('outbox')} />
          {canViewDashboard && (
            <BottomTab active={view === 'dashboard'} icon={BarChart3} label="Analytics" onClick={() => selectTab('analytics')} />
          )}
          {canCreate && (
            <button type="button" onClick={() => { setEditing(null); setModalOpen(true); }}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold text-indigo-600">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm"><Plus className="h-5 w-5" /></span>
              Add Task
            </button>
          )}
        </nav>
      )}

      <CreateMyTaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editTask={editing}
        canAssign={canAssign}
        onSaved={(saved) => { setSelectedId(saved.id); load(true); }}
      />
    </div>
  );
}

export function MyTasksWorkspace() {
  // GLOBAL feature — open to every authenticated user. The DashboardLayout's
  // AuthGuard already enforces a valid session, and /dashboard/my-tasks is in
  // SHARED_PREFIXES so the module route-guard never bounces a cross-module user.
  // No permission gate here: task DATA is permission-scoped server-side (the
  // workspace is self-scoped, chat is member-only, mutations stay mytasks.*-gated).
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-80px)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
      <WorkspaceInner />
    </Suspense>
  );
}
