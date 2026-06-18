'use client';

/**
 * SE-023 / SE-024 — Sales Tasks workspace.
 *
 * A HubSpot/Salesforce-style task list: filter bar + summary chips + tasks
 * grouped into Overdue / Due Today / Upcoming / Completed buckets. Tasks can be
 * completed, blocked/unblocked (SE-024) and deleted, all gated by permissions.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  Plus,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Ban,
  Filter,
  Repeat,
  ChevronDown,
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { SelectField } from '@/components/ui/SelectField';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { SalesTaskCard } from '@/components/sales-execution/SalesTaskCard';
import { CreateSalesTaskModal } from '@/components/sales-execution/CreateSalesTaskModal';
import { BlockTaskModal } from '@/components/sales-execution/BlockTaskModal';
import { CompleteTaskModal } from '@/components/sales-execution/CompleteTaskModal';
import { RecurringTasksList } from '@/components/sales-execution/RecurringTasksList';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  fetchSalesTasks,
  updateSalesTask,
  deleteSalesTask,
} from '@/lib/api/salesTasks';
import { classNames } from '@/lib/utils';
import type {
  SalesTask,
  SalesTaskFilters,
  SalesTaskStatus,
  SalesTaskType,
} from '@/lib/types/salesExecution';

type DueFilter = 'all' | 'today' | 'overdue' | 'upcoming';
type StatusFilter = 'all' | SalesTaskStatus;
type TypeFilter = 'all' | SalesTaskType;
type ScopeFilter = 'mine' | 'all';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'proposal_review', label: 'Proposal Review' },
];

const DUE_OPTIONS = [
  { value: 'all', label: 'Any Due Date' },
  { value: 'today', label: 'Due Today' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'upcoming', label: 'Upcoming' },
];

const SCOPE_OPTIONS = [
  { value: 'mine', label: 'My Tasks' },
  { value: 'all', label: 'All Tasks' },
];

/** Midnight-truncated date helpers for client-side bucketing. */
function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dueBucket(task: SalesTask): 'overdue' | 'today' | 'upcoming' | 'none' {
  if (!task.dueDate) return 'none';
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  const today = startOfToday();
  if (due.getTime() < today) return 'overdue';
  if (due.getTime() === today) return 'today';
  return 'upcoming';
}

interface StatChip {
  key: string;
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: string;
}

