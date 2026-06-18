'use client';

/**
 * SE-028 / SE-041 / SE-042 — Manager Dashboard.
 *
 * Team attainment, task completion and incentive run-rate KPIs, a full team
 * performance table and top/bottom performer leaderboards.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Target as TargetIcon,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Users,
  Trophy,
  TrendingDown,
  UsersRound,
} from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchManagerDashboard } from '@/lib/api/salesPerformance';
import type { ManagerDashboard, ManagerMemberRow } from '@/lib/types/salesExecution';
import {
  KpiCard,
  SectionHeader,
  AttainmentBadge,
  AttainmentBar,
  formatINR,
  formatPeriod,
} from '@/components/sales-execution/performance/perfShared';
import { RankedList, type RankedEntry } from '@/components/sales-execution/performance/RankedList';
import { AttainmentChart } from '@/components/sales-execution/performance/AttainmentChart';

function toRanked(rows: ManagerMemberRow[]): RankedEntry[] {
  return rows.map((m) => ({ id: m.userId, name: m.name, sub: formatINR(m.achieved), pct: m.achievementPct }));
}

export default function ManagerDashboardPage() {
  const { toast } = useToast();

  const [data, setData] = useState<ManagerDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        setData(await fetchManagerDashboard());
      } catch {
        toast('Failed to load manager dashboard', 'error');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const kpis = data?.kpis;

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manager Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Team sales performance{data ? ` · ${formatPeriod(data.period)}` : ''}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => load(true)} disabled={isLoading || isRefreshing}>
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : !data ? null : kpis && kpis.memberCount === 0 ? (
          <EmptyState
            icon={<UsersRound size={32} />}
            title="No team members yet"
            description="Assign a team to see performance."
          />
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                label="Team Attainment"
                value={`${Math.round(kpis!.attainmentPct || 0)}%`}
                sub={`${formatINR(kpis!.achieved)} / ${formatINR(kpis!.target)}`}
                icon={TargetIcon}
                tone="indigo"
              />
              <KpiCard
                label="Task Completion"
                value={`${Math.round(kpis!.taskCompletionRate || 0)}%`}
                sub={`${kpis!.completedTasks} / ${kpis!.totalTasks} tasks`}
                icon={CheckCircle2}
                tone="emerald"
              />
              <KpiCard label="Overdue Tasks" value={kpis!.overdueTasks} icon={AlertTriangle} tone="rose" />
              <KpiCard
                label="Incentive Run-rate"
                value={formatINR(kpis!.incentiveRunRate)}
                icon={Coins}
                tone="amber"
              />
              <KpiCard label="Team Members" value={kpis!.memberCount} icon={Users} tone="blue" />
            </div>

            {/* Team performance table */}
            <Card className="p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-6 pt-6">
                <SectionHeader icon={Users} title="Team Performance" tone="indigo" />
              </div>
              {data.members.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-gray-400 dark:text-gray-500">No member data available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-y border-gray-100 bg-gray-50/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                        <th className="px-6 py-3">Member</th>
                        <th className="px-4 py-3 text-right">Target</th>
                        <th className="px-4 py-3 text-right">Achieved</th>
                        <th className="px-4 py-3 min-w-[160px]">Achievement</th>
                        <th className="px-4 py-3 text-right">Won</th>
                        <th className="px-4 py-3 text-right">Task %</th>
                        <th className="px-4 py-3 text-right">Overdue</th>
                        <th className="px-6 py-3 text-right">Incentive</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {data.members.map((m) => (
                        <tr key={m.userId} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                          <td className="px-6 py-3">
                            <p className="font-medium text-gray-900 dark:text-white">{m.name}</p>
                            {m.email ? (
                              <p className="text-xs text-gray-400 dark:text-gray-500">{m.email}</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                            {formatINR(m.target)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                            {formatINR(m.achieved)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <AttainmentBadge pct={m.achievementPct} />
                            </div>
                            <AttainmentBar pct={m.achievementPct} className="mt-1.5" />
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                            {m.wonDeals}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                            {Math.round(m.completionRate || 0)}%
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className={m.overdueTasks > 0 ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-gray-600 dark:text-gray-300'}>
                              {m.overdueTasks}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-amber-600 dark:text-amber-400">
                            {formatINR(m.incentiveEarned)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Top / Bottom performers */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <SectionHeader icon={Trophy} title="Top Performers" tone="emerald" />
                <RankedList entries={toRanked(data.topPerformers)} emptyText="No performers to rank yet." />
              </Card>
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <SectionHeader icon={TrendingDown} title="Needs Attention" tone="rose" />
                <RankedList entries={toRanked(data.bottomPerformers)} emptyText="No performers to rank yet." />
              </Card>
            </div>

            {/* Attainment chart */}
            <AttainmentChart
              title="Member Attainment %"
              tone="indigo"
              data={data.members.map((m) => ({ name: m.name, pct: m.achievementPct }))}
            />
          </>
        )}
      </div>
    </PermissionPageGuard>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
