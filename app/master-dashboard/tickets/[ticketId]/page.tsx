'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Siren, MessageSquare, Paperclip, Download, Clock, Timer, Tag,
  FolderKanban, User, ShieldAlert, CheckCircle2, Calendar, ExternalLink,
} from 'lucide-react';
import { fetchMasterTicketDetail } from '@/lib/api/masterModules';
import { useMasterResource, ModuleStateScreen, ActivityFeed, EmptyState } from '@/components/master/MasterKit';
import { Card, CardBody } from '@/components/Card';
import { classNames } from '@/lib/utils';

const PRIO_CRIT = ['critical', 'urgent', 'blocker', 'p0', 'p1', 'sev1'];
const PRIO_HIGH = ['high', 'major', 'p2', 'sev2'];
const PRIO_MED = ['medium', 'normal', 'moderate', 'p3', 'sev3'];
const RESOLVED = ['resolved', 'done', 'fixed'];
const CLOSED = ['closed', 'completed'];

function priorityCls(severity: string) {
  const s = (severity || '').toLowerCase();
  if (PRIO_CRIT.includes(s)) return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
  if (PRIO_HIGH.includes(s)) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
  if (PRIO_MED.includes(s)) return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
}
function statusCls(status: string) {
  const s = (status || '').toLowerCase();
  if (RESOLVED.includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
  if (CLOSED.includes(s)) return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
}
const fmtDateTime = (d: string | null) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
function fmtSize(bytes: number) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
}

export default function MasterTicketDetailPage() {
  const params = useParams();
  const ticketId = (params.ticketId as string) || '';

  const fetcher = useCallback(() => fetchMasterTicketDetail(ticketId), [ticketId]);
  const { data, status, errorMsg, reload } = useMasterResource(fetcher);

  if (status !== 'ready' || !data) {
    return (
      <div className="space-y-6">
        <BackLink />
        <ModuleStateScreen status={status} errorMsg={errorMsg || 'This ticket could not be loaded.'} onRetry={reload} />
      </div>
    );
  }

  const { ticket, comments, attachments, activity } = data;
  const escalated = !!ticket.escalationLevel && ticket.escalationLevel.toLowerCase() !== 'none';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <BackLink />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">TKT-{ticket.id}</span>
            <span className={classNames('inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border capitalize', statusCls(ticket.status))}>{ticket.status || 'unknown'}</span>
            <span className={classNames('inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border capitalize', priorityCls(ticket.severity))}>{ticket.severity || '—'}</span>
            {escalated && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                <ShieldAlert size={13} /> Escalated
              </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{ticket.title}</h1>
        </div>
        <Link
          href={`/dashboard/blockers?blockerId=${ticket.id}`}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm transition"
        >
          Manage Ticket <ExternalLink size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardBody className="p-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3">Description</h3>
              {ticket.description ? (
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">No description provided.</p>
              )}
              {ticket.notes && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">Notes</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{ticket.notes}</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Comments */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-rose-500" /> Comments
                <span className="text-sm font-medium text-slate-400">({comments.length})</span>
              </h3>
            </div>
            <CardBody className="p-0">
              {comments.length === 0 ? (
                <EmptyState icon={MessageSquare} title="No comments yet" message="No discussion has been recorded on this ticket." />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[460px] overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.id} className="p-4 px-6 flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 text-sm font-bold shrink-0">
                        {c.author.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{c.author}</span>
                          <span className="text-xs text-slate-400">{fmtDateTime(c.created_at)}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{c.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Activity timeline / history */}
          <ActivityFeed activities={activity} title="Activity Timeline & History"
            emptyLabel="No activity recorded for this ticket." maxHeight="max-h-[420px]" />
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          {/* Details */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardBody className="p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Ticket Details</h3>
              <Detail icon={FolderKanban} label="Project" value={ticket.project?.name || '—'} />
              <Detail icon={User} label="Reporter" value={ticket.reporter?.name || '—'} sub={ticket.reporter?.email || undefined} />
              <Detail icon={User} label="Assignee" value={ticket.assignee?.name || 'Unassigned'} sub={ticket.assignee?.email || undefined} />
              <Detail icon={CheckCircle2} label="Resolved By" value={ticket.resolvedBy?.name || '—'} />
              <Detail icon={Calendar} label="Created" value={fmtDateTime(ticket.createdAt)} />
              <Detail icon={Calendar} label="Last Updated" value={fmtDateTime(ticket.updatedAt)} />
              <Detail icon={Clock} label="Age" value={`${ticket.ageDays} day${ticket.ageDays === 1 ? '' : 's'}`} />
              {ticket.resolvedAt && <Detail icon={CheckCircle2} label="Resolved" value={fmtDateTime(ticket.resolvedAt)} />}
              {ticket.resolutionHours != null && (
                <Detail icon={Timer} label="Resolution Time" value={ticket.resolutionHours < 48 ? `${ticket.resolutionHours}h` : `${(ticket.resolutionHours / 24).toFixed(1)}d`} />
              )}
              {ticket.tags && ticket.tags.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1.5"><Tag size={12} /> Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ticket.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Attachments */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-rose-500" /> Attachments
                <span className="text-sm font-medium text-slate-400">({attachments.length})</span>
              </h3>
            </div>
            <CardBody className="p-0">
              {attachments.length === 0 ? (
                <EmptyState icon={Paperclip} title="No attachments" />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attachments.map((f) => (
                    <a key={f.id} href={f.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 px-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <Paperclip size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{f.fileName}</p>
                        <p className="text-xs text-slate-400">{fmtSize(f.fileSize)} · {f.uploadedBy}</p>
                      </div>
                      <Download size={15} className="text-slate-400 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/master-dashboard/tickets" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
      <ArrowLeft size={16} /> Back to Tickets
    </Link>
  );
}

function Detail({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}
