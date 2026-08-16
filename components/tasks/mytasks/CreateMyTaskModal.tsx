'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { usesTaskPoints } from '@/lib/permissions/moduleAccess';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Loader2, Search, X, Check, Users, Paperclip } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';
import { fetchAllUsers, type UserDbResponse } from '@/lib/api/users';
import { fetchProjects } from '@/lib/api/projects';
import {
  createMyTask, updateMyTask, addMyTaskMembers, removeMyTaskMember, fetchMyTask,
  uploadMyTaskAttachment, fetchPriorityRules, DEFAULT_PRIORITY_RULES,
  type MyTask, type PriorityRules,
} from '@/lib/api/myTasks';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const DEFAULT_PRIORITY = 'low'; // new tasks default to LOW

/** Compute a task's default due date + time from a priority's configured rule,
 *  relative to `now` (defaults to the current instant). LOCAL date/time throughout
 *  (matches the app's date-string handling).
 *   - 'calendar' → now + `days` calendar days, at `time` (e.g. High = next day 10:00).
 *   - 'duration' → now + (days*24h + hours) as a DURATION; then, if `time` is set,
 *     roll FORWARD to the next occurrence of that clock time (so "after 1 day at
 *     10:00" = 24h later → the following 10:00). No `time` → the exact offset (Urgent). */
function dueForPriority(p: string, rules: PriorityRules, now: Date = new Date()): { date: string; time: string } | null {
  const rule = rules[p];
  if (!rule) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  if (rule.basis === 'calendar') {
    const d = new Date(now);
    d.setDate(d.getDate() + (rule.days || 0));
    return { date: ymd(d), time: rule.time || hm(d) };
  }

  // 'duration'
  const base = new Date(now.getTime() + ((rule.days || 0) * 86400 + (rule.hours || 0) * 3600) * 1000);
  if (!rule.time) return { date: ymd(base), time: hm(base) };
  const [h, m] = rule.time.split(':').map(Number);
  const target = new Date(base);
  target.setHours(h, m, 0, 0);
  // If that clock time already passed at the duration mark, roll to the next day.
  if (target.getTime() < base.getTime()) target.setDate(target.getDate() + 1);
  return { date: ymd(target), time: rule.time };
}

