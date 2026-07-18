'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Pin, PinOff, Pencil, Trash2, Star, CalendarDays, Clock, User, Building2, Paperclip, CheckCircle2, Users, BarChart3, Send, Archive } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { CategoryBadge, PriorityBadge } from './NoticeCard';
import { NoticeAttachments } from './NoticeAttachments';
import type { Notice } from '@/lib/api/notices';

function fmtDateTime(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Lifecycle status chip — draft / published / archived. */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    published: 'bg-emerald-50 text-emerald-700',
    archived: 'bg-slate-200 text-slate-600',
  };
  const cls = map[status] || map.published;
  return <span className={classNames('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', cls)}>{status}</span>;
}

/** Body with Read More / Read Less — CSS line-clamp (breaks on a line, never a word),
 *  preserves paragraphs/line-breaks, toggle shown only when the text overflows. */
function ExpandableBody({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, expanded]);
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <p ref={ref} className={classNames('whitespace-pre-wrap text-sm leading-relaxed text-gray-700', !expanded && 'line-clamp-[8]')}>
        {text}
      </p>
      {(overflows || expanded) && (
        <button type="button" onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
          {expanded ? 'Read Less' : 'Read More'}
        </button>
      )}
    </div>
  );
}

/** Full read view for a notice, with manager-only actions (lifecycle / edit / delete / pin / read report). */
export function NoticeDetailModal({
  notice, onClose, canManage, onEdit, onDelete, onTogglePin, onDeleteAttachment, onAcknowledge, onPublish, onArchive, onViewReport,
}: {
  notice: Notice | null;
  onClose: () => void;
  canManage: boolean;
  onEdit: (n: Notice) => void;
  onDelete: (n: Notice) => void;
  onTogglePin: (n: Notice) => void;
  onDeleteAttachment: (attachmentId: number) => void;
  onAcknowledge: (n: Notice) => Promise<void>;
  onPublish: (n: Notice) => void;
  onArchive: (n: Notice) => void;
  onViewReport: (n: Notice) => void;
}) {
  const [acking, setAcking] = useState(false);

  if (!notice) return null;
  const dept = notice.publishedBy?.department;
  const status = notice.status || 'published';
  const isActive = !notice.expiresAt || new Date(notice.expiresAt).getTime() >= Date.now();
  // Acknowledge only applies to a live, published notice (drafts/archived aren't "current" reading).
  const canAcknowledge = status === 'published' && isActive;
  return (
    <Modal isOpen={!!notice} onClose={onClose} title="Notice" size="lg">
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          {notice.isPinned && <Pin className="mt-1 h-4 w-4 shrink-0 -rotate-45 text-indigo-500" aria-label="Pinned" />}
          <h2 className="text-lg font-bold text-gray-900">{notice.title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={status} />
          <CategoryBadge category={notice.category} />
          <PriorityBadge priority={notice.priority} />
          {notice.isImportant && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              <Star className="h-2.5 w-2.5" /> Important
            </span>
          )}
        </div>

        <ExpandableBody text={notice.body} />

        <div className="grid grid-cols-1 gap-2 text-xs text-gray-500 sm:grid-cols-2">
          <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {notice.publishedBy?.name || 'Unknown'}</span>
          {dept && <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {dept}</span>}
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {fmtDateTime(notice.publishedAt)}</span>
          {notice.expiresAt && <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Expires {fmtDate(notice.expiresAt)}</span>}
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {notice.audience?.type === 'departments'
              ? <>Departments: <span className="font-medium text-gray-700">{notice.audience.departments.join(', ') || '—'}</span></>
              : <>Audience: <span className="font-medium text-gray-700">Entire Company</span></>}
          </span>
        </div>

        {/* Acknowledgement — explicit "I have read this", separate from opening. */}
        {canAcknowledge && (
          <div>
            {notice.acknowledged ? (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Acknowledged{notice.acknowledgedAt ? ` on ${fmtDateTime(notice.acknowledgedAt)}` : ''}
              </div>
            ) : (
              <button
                type="button"
                disabled={acking}
                onClick={async () => { if (acking) return; setAcking(true); try { await onAcknowledge(notice); } finally { setAcking(false); } }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" /> {acking ? 'Saving…' : 'I Have Read This Notice'}
              </button>
            )}
          </div>
        )}

        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <Paperclip className="h-3 w-3" /> Attachments
          </h3>
          <NoticeAttachments attachments={notice.attachments} canManage={canManage} onDelete={onDeleteAttachment} />
        </div>

        {/* Actions — lifecycle + management, all owner-scoped via canManage. */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <button type="button" onClick={() => onTogglePin(notice)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50">
                {notice.isPinned ? <><PinOff className="h-4 w-4" /> Unpin</> : <><Pin className="h-4 w-4" /> Pin</>}
              </button>
            )}
            {canManage && (
              <button type="button" onClick={() => onViewReport(notice)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50">
                <BarChart3 className="h-4 w-4" /> Read Report
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManage && status === 'draft' && (
              <button type="button" onClick={() => onPublish(notice)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">
                <Send className="h-4 w-4" /> Publish
              </button>
            )}
            {canManage && status === 'published' && (
              <button type="button" onClick={() => onArchive(notice)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                <Archive className="h-4 w-4" /> Archive
              </button>
            )}
            {canManage && (
              <>
                <button type="button" onClick={() => onEdit(notice)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50">
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button type="button" onClick={() => onDelete(notice)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </>
            )}
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
