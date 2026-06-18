'use client';

/**
 * Executive Dashboard — company-wide revenue, forecast and target attainment
 * with a team-vs-team leaderboard and top/bottom team highlights.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  IndianRupee,
  Layers,
  LineChart,
  Target as TargetIcon,
  Trophy,
  TrendingDown,
  Building2,
} from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchExecutiveDashboard } from '@/lib/api/salesPerformance';
import type { ExecutiveDashboard, ExecutiveTeamRow } from '@/lib/types/salesExecution';
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

function toRanked(rows: ExecutiveTeamRow[]): RankedEntry[] {
  return rows.map((t) => ({
    id: t.teamId,
    name: t.name,
    sub: `${formatINR(t.achieved)} · ${t.memberCount} member${t.memberCount === 1 ? '' : 's'}`,
    pct: t.attainmentPct,
  }));
}

export default function ExecutiveDashboardPage() {
  const { toast } = useToast();

  const [data, setData] = useState<ExecutiveDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        setData(await fetchExecutiveDashboard());
      } catch {
        toast('Failed to load executive dashboard', 'error');
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

  return (
    <PermissionPageGuard requireAny={['sales.assign', 'sales.team.manage', 'sales.targets.manage']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Executive Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Company sales performance{data ? ` · ${formatPeriod(data.period)}` : ''}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => load(true)} disabled={isLoading || isRefreshing}>
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : !data ? null : (
          <>
            {/* Headline KPI cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Revenue (Won This Month)"
                value={formatINR(data.revenue.wonThisMonth)}
                icon={IndianRupee}
                tone="emerald"
              />
              <KpiCard label="Pipeline Value" value={formatINR(data.revenue.pipelineValue)} icon={Layers} tone="blue" />
              <KpiCard label="Forecast" value={formatINR(data.revenue.forecast)} icon={LineChart} tone="violet" />
              <KpiCard
                label="Company Attainment"
                value={`${Math.round(data.target.attainmentPct || 0)}%`}
                sub={`${formatINR(data.target.achieved)} / ${formatINR(data.target.target)}`}
                icon={TargetIcon}
                tone="indigo"
              />
            </div>

            {/* Team leaderboard table */}
            <Card className="p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-6 pt-6">
                <SectionHeader icon={Building2} title="Team Leaderboard" tone="indigo" />
              </div>
              {data.teams.length === 0 ? (
                <div className="px-6 pb-6">
                  <EmptyState
                    icon={<Building2 size={32} />}
                    title="No teams configured yet"
                    description="Configure sales teams to see the leaderboard."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-y border-gray-100 bg-gray-50/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                        <th className="px-6 py-3 w-10">#</th>
                        <th className="px-4 py-3">Team</th>
                        <th className="px-4 py-3">Manager</th>
                        <th className="px-4 py-3 text-right">Members</th>
                        <th className="px-4 py-3 text-right">Target</th>
                        <th className="px-4 py-3 text-right">Achieved</th>
                        <th className="px-6 py-3 min-w-[180px]">Attainment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {data.teams.map((t, i) => (
                        <tr key={t.teamId} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                          <td className="px-6 py-3 tabular-nums text-gray-400 dark:text-gray-500">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t.name}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{t.manager || '—'}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                            {t.memberCount}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                            {formatINR(t.target)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                            {formatINR(t.achieved)}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <AttainmentBadge pct={t.attainmentPct} />
                            </div>
                            <AttainmentBar pct={t.attainmentPct} className="mt-1.5" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Top / Bottom teams */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <SectionHeader icon={Trophy} title="Top Teams" tone="emerald" />
                <RankedList entries={toRanked(data.topTeams)} emptyText="No teams to rank yet." />
              </Card>
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <SectionHeader icon={TrendingDown} title="Needs Attention" tone="rose" />
                <RankedList entries={toRanked(data.bottomTeams)} emptyText="No teams to rank yet." />
              </Card>
            </div>

            {/* Attainment chart */}
            <AttainmentChart
              title="Team Attainment %"
              tone="violet"
              data={data.teams.map((t) => ({ name: t.name, pct: t.attainmentPct }))}
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
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
