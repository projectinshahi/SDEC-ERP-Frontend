'use client';

import type { MyTask } from '@/lib/api/myTasks';
import { classNames } from '@/lib/utils';

/**
 * Grid view for My Tasks — a compact status-at-a-glance board.
 *
 * Renders whatever array it is handed, which is the SAME already-filtered,
 * already-searched list the List view uses (`currentList`). So search, date /
 * status / read / in-charge filters and role-based visibility all apply with no
 * extra fetch, no duplicated filter logic and no second copy of task state.
 *
 * Clicking a tile calls back into the existing `openTask`, so Task Details,
 * comments, attachments and permissions are untouched.
 */

export type GridTone = 'approved' | 'done' | 'overdue' | 'waiting' | 'active' | 'todo';

/**
 * A tile's status, derived from the SAME rules the rest of the module uses:
 * `status` for the workflow state, and the "due date in the past" test that
 * `fmtDue` applies (an approved task has left the overdue workflow, so it is
 * never marked delayed). No new status definitions are introduced here.
 */
export function gridStatusOf(task: MyTask, todayYmd: string): GridTone {
  if (task.status === 'approved') return 'approved';
  if (task.status === 'done') return 'done';
  if (task.dueDate && task.dueDate < todayYmd) return 'overdue';
  if (task.status === 'waiting') return 'waiting';
  if (task.status === 'in_progress') return 'active';
  return 'todo';
}

/** Colour + a screen-reader/legend label. Colour is never the ONLY signal: every
 *  tile carries the status in its aria-label and title (hover/screen reader),
 *  and the legend below names every colour — without putting text on the tile. */
export const TONE: Record<GridTone, { bg: string; border: string; text: string; label: string }> = {
  approved: { bg: 'bg-green-100 dark:bg-green-950/40',   border: 'border-green-300 dark:border-green-800',   text: 'text-green-700 dark:text-green-300',   label: 'Approved' },
  done:     { bg: 'bg-violet-100 dark:bg-violet-950/40', border: 'border-violet-300 dark:border-violet-800', text: 'text-violet-700 dark:text-violet-300', label: 'Done' },
  overdue:  { bg: 'bg-rose-100 dark:bg-rose-950/40',     border: 'border-rose-300 dark:border-rose-800',     text: 'text-rose-700 dark:text-rose-300',     label: 'Delayed' },
  waiting:  { bg: 'bg-amber-100 dark:bg-amber-950/40',   border: 'border-amber-300 dark:border-amber-800',   text: 'text-amber-700 dark:text-amber-300',   label: 'Waiting' },
  active:   { bg: 'bg-blue-100 dark:bg-blue-950/40',     border: 'border-blue-300 dark:border-blue-800',     text: 'text-blue-700 dark:text-blue-300',     label: 'In Progress' },
  todo:     { bg: 'bg-slate-100 dark:bg-slate-800/60',   border: 'border-slate-300 dark:border-slate-700',   text: 'text-slate-600 dark:text-slate-300',   label: 'To Do' },
};

// Status-filter display order: To Do → In Progress → Waiting → Done → Delayed →
// Approved (Approved last). Delayed (overdue) is the only tone that isn't one of the
// 5 raw statuses; it stays in the list so overdue tasks remain filterable.
export const GRID_LEGEND: GridTone[] = ['todo', 'active', 'waiting', 'done', 'overdue', 'approved'];

export function MyTasksGrid({
  tasks, todayYmd, selectedId, onOpen,
}: {
  tasks: MyTask[];
  todayYmd: string;
  selectedId?: number | null;
  onOpen: (task: MyTask) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400 dark:border-gray-700">
        No tasks match your filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* The status legend now lives in the shared toolbar as the clickable status
          FILTER (StatusFilterBadges), so it applies to List/Grid/Calendar alike —
          a second copy here would duplicate it. Tiles keep the SAME tone colours. */}

      {/* auto-fill keeps the circles a fixed comfortable size and simply fits more
          per row as the screen widens — one rule for phone through large monitor,
          with no per-breakpoint column counts to maintain. */}
      <ul
        className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-2.5 sm:gap-3"
        aria-label="Tasks grid"
      >
        {tasks.map((task) => {
          const tone = TONE[gridStatusOf(task, todayYmd)];
          const due = task.dueDate ? `due ${task.dueDate}` : 'no due date';
          return (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onOpen(task)}
                // Everything the tile does NOT show lives here: screen readers get
                // the full context, and desktop gets it on hover.
                aria-label={`Task ${task.id}: ${task.title} — ${tone.label}, ${due}`}
                title={`#${task.id} · ${task.title}
${tone.label} · ${due}`}
                className={classNames(
                  // Square cell -> perfect circle at every column width. min-h keeps
                  // the touch target comfortable on the narrowest phones.
                  'flex aspect-square w-full min-h-[44px] items-center justify-center rounded-full border',
                  'text-sm font-bold tabular-nums transition',
                  'hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
                  // Soft pastel fill + a tinted border of the same hue; the number is
                  // the DARK shade of that hue, so it stays readable without the
                  // heavy saturated block the solid fill produced.
                  tone.bg, tone.border, tone.text,
                  // Unread and current-selection are conveyed by a ring, not by text.
                  selectedId === task.id && 'ring-2 ring-indigo-500 ring-offset-2',
                  task.unread && selectedId !== task.id && 'ring-2 ring-rose-400 ring-offset-1',
                )}
              >
                {task.id}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