/** Initials for the option avatar (no avatar image field exists on users). */
function initials(name: string) {
  return (name || '?').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

/**
 * Dedicated create/edit form for the My Tasks module (NOT the Kanban
 * CreateTaskModal). Fields: Title, Description, Members (multi-select), Priority,
 * Due Date. Create sends memberIds atomically; edit diffs the member set and
 * calls the members endpoints (best-effort — task fields save regardless).
 */
export function CreateMyTaskModal({
  isOpen, onClose, onSaved, editTask, canAssign = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (task: MyTask) => void;
  editTask?: MyTask | null;
  /** Whether the member picker is editable (needs mytasks.assign for edits). */
  canAssign?: boolean;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  // Points are a Development-side concept; Sales users never see them.
  const showPoints = usesTaskPoints(user);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(DEFAULT_PRIORITY);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  // Configurable priority → due-time rules (defaults until the config loads).
  const [priorityRules, setPriorityRules] = useState<PriorityRules>(DEFAULT_PRIORITY_RULES);
  // True once the user hand-edits the due date/time, so the priority auto-fill
  // (create mode) never silently overwrites their manual choice.
  const dueTouched = useRef(false);
  const [selected, setSelected] = useState<Map<number, string>>(new Map());
  const [inChargeId, setInChargeId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<string>('');
  // Kept as a string so the input can be emptied; '' means 0 (the field is optional).
  const [estimatedPoints, setEstimatedPoints] = useState('');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<UserDbResponse[]>([]);
  const [search, setSearch] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const showMembers = !editTask || canAssign;

  useEffect(() => {
    if (!isOpen) return;
    // EVERY active user across all modules — the backend already returns the
    // complete active-user list (single source of truth, no module/role/team
    // scoping), so NO additional client-side filtering is applied here.
    fetchAllUsers().then(setUsers).catch(() => {});
    // Project list for the optional Project link (reuses the existing projects API).
    fetchProjects()
      .then((ps) => setProjects((ps || []).map((p: any) => ({ id: String(p.id), name: p.name }))))
      .catch(() => {});
    // Load the configured priority rules; refine the default (LOW) due once they
    // arrive (create mode only, and only if the user hasn't touched the due yet).
    fetchPriorityRules()
      .then((rules) => {
        setPriorityRules(rules);
        if (!editTask && !dueTouched.current) {
          const due = dueForPriority(DEFAULT_PRIORITY, rules);
          if (due) { setDueDate(due.date); setDueTime(due.time); }
        }
      })
      .catch(() => {});
    setSearch('');
    setPendingFiles([]);
    dueTouched.current = false;
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description || '');
      setPriority(editTask.priority || DEFAULT_PRIORITY);
      setDueDate(editTask.dueDate || '');
      setDueTime(editTask.dueTime || '');
      setSelected(new Map(editTask.members.map((m) => [m.id, m.name])));
      setInChargeId(editTask.inChargeId || null);
      setProjectId(editTask.projectId || '');
      setEstimatedPoints(editTask.estimatedPoints ? String(editTask.estimatedPoints) : '');
    } else {
      setTitle('');
      setDescription('');
      setPriority(DEFAULT_PRIORITY);
      // Immediate default due from the current rules (refined when the fetch resolves).
      const due = dueForPriority(DEFAULT_PRIORITY, priorityRules);
      setDueDate(due?.date || '');
      setDueTime(due?.time || '');
      setSelected(new Map());
      setInChargeId(null);
      setProjectId('');
      setEstimatedPoints('');
    }
  }, [isOpen, editTask]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) =>
      !q
      || u.name.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || (u.role || '').toLowerCase().includes(q),
    );
  }, [users, search]);

  const toggle = (u: UserDbResponse) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(u.id)) next.delete(u.id);
      else next.set(u.id, u.name);
      return next;
    });
    setInChargeId((prev) => (prev === u.id ? null : prev));
  };

  const uploadFiles = async (taskId: number) => {
    if (!pendingFiles.length) return;
    const form = new FormData();
    pendingFiles.forEach((f) => form.append('files', f));
    try {
      await uploadMyTaskAttachment(taskId, form);
    } catch (err) {
      console.error('Attachment upload failed', err);
      toast('Task saved, but some attachments failed to upload.', 'error');
    }
  };

  const submit = async () => {
    if (!title.trim()) { toast('Title is required.', 'error'); return; }
    if (dueDate && !dueTime) { toast('Due Time is required when a Due Date is set.', 'error'); return; }
    // At least one assignee must be selected (when the member picker is shown).
    if (showMembers && selected.size === 0) { toast('Select at least one member.', 'error'); return; }
    let finalInCharge = inChargeId;
    if (showMembers && selected.size === 1) {
      finalInCharge = Array.from(selected.keys())[0];
    } else if (showMembers && selected.size > 1) {
      if (!finalInCharge || !selected.has(finalInCharge)) {
        toast('Please select an In-Charge for this task.', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      if (editTask) {
        await updateMyTask(editTask.id, { title: title.trim(), description, priority, dueDate: dueDate || null, dueTime: dueTime || null, inChargeId: finalInCharge, projectId: projectId || null, estimatedPoints: Number(estimatedPoints) || 0 });
        if (canAssign) {
          const orig = new Set(editTask.members.map((m) => m.id));
          const now = new Set(selected.keys());
          const toAdd = [...now].filter((id) => !orig.has(id));
          const toRemove = [...orig].filter((id) => !now.has(id));
          try {
            if (toAdd.length) await addMyTaskMembers(editTask.id, toAdd);
            for (const id of toRemove) await removeMyTaskMember(editTask.id, id);
          } catch (memErr) {
            console.error('Member update failed', memErr);
          }
        }
        await uploadFiles(editTask.id);
        const fresh = await fetchMyTask(editTask.id);
        toast('Task updated.', 'success');
        onSaved(fresh);
      } else {
        const created = await createMyTask({
          title: title.trim(),
          description,
          priority,
          dueDate: dueDate || null,
          dueTime: dueTime || null,
          memberIds: Array.from(selected.keys()),
          inChargeId: finalInCharge,
          projectId: projectId || null,
          estimatedPoints: Number(estimatedPoints) || 0,
        });
        await uploadFiles(created.id);
        toast('Task created.', 'success');
        onSaved(created);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save task', err);
      toast('Failed to save task.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editTask ? 'Edit Task' : 'New Task'} size="lg">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add more detail…"
            className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Optional Project link — powers the Task Dashboard's Project filter. */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Project <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">No project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
            <select
              value={priority}
              onChange={(e) => {
                const p = e.target.value;
                setPriority(p);
                // An EXPLICIT priority change always recomputes the due from that
                // priority's rule (create mode). This resets any earlier manual due
                // edit — the priority now owns the due again (dueTouched cleared).
                if (!editTask) {
                  dueTouched.current = false;
                  const due = dueForPriority(p, priorityRules);
                  if (due) { setDueDate(due.date); setDueTime(due.time); }
                }
              }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm capitalize focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PRIORITIES.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => { dueTouched.current = true; setDueDate(e.target.value); }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Due Time</label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => { dueTouched.current = true; setDueTime(e.target.value); }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {/* Optional; blank = 0. Only credited to performance once the task is
              approved, so the hint sets the expectation at entry time. Hidden for
              users outside the points system (e.g. Sales) — they get the plain
              task workflow. */}
          {showPoints && (
          <div>
            <label htmlFor="mytask-points" className="mb-1 block text-sm font-medium text-gray-700">Estimated Points</label>
            {/* Decimals allowed (1.5, 3.75, …); step="any" + hidden native spinner
                arrows make it a clean numeric input. */}
            <input
              id="mytask-points"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              placeholder="0"
              value={estimatedPoints}
              onChange={(e) => setEstimatedPoints(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <p className="mt-1 text-xs text-gray-400">Awarded after approval · decimals allowed</p>
          </div>
          )}
        </div>

        {/* Members — hidden in EDIT mode without the Assign Members permission
            (so member edits are never silently discarded). */}
        {showMembers && (
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Users className="h-4 w-4 text-gray-400" /> Members {selected.size > 0 && <span className="text-gray-400">({selected.size})</span>}
          </label>
          {selected.size > 0 && (
            <div className="mb-3 space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-2">
              {Array.from(selected.entries()).map(([id, name]) => {
                const isCharge = inChargeId === id;
                const onlyOne = selected.size === 1;
                return (
                  <div key={id} className="flex items-center justify-between rounded-md bg-white px-3 py-1.5 shadow-sm">
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      {name}
                    </span>
                    <div className="flex items-center gap-3">
                      {!onlyOne && (
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900">
                          <input
                            type="radio"
                            name="inCharge"
                            checked={isCharge}
                            onChange={() => setInChargeId(id)}
                            className="h-3.5 w-3.5 border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          In-Charge
                        </label>
                      )}
                      {onlyOne && <span className="text-xs font-medium text-blue-600">⭐ In-Charge</span>}
                      <button
                        type="button"
                        onClick={() => {
                          setSelected((prev) => { const n = new Map(prev); n.delete(id); return n; });
                          setInChargeId((prev) => (prev === id ? null : prev));
                        }}
                        className="text-gray-400 hover:text-rose-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="rounded-lg border border-gray-200">
            <div className="relative border-b border-gray-100">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email or role…"
                className="w-full rounded-t-lg py-2 pl-9 pr-3 text-sm focus:outline-none"
              />
            </div>
            <div className="max-h-44 overflow-y-auto p-1">
              {filteredUsers.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-gray-400">No users found.</p>
              ) : (
                filteredUsers.map((u) => {
                  const on = selected.has(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggle(u)}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                          {initials(u.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-gray-800">{u.name}</span>
                          <span className="block truncate text-xs text-gray-400">
                            {u.role && <span className="capitalize text-gray-500">{u.role}</span>}
                            {u.role && u.email ? ' · ' : ''}
                            {u.email}
                          </span>
                        </span>
                      </span>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'}`}>
                        {on && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
        )}

        {/* Attachments */}
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Paperclip className="h-4 w-4 text-gray-400" /> Attachments
          </label>
          <input
            type="file"
            multiple
            onChange={(e) => setPendingFiles(Array.from(e.target.files || []))}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {pendingFiles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pendingFiles.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {f.name}
                  <button type="button" onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editTask ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
