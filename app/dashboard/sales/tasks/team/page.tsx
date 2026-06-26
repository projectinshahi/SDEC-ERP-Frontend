'use client';

/**
 * SE-028.1 — Manager Team Task view.
 *
 * A manager-facing dashboard rolling up the team's sales tasks: headline KPIs,
 * a member/status/priority filter bar, a per-member completion breakdown and a
 * highlighted task list (overdue + blocked tasks stand out). Results are scoped
 * to the manager's team server-side; admins see everything.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Filter, Users, ListTodo } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { SelectField } from '@/components/ui/SelectField';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { TeamKpiCards } from '@/components/sales-execution/team/TeamKpiCards';
import { MemberBreakdownTable } from '@/components/sales-execution/team/MemberBreakdownTable';
import { TeamBreakdownTable } from '@/components/sales-execution/team/TeamBreakdownTable';
import { TeamTaskRow } from '@/components/sales-execution/team/TeamTaskRow';
import { CompleteTaskModal } from '@/components/sales-execution/CompleteTaskModal';
import { useToast } from '@/lib/hooks/useToast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { fetchTeamTasks, updateSalesTask } from '@/lib/api/salesTasks';
import { fetchAssignableUsers } from '@/lib/api/leads';
import type { SalesTask, SalesTaskStatus, TeamTasksResponse } from '@/lib/types/salesExecution';
import type { AssignableUser } from '@/lib/types/lead';

// Priority weight for sorting (urgent first).
const PRIORITY_WEIGHT: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
// Status weight so active work sorts above completed.
const STATUS_WEIGHT: Record<string, number> = { in_progress: 3, open: 2, completed: 1 };

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const DUE_OPTIONS = [
  { value: 'all', label: 'Any Due Date' },
  { value: 'today', label: 'Due Today' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'upcoming', label: 'Upcoming' },
];

const SORT_OPTIONS = [
  { value: 'due_asc', label: 'Due Date (soonest)' },
  { value: 'due_desc', label: 'Due Date (latest)' },
  { value: 'priority', label: 'Priority (high → low)' },
  { value: 'status', label: 'Status (active first)' },
  { value: 'updated', label: 'Last Updated' },
  { value: 'created', label: 'Recently Created' },
  { value: 'assignee', label: 'Assignee (A → Z)' },
];

function TeamTasksPageInner() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  // Team Lead / Manager status editing from Team Tasks (single source of truth).
  const canEdit = hasPermission('sales.edit');

  const [data, setData] = useState<TeamTasksResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<AssignableUser[]>([]);
  const [completeTask, setCompleteTask] = useState<SalesTask | null>(null);

  // Filters
  const [userId, setUserId] = useState('all');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [teamId, setTeamId] = useState('all');
  const [due, setDue] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('due_asc');

  // Member options for the filter (all + assignable users).
  const memberOptions = useMemo(
    () => [
      { value: 'all', label: 'All Members' },
      ...members.map((m) => ({ value: String(m.id), label: m.name })),
    ],
    [members]
  );

  // Team options come live from the response (the teams the user can see).
  const teamOptions = useMemo(
    () => [
      { value: 'all', label: 'All Teams' },
      ...(data?.teams ?? []).map((t) => ({ value: String(t.id), label: t.name })),
    ],
    [data?.teams]
  );

  // Load the assignable-user list once for the member filter.
  useEffect(() => {
    let active = true;
    fetchAssignableUsers()
      .then((users) => {
        if (active) setMembers(users);
      })
      .catch(() => {
        // Non-fatal: the member filter just falls back to "All Members".
        if (active) setMembers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters: { userId?: number; status?: string; priority?: string; teamId?: number; due?: string } = {};
      if (userId !== 'all') filters.userId = Number(userId);
      if (status !== 'all') filters.status = status;
      if (priority !== 'all') filters.priority = priority;
      if (teamId !== 'all') filters.teamId = Number(teamId);
      if (due !== 'all') filters.due = due;
      setData(await fetchTeamTasks(filters));
    } catch (error: any) {
      toast(error?.message || 'Failed to load team tasks', 'error');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, status, priority, teamId, due, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Move a task to open/in_progress directly. Completing routes through the
  // outcome modal (CompleteTaskModal) instead — handled by setCompleteTask.
  const handleSetStatus = useCallback(
    async (task: SalesTask, next: SalesTaskStatus) => {
      try {
        await updateSalesTask(task.id, { status: next });
        toast(next === 'in_progress' ? 'Task moved to In Progress' : 'Task reopened', 'success');
        await load();
      } catch (error: any) {
        toast(error?.message || 'Failed to update task', 'error');
      }
    },
    [load, toast],
  );

  // Client-side title/assignee search + sort over the live team task list
  // (instant; the KPI cards still reflect the full team scope from the backend).
  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = data?.tasks ?? [];
    if (q) {
      list = list.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.assignee?.name || '').toLowerCase().includes(q),
      );
    }
    const time = (v?: string | null) => (v ? new Date(v).getTime() : 0);
    const dueTime = (v?: string | null) => (v ? new Date(v).getTime() : Number.POSITIVE_INFINITY);
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'due_desc':
          return time(b.dueDate) - time(a.dueDate);
        case 'priority':
          return (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0);
        case 'status':
          return (STATUS_WEIGHT[b.status] ?? 0) - (STATUS_WEIGHT[a.status] ?? 0);
        case 'updated':
          return time(b.updatedAt) - time(a.updatedAt);
        case 'created':
          return time(b.createdAt) - time(a.createdAt);
        case 'assignee':
          return (a.assignee?.name || '').localeCompare(b.assignee?.name || '');
        case 'due_asc':
        default:
          return dueTime(a.dueDate) - dueTime(b.dueDate);
      }
    });
    return sorted;
  }, [data?.tasks, search, sort]);

  const hasData =
    !!data && (data.kpis.total > 0 || data.members.length > 0 || data.tasks.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Sales', href: '/dashboard/sales' },
            { label: 'Tasks', href: '/dashboard/sales/tasks' },
            { label: 'Team', href: '/dashboard/sales/tasks/team' },
          ]}
        />
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Team Tasks</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor your team&apos;s sales tasks, completion rates and any overdue or blocked work.
        </p>
      </div>

      {/* Filter bar */}
      <Card variant="outlined" className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <Filter size={15} className="text-gray-400" /> Filters
        </div>
        <div className="mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by title or member…"
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <SelectField
            id="filter-team"
            label="Team"
            options={teamOptions}
            value={teamId}
            onChange={setTeamId}
          />
          <SelectField
            id="filter-member"
            label="Member"
            options={memberOptions}
            value={userId}
            onChange={setUserId}
          />
          <SelectField
            id="filter-status"
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
          />
          <SelectField
            id="filter-priority"
            label="Priority"
            options={PRIORITY_OPTIONS}
            value={priority}
            onChange={setPriority}
          />
          <SelectField
            id="filter-due"
            label="Due Date"
            options={DUE_OPTIONS}
            value={due}
            onChange={setDue}
          />
          <SelectField
            id="filter-sort"
            label="Sort By"
            options={SORT_OPTIONS}
            value={sort}
            onChange={setSort}
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : !hasData ? (
        <EmptyState
          icon={<Users size={32} />}
          title="No team tasks yet"
          description="You don't have any team members with sales tasks for these filters yet. Tasks assigned to your team will appear here."
        />
      ) : (
        <div className="space-y-6">
          {/* KPI cards */}
          <TeamKpiCards kpis={data.kpis} />

          {/* Breakdown — team-wise when "All Teams" is selected, otherwise the
              selected team's members. Title switches inside each component. */}
          {teamId === 'all'
            ? data.teamBreakdown.length > 0 && <TeamBreakdownTable teams={data.teamBreakdown} />
            : data.members.length > 0 && <MemberBreakdownTable members={data.members} />}

          {/* Task list */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <ListTodo size={16} className="text-gray-400" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Tasks</h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {visibleTasks.length}
              </span>
            </div>
            {visibleTasks.length === 0 ? (
              <EmptyState
                icon={<ListTodo size={32} />}
                title="No tasks match these filters"
                description="Adjust the team, member, status, priority, due date or search filters to see your team's tasks."
              />
            ) : (
              <div className="space-y-2.5">
                {visibleTasks.map((task) => (
                  <TeamTaskRow
                    key={task.id}
                    task={task}
                    canEdit={canEdit}
                    onSetStatus={handleSetStatus}
                    onComplete={(t) => setCompleteTask(t)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Outcome-capture completion (shared with Sales Tasks) — same record, so
          completing here reflects in Sales Tasks on the next refresh. */}
      <CompleteTaskModal
        isOpen={completeTask !== null}
        onClose={() => setCompleteTask(null)}
        task={completeTask}
        onDone={load}
      />
    </div>
  );
}

export default function TeamTasksPage() {
  return (
    <PermissionPageGuard module="sales">
      <TeamTasksPageInner />
    </PermissionPageGuard>
  );
}
