'use client';

/**
 * SE-044.2 — Team Target Dashboard.
 *
 * Red / Yellow / Green target attainment for teams and BDEs, a cross-team
 * leaderboard with an attainment-% bar chart coloured by band, and Top /
 * Bottom team highlights. Managers see their team; Director / Admin see all
 * (the backend scopes the data).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Target as TargetIcon,
  Users,
  UserRound,
  Trophy,
  TrendingDown,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchTeamTargetReport, exportReport } from '@/lib/api/salesReports';
import type {
  TeamTargetDashboard,
  TeamTargetRow,
  TargetBand,
} from '@/lib/types/salesReports';
import {
  formatINR,
  formatPeriod,
  StatusBadge,
  BandBar,
  BAND_LABEL,
  BAND_DOT,
  BAND_HEX,
  KpiCard,
  SectionHeader,
  ExportToolbar,
} from '@/components/sales-reports-exec/reportShared';

const BAND_ORDER: TargetBand[] = ['green', 'yellow', 'red', 'neutral'];

export default function TeamTargetDashboardPage() {
  const { toast } = useToast();

  const [data, setData] = useState<TeamTargetDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        setData(await fetchTeamTargetReport());
      } catch {
        toast('Failed to load team target dashboard', 'error');
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

  const teams = data?.teams ?? [];
  const bdes = data?.bdes ?? [];
  const chartData = teams.map((t) => ({
    name: t.name,
    pct: Math.round(t.achievementPct || 0),
    status: t.status,
  }));

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Target Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              R / Y / G target attainment{data ? ` · ${formatPeriod(data.period)}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportToolbar type="team-target" onExport={(t, f) => exportReport(t, f)} />
            <Button variant="secondary" size="sm" onClick={() => load(true)} disabled={isLoading || isRefreshing} className="print:hidden">
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : !data ? null : (
          <>
            {/* Band legend */}
            <Card className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {BAND_ORDER.map((band) => (
                  <div key={band} className="flex items-start gap-2.5">
                    <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${BAND_DOT[band]}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{BAND_LABEL[band]}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{data.bands[band]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {teams.length === 0 ? (
              <EmptyState
                icon={<TargetIcon size={32} />}
                title="No teams with targets yet"
                description="Assign targets to your sales teams to track R / Y / G attainment."
              />
            ) : (
              <>
                {/* Team View */}
                <Card className="p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-6 pt-6">
                    <SectionHeader icon={Users} title="Team View" tone="indigo" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-y border-gray-100 bg-gray-50/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                          <th className="px-6 py-3">Team</th>
                          <th className="px-4 py-3 text-right">Target</th>
                          <th className="px-4 py-3 text-right">Achievement</th>
                          <th className="px-4 py-3 min-w-[180px]">Achievement %</th>
                          <th className="px-6 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {teams.map((t) => (
                          <tr key={t.teamId} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                            <td className="px-6 py-3">
                              <p className="font-medium text-gray-900 dark:text-white">{t.name}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                {t.manager || 'No manager'} · {t.memberCount} member{t.memberCount === 1 ? '' : 's'}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                              {formatINR(t.target)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                              {formatINR(t.achieved)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                                  {Math.round(t.achievementPct || 0)}%
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {formatINR(t.remaining)} left
                                </span>
                              </div>
                              <BandBar pct={t.achievementPct} status={t.status} className="mt-1.5" />
                            </td>
                            <td className="px-6 py-3">
                              <StatusBadge status={t.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* BDE View */}
                <Card className="p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-6 pt-6">
                    <SectionHeader icon={UserRound} title="BDE View" tone="blue" />
                  </div>
                  {bdes.length === 0 ? (
                    <p className="px-6 pb-6 text-sm text-gray-400 dark:text-gray-500">No BDE target data available.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-y border-gray-100 bg-gray-50/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                            <th className="px-6 py-3">BDE</th>
                            <th className="px-4 py-3 text-right">Target</th>
                            <th className="px-4 py-3 text-right">Achievement</th>
                            <th className="px-4 py-3 text-right">Remaining</th>
                            <th className="px-6 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {bdes.map((b) => (
                            <tr key={b.ownerId} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                              <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{b.name}</td>
                              <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                                {formatINR(b.target)}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                                {formatINR(b.achieved)}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                                {formatINR(b.remaining)}
                              </td>
                              <td className="px-6 py-3">
                                <StatusBadge status={b.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                {/* Cross-Team Comparison */}
                <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                  <SectionHeader icon={BarChart3} title="Cross-Team Comparison" tone="violet" />
                  {/* Ranked leaderboard (order as returned) */}
                  <ol className="space-y-2.5">
                    {teams.map((t, i) => (
                      <li key={t.teamId} className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold tabular-nums text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{t.name}</p>
                            <span className="flex items-center gap-2">
                              <span className="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-200">
                                {Math.round(t.achievementPct || 0)}%
                              </span>
                              <StatusBadge status={t.status} />
                            </span>
                          </div>
                          <BandBar pct={t.achievementPct} status={t.status} className="mt-1.5" />
                        </div>
                      </li>
                    ))}
                  </ol>

                  {/* Attainment % bar chart coloured by band */}
                  <div className="mt-6">
                    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 28 + 48)}>
                      <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                        <XAxis
                          dataKey="name"
                          stroke="#9ca3af"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          angle={chartData.length > 6 ? -25 : 0}
                          textAnchor={chartData.length > 6 ? 'end' : 'middle'}
                          height={chartData.length > 6 ? 48 : 24}
                        />
                        <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={36} unit="%" />
                        <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} formatter={(v) => [`${v}%`, 'Attainment']} />
                        <ReferenceLine y={100} stroke="#10b981" strokeDasharray="4 4" />
                        <Bar dataKey="pct" name="Attainment" radius={[6, 6, 0, 0]} maxBarSize={48}>
                          {chartData.map((d) => (
                            <Cell key={d.name} fill={BAND_HEX[d.status]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Top / Bottom teams */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                    <SectionHeader icon={Trophy} title="Top Teams" tone="emerald" />
                    <RankedTeams entries={data.rankings.topTeams} emptyText="No teams to rank yet." />
                  </Card>
                  <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                    <SectionHeader icon={TrendingDown} title="Bottom Teams" tone="rose" />
                    <RankedTeams entries={data.rankings.bottomTeams} emptyText="No teams to rank yet." />
                  </Card>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </PermissionPageGuard>
  );
}

function RankedTeams({ entries, emptyText }: { entries: TeamTargetRow[]; emptyText: string }) {
  if (!entries.length) {
    return <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">{emptyText}</p>;
  }
  return (
    <ol className="space-y-3">
      {entries.map((t, i) => (
        <li key={t.teamId} className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold tabular-nums text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{t.name}</p>
              <StatusBadge status={t.status} />
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
              {formatINR(t.achieved)} / {formatINR(t.target)} · {Math.round(t.achievementPct || 0)}%
            </p>
            <BandBar pct={t.achievementPct} status={t.status} className="mt-1.5" />
          </div>
        </li>
      ))}
    </ol>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
