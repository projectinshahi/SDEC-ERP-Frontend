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

export function TeamTaskRow({ task }: TeamTaskRowProps) {
  const completed = task.status === 'completed';
  const overdue = !!task.dueDate && !completed && isOverdue(task.dueDate);
  const parentTitle = task.deal?.title ?? task.lead?.title ?? null;
  const ParentIcon = task.dealId ? TrendingUp : Target;

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
          <Badge variant={STATUS_VARIANTS[task.status]}>
            {STATUS_LABELS[task.status]}
          </Badge>
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
