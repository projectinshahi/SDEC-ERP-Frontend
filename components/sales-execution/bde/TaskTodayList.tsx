'use client';

import { Briefcase, UserSquare2 } from 'lucide-react';
import type { SalesTask, SalesTaskPriority } from '@/lib/types/salesExecution';

type Accent = 'red' | 'amber' | 'blue' | 'green';

interface TaskTodayListProps {
  title: string;
  tasks: SalesTask[];
  accent?: Accent;
}

const ACCENT_DOT: Record<Accent, string> = {
  red: 'bg-rose-500',
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
};

const ACCENT_TEXT: Record<Accent, string> = {
  red: 'text-rose-600 dark:text-rose-400',
  amber: 'text-amber-600 dark:text-amber-400',
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-emerald-600 dark:text-emerald-400',
};

const PRIORITY_DOT: Record<SalesTaskPriority, string> = {
  urgent: 'bg-rose-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-gray-300 dark:bg-gray-600',
};

function dueTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Compact dashboard list of sales tasks: priority dot, title, due time,
 * parent deal/lead, and a "Blocked" tag.
 */
export function TaskTodayList({ title, tasks, accent = 'blue' }: TaskTodayListProps) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${ACCENT_DOT[accent]}`} />
        <h4 className={`text-xs font-semibold uppercase tracking-wide ${ACCENT_TEXT[accent]}`}>{title}</h4>
        <span className="text-xs font-medium text-gray-400">({tasks.length})</span>
      </div>

      {tasks.length === 0 ? (
        <p className="py-2 text-xs text-gray-400 dark:text-gray-500">Nothing here</p>
      ) : (
        <ul className="space-y-1">
          {tasks.map((task) => {
            const parent = task.deal?.title || task.lead?.title;
            const ParentIcon = task.deal ? Briefcase : UserSquare2;
            const time = dueTime(task.dueDate);
            return (
              <li
                key={task.id}
                className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`}
                  title={`${task.priority} priority`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{task.title}</p>
                    {task.blocked && (
                      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                        Blocked
                      </span>
                    )}
                  </div>
                  {parent && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-400">
                      <ParentIcon size={11} className="shrink-0" />
                      <span className="truncate">{parent}</span>
                    </p>
                  )}
                </div>
                {time && <span className="shrink-0 text-xs font-medium text-gray-400 tabular-nums">{time}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
