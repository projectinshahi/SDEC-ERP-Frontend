'use client';

/**
 * SE-023 / SE-024 — Sales Task card.
 *
 * A single task row in the task list: completion toggle, type icon, priority,
 * due date with overdue indicator, parent (lead/deal) link, assignee and the
 * SE-024 "Blocked" treatment (red badge + blocker reason). Actions are gated
 * by the canEdit / canDelete flags supplied by the page.
 */

import {
  Phone,
  Users,
  Mail,
  RefreshCw,
  FileText,
  TrendingUp,
  Target,
  CalendarDays,
  User,
  Ban,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  Circle,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge, type BadgeVariant } from '@/components/Badge';
import { classNames } from '@/lib/utils';
import type {
  SalesTask,
  SalesTaskType,
  SalesTaskPriority,
} from '@/lib/types/salesExecution';

interface SalesTaskCardProps {
  task: SalesTask;
  onToggleStatus: (t: SalesTask) => void;
  onBlock: (t: SalesTask) => void;
  onDelete: (t: SalesTask) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const TYPE_ICONS: Record<SalesTaskType, React.ComponentType<{ size?: number; className?: string }>> = {
  call: Phone,
  meeting: Users,
  email: Mail,
  follow_up: RefreshCw,
  proposal_review: FileText,
};

const TYPE_LABELS: Record<SalesTaskType, string> = {
  call: 'Call',
  meeting: 'Meeting',
  email: 'Email',
  follow_up: 'Follow-up',
  proposal_review: 'Proposal Review',
};

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

/** Midnight-truncated comparison so "today" is never counted as overdue. */
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

export function SalesTaskCard({
  task,
  onToggleStatus,
  onBlock,
  onDelete,
  canEdit,
  canDelete,
}: SalesTaskCardProps) {
  const completed = task.status === 'completed';
  const TypeIcon = TYPE_ICONS[task.type] ?? FileText;
  const overdue = !!task.dueDate && !completed && isOverdue(task.dueDate);

  const parentTitle = task.deal?.title ?? task.lead?.title ?? null;
  const ParentIcon = task.dealId ? TrendingUp : Target;

  return (
    <div
      className={classNames(
        'group relative flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md dark:bg-gray-800',
        task.blocked
          ? 'border-red-300 dark:border-red-800/60'
          : 'border-gray-200 dark:border-gray-700',
        completed && 'opacity-75'
      )}
    >
      {/* Completion toggle */}
      <button
        type="button"
        onClick={() => onToggleStatus(task)}
        disabled={!canEdit}
        aria-label={completed ? 'Reopen task' : 'Mark task complete'}
        className={classNames(
          'mt-0.5 shrink-0 rounded-full transition-colors',
          canEdit ? 'cursor-pointer' : 'cursor-not-allowed',
          completed
            ? 'text-emerald-500 hover:text-emerald-600'
            : 'text-gray-300 hover:text-emerald-500 dark:text-gray-600'
        )}
      >
        {completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
      </button>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Title + priority */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={classNames(
              'inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300',
              completed && 'bg-gray-100 text-gray-400 dark:bg-gray-700/40'
            )}
            title={TYPE_LABELS[task.type]}
          >
            <TypeIcon size={14} />
          </span>
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
          {task.blocked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
              <Ban size={11} /> Blocked
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1 font-medium">
            <TypeIcon size={12} className="text-gray-400" />
            {TYPE_LABELS[task.type]}
          </span>

          {task.dueDate && (
            <span
              className={classNames(
                'inline-flex items-center gap-1 font-medium',
                overdue && 'text-red-600 dark:text-red-400'
              )}
            >
              {overdue ? <AlertCircle size={12} /> : <CalendarDays size={12} className="text-gray-400" />}
              {formatDue(task.dueDate)}
              {overdue && <span className="font-semibold">· Overdue</span>}
            </span>
          )}

          {parentTitle && (
            <span className="inline-flex items-center gap-1 font-medium text-gray-600 dark:text-gray-300">
              <ParentIcon size={12} className={task.dealId ? 'text-violet-500' : 'text-amber-500'} />
              <span className="max-w-[180px] truncate">{parentTitle}</span>
            </span>
          )}

          {task.assignee?.name && (
            <span className="inline-flex items-center gap-1">
              <User size={12} className="text-gray-400" />
              {task.assignee.name}
            </span>
          )}
        </div>

        {/* Blocked reason */}
        {task.blocked && task.blockerReason && (
          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
            <Ban size={13} className="mt-0.5 shrink-0" />
            <span className="break-words font-medium">{task.blockerReason}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {(canEdit || canDelete) && (
        <div className="flex shrink-0 items-center gap-1 self-start opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {canEdit && (
            <button
              type="button"
              onClick={() => onBlock(task)}
              title={task.blocked ? 'Unblock task' : 'Mark as blocked'}
              className={classNames(
                'rounded-lg p-1.5 transition-colors',
                task.blocked
                  ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                  : 'text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20'
              )}
            >
              {task.blocked ? <ShieldCheck size={16} /> : <Ban size={16} />}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(task)}
              title="Delete task"
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
