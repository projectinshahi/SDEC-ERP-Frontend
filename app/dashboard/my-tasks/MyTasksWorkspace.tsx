'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import {
  Inbox, Send, Plus, ChevronDown, ChevronUp, Loader2, ListTodo,
  Calendar, User, Users, Flag, Clock, Paperclip, RefreshCw, Pencil, Trash2, ShieldAlert,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import {
  fetchMyTaskWorkspace, deleteMyTask, updateMyTaskStatus,
  type MyTask, type MyTaskWorkspace as MyTaskWorkspaceData,
} from '@/lib/api/myTasks';
import { MyTaskChat } from '@/components/tasks/mytasks/MyTaskChat';
import { CreateMyTaskModal } from '@/components/tasks/mytasks/CreateMyTaskModal';

type Bucket = 'inbox' | 'outbox';
const BUCKETS: { key: Bucket; label: string; icon: any; hint: string }[] = [
  { key: 'inbox', label: 'Inbox', icon: Inbox, hint: 'Tasks assigned to me (due today, upcoming & overdue)' },
  { key: 'outbox', label: 'Outbox', icon: Send, hint: 'Created by me' },
];
const COLLAPSE_KEY = 'my-tasks-details-collapsed';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];
function statusMeta(s: string) {
  if (s === 'done') return { label: 'Done', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (s === 'in_progress') return { label: 'In Progress', tone: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (s === 'todo') return { label: 'To Do', tone: 'bg-slate-100 text-slate-600 border-slate-200' };
  return { label: s || '—', tone: 'bg-slate-100 text-slate-600 border-slate-200' };
}
function priorityMeta(p: string) {
  const v = (p || '').toLowerCase();
  if (['high', 'urgent', 'critical'].includes(v)) return { dot: 'bg-rose-500', text: 'text-rose-600', label: v === 'urgent' ? 'Urgent' : 'High' };
  if (['low', 'minor'].includes(v)) return { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'Low' };
  return { dot: 'bg-amber-500', text: 'text-amber-600', label: 'Medium' };
}
function todayYmd(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}
function formatTime12h(time?: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtDue(ymd?: string | null, time?: string | null): { label: string; tone: string } {
  if (!ymd) return { label: 'No due date', tone: 'text-gray-400' };
  const today = todayYmd();
  const nice = new Date(ymd + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = formatTime12h(time);
  const timeSuffix = timeStr ? ` • ${timeStr}` : '';
  if (ymd === today) return { label: `Due today${timeSuffix}`, tone: 'text-amber-600 font-semibold' };
  if (ymd < today) return { label: `Overdue · ${nice}${timeSuffix}`, tone: 'text-rose-600 font-semibold' };
  return { label: `Due ${nice}${timeSuffix}`, tone: 'text-gray-500' };
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

/* ── left-panel task row ──────────────────────────────────────────────── */
function TaskRow({ task, active, onClick, showDirection }: { task: MyTask; active: boolean; onClick: () => void; showDirection?: boolean }) {
  const prio = priorityMeta(task.priority);
  const due = fmtDue(task.dueDate, task.dueTime);
  const st = statusMeta(task.status);
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'w-full rounded-xl border px-3.5 py-3 text-left transition',
        active ? 'border-indigo-400 bg-indigo-50/60 ring-1 ring-indigo-200' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={classNames('mt-1 h-2 w-2 shrink-0 rounded-full', prio.dot)} title={`${prio.label} priority`} />
          <span className="truncate text-sm font-semibold text-gray-800">{task.title}</span>
        </span>
        {task.unreadCount > 0 && (
          <span className="shrink-0 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{task.unreadCount}</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {showDirection && (
          <span
            className={classNames(
              'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold',
              task.createdByMe ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600',
            )}
            title={task.createdByMe ? 'Created by me (Sent)' : 'Assigned to me (Received)'}
          >
            {task.createdByMe ? 'Sent' : 'Received'}
          </span>
        )}
        <span className={classNames('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', st.tone)}>{st.label}</span>
        <span className={classNames('inline-flex items-center gap-1 text-[11px]', due.tone)}>
          <Calendar className="h-3 w-3" /> {due.label}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <MemberAvatars members={task.members} />
        <span className="inline-flex items-center gap-1 truncate text-[11px] text-gray-400">
          <User className="h-3 w-3" /> {task.createdBy?.name || '—'}
        </span>
      </div>
    </button>
  );
}

/* ── details panel ────────────────────────────────────────────────────── */
function DetailRow({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400"><Icon className="h-3.5 w-3.5" /></span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <div className="text-sm text-gray-800 break-words">{children}</div>
      </div>
    </div>
  );
}

function DetailsPanel({
  task, collapsed, onToggle, canEdit, canDelete, onEdit, onDelete, onStatus,
}: {
  task: MyTask; collapsed: boolean; onToggle: () => void;
  canEdit: boolean; canDelete: boolean;
  onEdit: () => void; onDelete: () => void; onStatus: (s: string) => void;
}) {
  const prio = priorityMeta(task.priority);
  const due = fmtDue(task.dueDate, task.dueTime);
  const st = statusMeta(task.status);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className={classNames('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', st.tone)}>{st.label}</span>
            <span className={classNames('inline-flex items-center gap-1 text-xs font-semibold', prio.text)}>
              <span className={classNames('h-2 w-2 rounded-full', prio.dot)} /> {prio.label}
            </span>
          </div>
          <h2 className="mt-1.5 truncate text-lg font-bold text-gray-900">{task.title}</h2>
        </button>
        <div className="flex items-center gap-1">
          {canEdit && (
            <button type="button" onClick={onEdit} title="Edit task" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"><Pencil className="h-4 w-4" /></button>
          )}
          {canDelete && (
            <button type="button" onClick={onDelete} title="Delete task" className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
          )}
          <button type="button" onClick={onToggle} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50">
            {collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-4 border-t border-gray-100 px-5 py-4">
          {task.description ? (
            <p className="whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{task.description}</p>
          ) : (
            <p className="text-sm italic text-gray-400">No description.</p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {task.inChargeId && (
              <DetailRow icon={User} label="Task In-Charge">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-700">
                  ⭐ {task.members.find((m) => m.id === task.inChargeId)?.name || 'Unknown'}
                </span>
              </DetailRow>
            )}
            <DetailRow icon={Users} label="Assigned Members">
              {task.members.length ? task.members.map((m) => m.name).join(', ') : 'No members'}
            </DetailRow>
            <DetailRow icon={User} label="Created By">{task.createdBy?.name || '—'}</DetailRow>
            <DetailRow icon={Flag} label="Priority"><span className={prio.text}>{prio.label}</span></DetailRow>
            <DetailRow icon={ListTodo} label="Status">
              {canEdit ? (
                <select
                  value={task.status}
                  onChange={(e) => onStatus(e.target.value)}
                  className="rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : st.label}
            </DetailRow>
            <DetailRow icon={Clock} label="Created">{fmtDate(task.createdAt)}</DetailRow>
            <DetailRow icon={Calendar} label="Deadline"><span className={due.tone}>{due.label}</span></DetailRow>
          </div>

          {task.attachments.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {task.attachments.map((a) => (
                  <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600">
                    <Paperclip className="h-3.5 w-3.5" /> <span className="max-w-[160px] truncate">{a.file_name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
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
  const canCreate = isSuperAdmin || hasPermission('mytasks.create');
  const canEdit = isSuperAdmin || hasPermission('mytasks.edit');
  const canDelete = isSuperAdmin || hasPermission('mytasks.delete');
  const canAssign = isSuperAdmin || hasPermission('mytasks.assign');

  const [data, setData] = useState<MyTaskWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bucket, setBucket] = useState<Bucket>('inbox');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MyTask | null>(null);

  useEffect(() => {
    try { setCollapsed(sessionStorage.getItem(COLLAPSE_KEY) === '1'); } catch { /* ignore */ }
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
      if (found) { setBucket('inbox'); setSelectedId(tid); }
      else {
        found = data.outbox.find((t) => t.id === tid);
        if (found) { setBucket('outbox'); setSelectedId(tid); }
      }
      
      // Clean up the URL
      if (found) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [searchParams, data]);

  const lists = useMemo(() => ({
    inbox: data?.inbox ?? [], outbox: data?.outbox ?? [],
  }), [data]);
  const currentList = lists[bucket];
  const selectedTask = useMemo(() => {
    if (selectedId == null || !data) return null;
    return [...data.inbox, ...data.outbox].find((t) => t.id === selectedId) || null;
  }, [selectedId, data]);

  const openTask = (task: MyTask) => {
    setSelectedId(task.id);
    if (task.unreadCount > 0) {
      setData((prev) => {
        if (!prev) return prev;
        const clr = (arr: MyTask[]) => arr.map((t) => (t.id === task.id ? { ...t, unreadCount: 0 } : t));
        return { ...prev, inbox: clr(prev.inbox), outbox: clr(prev.outbox) };
      });
    }
  };

  const handleStatus = async (taskId: number, status: string) => {
    try { await updateMyTaskStatus(taskId, status); await load(true); }
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><ListTodo className="h-6 w-6 text-indigo-600" /> My Tasks</h1>
          <p className="mt-0.5 text-sm text-gray-500">A standalone workspace — Inbox &amp; Outbox with real-time task chat.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => load(true)} disabled={refreshing} title="Refresh"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 disabled:opacity-60">
            <RefreshCw className={classNames('h-4 w-4', refreshing && 'animate-spin')} />
          </button>
          {/* New Task lives ONLY in the Outbox (tasks you create/send to others). */}
          {canCreate && bucket === 'outbox' && (
            <button type="button" onClick={() => { setEditing(null); setModalOpen(true); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> New Task
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* LEFT */}
        <aside className="lg:w-[360px] lg:shrink-0">
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
            {BUCKETS.map((b) => {
              const Icon = b.icon;
              const count = lists[b.key].length;
              const active = bucket === b.key;
              return (
                <button key={b.key} type="button" onClick={() => setBucket(b.key)} title={b.hint}
                  className={classNames('flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition',
                    active ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                  <Icon className="h-3.5 w-3.5" /> {b.label}
                  <span className={classNames('rounded-full px-1.5 text-[10px]', active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500')}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-300"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-600">{error}</div>
            ) : currentList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center">
                <p className="text-sm font-medium text-gray-500">
                  {bucket === 'inbox' ? 'Your inbox is empty.' : 'You have not created any tasks.'}
                </p>
              </div>
            ) : (
              currentList.map((t) => <TaskRow key={t.id} task={t} active={selectedId === t.id} onClick={() => openTask(t)} showDirection={bucket === 'inbox'} />)
            )}
          </div>
        </aside>

        {/* RIGHT */}
        <section className="min-w-0 flex-1">
          {!selectedTask ? (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-500"><ListTodo className="h-7 w-7" /></div>
              <p className="font-semibold text-gray-600">Select a task</p>
              <p className="mt-1 text-sm text-gray-400">Choose a task from the left to see its details and chat.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <DetailsPanel
                task={selectedTask}
                collapsed={collapsed}
                onToggle={toggleCollapsed}
                canEdit={canEdit}
                canDelete={canDelete && (selectedTask.createdByMe || isSuperAdmin)}
                onEdit={() => { setEditing(selectedTask); setModalOpen(true); }}
                onDelete={() => handleDelete(selectedTask)}
                onStatus={(s) => handleStatus(selectedTask.id, s)}
              />
              <div className="h-[560px]">
                <MyTaskChat key={selectedTask.id} taskId={selectedTask.id} currentUserId={currentUserId} members={selectedTask.members} />
              </div>
            </div>
          )}
        </section>
      </div>

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