function SalesTasksPageInner() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();

  const canCreate = hasPermission('sales.create');
  const canEdit = hasPermission('sales.edit');
  const canDelete = hasPermission('sales.delete');

  const [tasks, setTasks] = useState<SalesTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState<StatusFilter>('all');
  const [type, setType] = useState<TypeFilter>('all');
  const [due, setDue] = useState<DueFilter>('all');
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [scope, setScope] = useState<ScopeFilter>('mine');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [blockTask, setBlockTask] = useState<SalesTask | null>(null);
  const [completeTask, setCompleteTask] = useState<SalesTask | null>(null);

  // SE-027 — collapsible recurring tasks section.
  const [showRecurring, setShowRecurring] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters: SalesTaskFilters = { scope };
      if (status !== 'all') filters.status = status;
      if (type !== 'all') filters.type = type;
      if (due !== 'all') filters.due = due;
      if (blockedOnly) filters.blocked = true;
      setTasks(await fetchSalesTasks(filters));
    } catch (error: any) {
      toast(error?.message || 'Failed to load tasks', 'error');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [scope, status, type, due, blockedOnly, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Summary chips computed from the current result set.
  const chips: StatChip[] = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let blocked = 0;
    let completed = 0;
    for (const t of tasks) {
      if (t.blocked) blocked += 1;
      if (t.status === 'completed') {
        completed += 1;
        continue;
      }
      const bucket = dueBucket(t);
      if (bucket === 'overdue') overdue += 1;
      else if (bucket === 'today') today += 1;
    }
    return [
      { key: 'today', label: 'Due Today', value: today, icon: CalendarClock, tone: 'text-amber-600 dark:text-amber-400' },
      { key: 'overdue', label: 'Overdue', value: overdue, icon: AlertTriangle, tone: 'text-rose-600 dark:text-rose-400' },
      { key: 'blocked', label: 'Blocked', value: blocked, icon: Ban, tone: 'text-red-600 dark:text-red-400' },
      { key: 'completed', label: 'Completed', value: completed, icon: CheckCircle2, tone: 'text-emerald-600 dark:text-emerald-400' },
    ];
  }, [tasks]);

  // Grouped sections.
  const groups = useMemo(() => {
    const overdue: SalesTask[] = [];
    const today: SalesTask[] = [];
    const upcoming: SalesTask[] = [];
    const completed: SalesTask[] = [];
    for (const t of tasks) {
      if (t.status === 'completed') {
        completed.push(t);
        continue;
      }
      const bucket = dueBucket(t);
      if (bucket === 'overdue') overdue.push(t);
      else if (bucket === 'today') today.push(t);
      else upcoming.push(t); // includes "none" (no due date)
    }
    return { overdue, today, upcoming, completed };
  }, [tasks]);

  const handleToggleStatus = async (task: SalesTask) => {
    const nextStatus: SalesTaskStatus = task.status === 'completed' ? 'open' : 'completed';
    try {
      await updateSalesTask(task.id, { status: nextStatus });
      toast(nextStatus === 'completed' ? 'Task completed' : 'Task reopened', 'success');
      await load();
    } catch (error: any) {
      toast(error?.message || 'Failed to update task', 'error');
    }
  };

  const handleDelete = async (task: SalesTask) => {
    const ok = await confirm({
      title: 'Delete task',
      message: `Delete “${task.title}”? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      intent: 'danger',
    });
    if (!ok) return;
    try {
      await deleteSalesTask(task.id);
      toast('Task deleted', 'success');
      await load();
    } catch (error: any) {
      toast(error?.message || 'Failed to delete task', 'error');
    }
  };

  const hasAnyTasks = tasks.length > 0;

  const sections: { key: string; title: string; tone: string; items: SalesTask[] }[] = [
    { key: 'overdue', title: 'Overdue', tone: 'text-rose-600 dark:text-rose-400', items: groups.overdue },
    { key: 'today', title: 'Due Today', tone: 'text-amber-600 dark:text-amber-400', items: groups.today },
    { key: 'upcoming', title: 'Upcoming', tone: 'text-blue-600 dark:text-blue-400', items: groups.upcoming },
    { key: 'completed', title: 'Completed', tone: 'text-emerald-600 dark:text-emerald-400', items: groups.completed },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales' },
              { label: 'Tasks', href: '/dashboard/sales/tasks' },
            ]}
          />
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Sales Tasks</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track calls, meetings, follow-ups and proposal reviews across your leads and deals.
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={18} /> New Task
          </Button>
        )}
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {chips.map((chip) => {
          const Icon = chip.icon;
          return (
            <Card
              key={chip.key}
              className="flex items-center gap-3 border border-gray-200 px-4 py-3 dark:border-gray-700"
            >
              <span className={classNames('flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-700/40', chip.tone)}>
                <Icon size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-tight text-gray-900 dark:text-gray-100">{chip.value}</p>
                <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">{chip.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filter bar */}
      <Card className="border border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <Filter size={15} className="text-gray-400" /> Filters
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            id="filter-scope"
            label="Scope"
            options={SCOPE_OPTIONS}
            value={scope}
            onChange={(v) => setScope(v as ScopeFilter)}
          />
          <SelectField
            id="filter-status"
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(v) => setStatus(v as StatusFilter)}
          />
          <SelectField
            id="filter-type"
            label="Type"
            options={TYPE_OPTIONS}
            value={type}
            onChange={(v) => setType(v as TypeFilter)}
          />
          <SelectField
            id="filter-due"
            label="Due"
            options={DUE_OPTIONS}
            value={due}
            onChange={(v) => setDue(v as DueFilter)}
          />
        </div>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={blockedOnly}
            onChange={(e) => setBlockedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <span className="inline-flex items-center gap-1">
            <Ban size={14} className="text-red-500" /> Blocked tasks only
          </span>
        </label>
      </Card>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !hasAnyTasks ? (
        <EmptyState
          icon={<CheckSquare size={32} />}
          title="No tasks found"
          description="No sales tasks match your filters yet. Create one to start tracking your work."
          actionLabel={canCreate ? 'New Task' : undefined}
          onAction={canCreate ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-6">
          {sections.map((section) =>
            section.items.length === 0 ? null : (
              <div key={section.key}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className={classNames('text-sm font-bold uppercase tracking-wide', section.tone)}>
                    {section.title}
                  </h2>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {section.items.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {section.items.map((task) => (
                    <SalesTaskCard
                      key={task.id}
                      task={task}
                      onToggleStatus={handleToggleStatus}
                      onComplete={(t) => setCompleteTask(t)}
                      onBlock={(t) => setBlockTask(t)}
                      onDelete={handleDelete}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* SE-027 — Recurring tasks (collapsible) */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setShowRecurring((v) => !v)}
          aria-expanded={showRecurring}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300">
              <Repeat size={15} />
            </span>
            Recurring Tasks
          </span>
          <ChevronDown
            size={18}
            className={classNames(
              'shrink-0 text-gray-400 transition-transform duration-200',
              showRecurring && 'rotate-180'
            )}
          />
        </button>
        {showRecurring && (
          <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-700">
            <RecurringTasksList />
          </div>
        )}
      </Card>

      {/* Modals */}
      <CreateSalesTaskModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
      <BlockTaskModal
        isOpen={blockTask !== null}
        onClose={() => setBlockTask(null)}
        task={blockTask}
        onDone={load}
      />
      <CompleteTaskModal
        isOpen={completeTask !== null}
        onClose={() => setCompleteTask(null)}
        task={completeTask}
        onDone={load}
      />
    </div>
  );
}

export default function SalesTasksPage() {
  return (
    <PermissionPageGuard module="sales">
      <SalesTasksPageInner />
    </PermissionPageGuard>
  );
}
