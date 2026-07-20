'use client';

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';
import {
  exportTaskPdf,
  type TaskReport, type TaskReportField, type TaskReportMessage,
  type TaskReportActivity, type TaskReportAttachment, type TaskReportMember,
} from '@/lib/pdf/dashboardPdf';
import { fetchMyTaskMessages, type MyTask, type MyTaskMessage } from '@/lib/api/myTasks';

/**
 * Export a single My Task as a professional multi-page PDF — reuses the shared
 * report engine (`exportTaskPdf` in lib/pdf/dashboardPdf.ts), the same one that
 * powers every Founder dashboard export. No new PDF logic, no new permission model:
 * the button only renders inside the task details a user can already open, and it
 * pulls from data already loaded on `task` (plus ONE messages fetch on click).
 */

const ICON_CLASS =
  'rounded-lg p-2 sm:p-1.5 text-gray-400 hover:bg-gray-50 hover:text-indigo-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

/* ── formatting helpers (display-only) ───────────────────────────────────────── */

function fmtDateTime(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(s?: string | null): string {
  if (!s) return '';
  // due_date is a date-only value (@db.Date); parse the Y-M-D parts tz-safe.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
function timeOf(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
/** Local calendar date of a full timestamp — pairs with timeOf() so a chat row's
 *  date and time share ONE local instant (fmtDate is for date-only dueDate only). */
function localDate(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDueTime(t?: string | null): string {
  if (!t) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  const h = Number(m[1]);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m[2]} ${ampm}`;
}
function humanSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}
function fileTypeOf(name: string): string {
  const ext = name.includes('.') ? (name.split('.').pop() || '').toUpperCase() : '';
  return ext ? `${ext} file` : 'File';
}
function titleCase(s: string): string {
  return String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ExportTaskPdfButton({
  task, generatedBy, className, label,
}: {
  task: MyTask;
  generatedBy: string;
  className?: string;
  /** Optional text beside the icon — e.g. when rendered as a menu row. */
  label?: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // The full chat thread is NOT part of the task detail — fetch it once, on export.
      // Everything else (members, attachments, activities) is already on `task`.
      let messages: MyTaskMessage[] = [];
      try { messages = await fetchMyTaskMessages(task.id); } catch { messages = []; }

      // id → name, for resolving @mention ids + the In-Charge id.
      const nameById = new Map<number, string>();
      if (task.createdBy?.id) nameById.set(task.createdBy.id, task.createdBy.name);
      for (const mem of task.members) nameById.set(mem.id, mem.name);
      for (const msg of messages) if (msg.sender?.id) nameById.set(msg.sender.id, msg.sender.name);
      const inChargeName = task.inChargeId != null ? (nameById.get(task.inChargeId) ?? `User #${task.inChargeId}`) : '';

      const basic: TaskReportField[] = [
        { label: 'Status', value: titleCase(task.status) },
        { label: 'Priority', value: titleCase(task.priority) },
        { label: 'Due Date', value: fmtDate(task.dueDate) || 'Not set' },
        { label: 'Due Time', value: fmtDueTime(task.dueTime) || 'Not set' },
        { label: 'Created Date', value: fmtDateTime(task.createdAt) },
        { label: 'Last Updated', value: fmtDateTime(task.updatedAt) },
      ];
      if (task.status === 'waiting' && task.waitingReason) {
        basic.push({ label: 'Waiting Reason', value: task.waitingReason });
      }

      const responsibility: TaskReportField[] = [
        { label: 'Created By', value: task.createdBy?.name ?? '—' },
        { label: 'Task In-Charge', value: inChargeName || 'Unassigned' },
      ];
      if (task.projectName || task.projectId) {
        responsibility.push({ label: 'Project', value: task.projectName ?? String(task.projectId) });
      }

      const members: TaskReportMember[] = task.members.map((m) => ({
        name: m.name,
        role: m.id === task.inChargeId ? 'In-Charge' : (m.id === task.createdBy?.id ? 'Owner' : undefined),
      }));

      const attachments: TaskReportAttachment[] = (task.attachments || []).map((a) => ({
        fileName: a.file_name,
        fileType: fileTypeOf(a.file_name),
        fileSize: humanSize(a.file_size),
        uploadedBy: a.uploader?.name ?? (a.uploaded_by ? `User #${a.uploaded_by}` : '—'),
        uploadedDate: fmtDateTime(a.uploaded_at) || '—',
        url: a.file_url,
      }));

      // Chat — the messages API returns chronological (asc) order already.
      const chat: TaskReportMessage[] = messages.map((m) => {
        const ids: number[] = Array.isArray(m.metadata?.mentions) ? m.metadata.mentions : [];
        const mentions = ids.map((id) => (nameById.get(id) ? `@${nameById.get(id)}` : `@#${id}`)).join(', ');
        return {
          sender: m.sender?.name ?? (m.sender_id ? `User #${m.sender_id}` : 'Unknown'),
          // created_at is a full timestamp — derive date + time from the SAME local
          // instant (fmtDate reads the UTC date-substring and is for date-only dueDate).
          date: localDate(m.created_at),
          time: timeOf(m.created_at),
          body: m.message,
          mentions: mentions || undefined,
        };
      });

      // Activity timeline — chronological.
      const asc = [...(task.activities || [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const activities: TaskReportActivity[] = asc.map((act) => ({
        user: act.user?.name ?? 'Unknown',
        action: act.action,
        timestamp: fmtDateTime(act.createdAt),
      }));

      // Completion / approval — reconstructed from the activity log (there is no
      // completion timestamp column). Activities read "Changed Status … → Done/Approved".
      const lastMatch = (re: RegExp) => [...asc].reverse().find((a) => re.test(a.action));
      const doneAct = lastMatch(/→\s*done/i);
      const approvedAct = lastMatch(/→\s*approved/i);
      // A task can reach a terminal state via "→ Done" OR jump straight to "→ Approved"
      // (approval implies completion) — use whichever marks completion.
      const completedAct = doneAct ?? approvedAct;
      // Gate on the task's CURRENT status, NOT on historical activity: My Tasks status
      // is free-form, so a task can be reopened (done → in_progress). We must not show a
      // "completed" record for a task that is currently active. When terminal but the
      // event wasn't logged (e.g. created directly as done), fall back to updated_at.
      const isApproved = task.status === 'approved';
      const isCompleted = task.status === 'done' || isApproved;
      const completion: TaskReportField[] = [];
      if (isCompleted) {
        completion.push({ label: 'Completed By', value: completedAct?.user?.name ?? '—' });
        completion.push({ label: 'Completed Date', value: fmtDateTime(completedAct?.createdAt ?? task.updatedAt) || '—' });
      }
      if (isApproved) {
        completion.push({ label: 'Approved By', value: approvedAct?.user?.name ?? '—' });
        completion.push({ label: 'Approved Date', value: fmtDateTime(approvedAct?.createdAt ?? task.updatedAt) || '—' });
      }

      const metadata: TaskReportField[] = [
        { label: 'Read Status', value: task.unread ? 'Unread' : 'Read' },
        { label: 'Created At', value: fmtDateTime(task.createdAt) },
        { label: 'Updated At', value: fmtDateTime(task.updatedAt) },
        { label: 'Internal Reference', value: `MT-${task.id}` },
      ];

      const report: TaskReport = {
        fileBase: `Task_${task.id}`,
        generatedBy: generatedBy || '—',
        taskId: task.id,
        taskRef: `MT-${task.id}`,
        title: task.title,
        description: task.description ?? '',
        basic,
        responsibility,
        members,
        attachments,
        chat,
        activities,
        completion,
        metadata,
      };

      await exportTaskPdf(report);
    } catch (err) {
      console.error('Task PDF export failed:', err);
      toast('Failed to export the task PDF. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title="Export this task as a PDF report"
      aria-label="Export task as PDF"
      className={className ?? ICON_CLASS}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {label && <span>{busy ? 'Preparing…' : label}</span>}
    </button>
  );
}
