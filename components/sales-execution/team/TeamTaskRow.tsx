'use client';

/**
 * SE-028.1 — Compact read-only task row for the Manager Team Task view.
 *
 * Unlike the editable SalesTaskCard, this is a manager-facing summary: title,
 * assignee, priority, due date (red when overdue & not completed), status and
 * parent (deal/lead) plus the SE-024 blocked treatment. Overdue and blocked
 * rows are visually highlighted.
 */

import {
  AlertCircle,
  CalendarDays,
  User,
  Ban,
  TrendingUp,
  Target,
  Users,
  UserCircle,
  History,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge, type BadgeVariant } from '@/components/Badge';
import { classNames } from '@/lib/utils';
import type {
  SalesTask,
  SalesTaskPriority,
  SalesTaskStatus,
} from '@/lib/types/salesExecution';

interface TeamTaskRowProps {
  task: SalesTask;
  /**
   * SE-028 — when the viewer may edit (sales.edit), the status badge becomes an
   * inline control so a Team Lead can move a task Open → In Progress → Completed
   * straight from Team Tasks. Because Team Tasks and Sales Tasks read the SAME
   * record, the change reflects in both views on the next refresh.
   */
  canEdit?: boolean;
  /** Set status to open/in_progress directly (completed routes through onComplete). */
  onSetStatus?: (task: SalesTask, status: SalesTaskStatus) => void;
  /** Begin the outcome-capture completion workflow (CompleteTaskModal). */
  onComplete?: (task: SalesTask) => void;
}

const PRIORITY_VARIANTS: Record<SalesTaskPriority, BadgeVariant> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const PRIORITY_LABELS: Record<SalesTaskPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const STATUS_VARIANTS: Record<SalesTaskStatus, BadgeVariant> = {
  open: 'default',
  in_progress: 'info',
  completed: 'success',
};

const STATUS_LABELS: Record<SalesTaskStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
};

function isOverdue(dueDate: string): boolean {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function formatDue(dueDate: string): string {
  try {
    return format(new Date(dueDate), 'MMM d, yyyy');
  } catch {
    return dueDate;
  }
}

/** Inline status editor — a native select styled to read like the status badge. */
function StatusControl({
  task,
  onSetStatus,
  onComplete,
}: {
  task: SalesTask;
  onSetStatus: (task: SalesTask, status: SalesTaskStatus) => void;
  onComplete: (task: SalesTask) => void;
}) {
  const tone: Record<SalesTaskStatus, string> = {
    open: 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-700/40 dark:text-gray-200',
    in_progress: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300',
    completed: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  };
  return (
    <select
      value={task.status}
      aria-label={`Status for ${task.title}`}
      onChange={(e) => {
        const next = e.target.value as SalesTaskStatus;
        if (next === task.status) return;
        // Completing requires an outcome → route through the completion modal.
        if (next === 'completed') onComplete(task);
        else onSetStatus(task, next);
      }}
      onClick={(e) => e.stopPropagation()}
      className={classNames(
        'cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] font-semibold outline-none transition-colors focus:ring-2 focus:ring-blue-500/30',
        tone[task.status],
      )}
    >
      <option value="open">Open</option>
      <option value="in_progress">In Progress</option>
      <option value="completed">Completed</option>
    </select>
  );
}

export function TeamTaskRow({ task, canEdit, onSetStatus, onComplete }: TeamTaskRowProps) {
  const completed = task.status === 'completed';
  const overdue = !!task.dueDate && !completed && isOverdue(task.dueDate);
  const parentTitle = task.deal?.title ?? task.lead?.title ?? null;
  const ParentIcon = task.dealId ? TrendingUp : Target;
  const editable = !!canEdit && !!onSetStatus && !!onComplete;

  return (
    <div
      className={classNames(
        'flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800',
        task.blocked
          ? 'border-amber-300 dark:border-amber-800/60'
          : overdue
            ? 'border-rose-300 dark:border-rose-800/60'
            : 'border-gray-200 dark:border-gray-700',
        completed && 'opacity-75'
      )}
    >
      <div className="min-w-0 flex-1">
        {/* Title + badges */}
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={classNames(
              'min-w-0 break-words text-sm font-semibold',
              completed
                ? 'text-gray-400 line-through dark:text-gray-500'
                : 'text-gray-900 dark:text-gray-100'
            )}
          >
            {task.title}
          </h3>
          <Badge variant={PRIORITY_VARIANTS[task.priority]}>
            {PRIORITY_LABELS[task.priority]}
          </Badge>
          {editable ? (
            <StatusControl task={task} onSetStatus={onSetStatus!} onComplete={onComplete!} />
          ) : (
            <Badge variant={STATUS_VARIANTS[task.status]}>
              {STATUS_LABELS[task.status]}
            </Badge>
          )}
          {task.blocked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
              <Ban size={11} /> Blocked
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1">
            <User size={12} className="text-gray-400" />
            {task.assignee?.name ?? 'Unassigned'}
          </span>

          {task.team?.name && (
            <span className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
              <Users size={12} />
              {task.team.name}
            </span>
          )}

          {task.createdBy?.name && (
            <span className="inline-flex items-center gap-1">
              <UserCircle size={12} className="text-gray-400" />
              By {task.createdBy.name}
            </span>
          )}

          {task.dueDate && (
            <span
              className={classNames(
                'inline-flex items-center gap-1 font-medium',
                overdue && 'text-rose-600 dark:text-rose-400'
              )}
            >
              {overdue ? (
                <AlertCircle size={12} />
              ) : (
                <CalendarDays size={12} className="text-gray-400" />
              )}
              {formatDue(task.dueDate)}
              {overdue && <span className="font-semibold">· Overdue</span>}
            </span>
          )}

          {parentTitle && (
            <span className="inline-flex items-center gap-1 font-medium text-gray-600 dark:text-gray-300">
              <ParentIcon
                size={12}
                className={task.dealId ? 'text-violet-500' : 'text-amber-500'}
              />
              <span className="max-w-[200px] truncate">{parentTitle}</span>
            </span>
          )}

          {task.createdAt && (
            <span className="inline-flex items-center gap-1 text-gray-400">
              Created {formatDue(task.createdAt)}
            </span>
          )}

          {task.updatedAt && (
            <span className="inline-flex items-center gap-1 text-gray-400">
              <History size={12} className="text-gray-400" />
              Updated {formatDue(task.updatedAt)}
            </span>
          )}
        </div>

        {/* Blocked reason */}
        {task.blocked && task.blockerReason && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            <Ban size={13} className="mt-0.5 shrink-0" />
            <span className="break-words font-medium">{task.blockerReason}</span>
          </div>
        )}
      </div>
    </div>
  );
}
