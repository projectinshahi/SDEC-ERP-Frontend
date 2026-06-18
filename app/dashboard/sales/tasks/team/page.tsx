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
import { TeamTaskRow } from '@/components/sales-execution/team/TeamTaskRow';
import { useToast } from '@/lib/hooks/useToast';
import { fetchTeamTasks } from '@/lib/api/salesTasks';
import { fetchAssignableUsers } from '@/lib/api/leads';
import type { TeamTasksResponse } from '@/lib/types/salesExecution';
import type { AssignableUser } from '@/lib/types/lead';

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

function TeamTasksPageInner() {
  const { toast } = useToast();

  const [data, setData] = useState<TeamTasksResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<AssignableUser[]>([]);

  // Filters
  const [userId, setUserId] = useState('all');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');

  // Member options for the filter (all + assignable users).
  const memberOptions = useMemo(
    () => [
      { value: 'all', label: 'All Members' },
      ...members.map((m) => ({ value: String(m.id), label: m.name })),
    ],
    [members]
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
      const filters: { userId?: number; status?: string; priority?: string } = {};
      if (userId !== 'all') filters.userId = Number(userId);
      if (status !== 'all') filters.status = status;
      if (priority !== 'all') filters.priority = priority;
      setData(await fetchTeamTasks(filters));
    } catch (error: any) {
      toast(error?.message || 'Failed to load team tasks', 'error');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, status, priority, toast]);

  useEffect(() => {
    load();
  }, [load]);

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

          {/* Member breakdown */}
          {data.members.length > 0 && <MemberBreakdownTable members={data.members} />}

          {/* Task list */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <ListTodo size={16} className="text-gray-400" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Tasks</h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {data.tasks.length}
              </span>
            </div>
            {data.tasks.length === 0 ? (
              <EmptyState
                icon={<ListTodo size={32} />}
                title="No tasks match these filters"
                description="Adjust the member, status or priority filters to see your team's tasks."
              />
            ) : (
              <div className="space-y-2.5">
                {data.tasks.map((task) => (
                  <TeamTaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
