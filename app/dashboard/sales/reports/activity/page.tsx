'use client';

/**
 * SE-038.1 — Activity Report.
 *
 * Universal date-range filter (SE-039.1) at the top, headline activity totals
 * + productivity-rate tiles, a per-BDE activity table and a bar chart of total
 * activities per BDE. Excel / CSV / Print(PDF) export. Loading → Skeleton,
 * empty → EmptyState.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  RefreshCw,
  Activity,
  Phone,
  Users,
  Mail,
  Bell,
  CheckSquare,
  Gauge,
  CalendarClock,
  BarChart3,
} from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchActivityReport, type ReportWindow } from '@/lib/api/salesReports';
import type { ActivityReport } from '@/lib/types/salesReports';
import { KpiCard, SectionHeader } from '@/components/sales-execution/performance/perfShared';
import {
  DateRangeSelector,
  defaultRangeWindow,
} from '@/components/sales-reports/DateRangeSelector';
import { ExportBar } from '@/components/sales-reports/reportShared';

const ACTIVITY_COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#f43f5e'];

const fmt = (n: number | null | undefined) => (n || 0).toLocaleString('en-IN');
const fmtDec = (n: number | null | undefined) =>
  (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 });

export default function ActivityReportPage() {
  const { toast } = useToast();
  const [reportWindow, setReportWindow] = useState<ReportWindow>(defaultRangeWindow);

  const [data, setData] = useState<ActivityReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        setData(await fetchActivityReport(reportWindow));
      } catch {
        toast('Failed to load activity report', 'error');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [reportWindow, toast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const hasData =
    !!data && (data.totals.totalActivities > 0 || data.byOwner.length > 0);

  const chartData = (data?.byOwner ?? []).map((o) => ({ name: o.name, total: o.total || 0 }));

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 print:block">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Report</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Sales activity volume & productivity rates across the team.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <DateRangeSelector value={reportWindow} onChange={setReportWindow} />
            <div className="flex items-center gap-2">
              <ExportBar
                type="activity"
                reportWindow={reportWindow}
                onError={(m) => toast(m, 'error')}
                disabled={isLoading || !hasData}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => load(true)}
                disabled={isLoading || isRefreshing}
                className="print:hidden"
              >
                <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <ActivitySkeleton />
        ) : !hasData ? (
          <EmptyState
            icon={<Activity size={32} />}
            title="No activity in this period"
            description="Once the team logs calls, meetings, emails and follow-ups, they will appear here."
          />
        ) : (
          <div className="space-y-6">
            {/* Activity totals */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KpiCard label="Calls" value={fmt(data!.totals.calls)} icon={Phone} tone="indigo" />
              <KpiCard label="Meetings" value={fmt(data!.totals.meetings)} icon={Users} tone="blue" />
              <KpiCard label="Emails" value={fmt(data!.totals.emails)} icon={Mail} tone="violet" />
              <KpiCard label="Follow-ups" value={fmt(data!.totals.followUps)} icon={Bell} tone="amber" />
              <KpiCard label="Tasks" value={fmt(data!.totals.tasks)} icon={CheckSquare} tone="rose" />
              <KpiCard
                label="Total Activities"
                value={fmt(data!.totals.totalActivities)}
                icon={Activity}
                tone="emerald"
              />
            </div>

            {/* Productivity rates */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard
                label="Activities / Day"
                value={fmtDec(data!.rates.activitiesPerDay)}
                sub={data!.range ? `Over ${data!.range.days} day${data!.range.days === 1 ? '' : 's'}` : undefined}
                icon={Gauge}
                tone="blue"
              />
              <KpiCard
                label="Calls / Day"
                value={fmtDec(data!.rates.callsPerDay)}
                icon={Phone}
                tone="indigo"
              />
              <KpiCard
                label="Meetings / Week"
                value={fmtDec(data!.rates.meetingsPerWeek)}
                icon={CalendarClock}
                tone="violet"
              />
            </div>

            {/* Total activities per BDE */}
            <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <SectionHeader icon={BarChart3} title="Total Activities by BDE" tone="indigo" />
              {chartData.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No owner-level data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 46 + 50)}>
                  <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#9ca3af"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={chartData.length > 6 ? -25 : 0}
                      textAnchor={chartData.length > 6 ? 'end' : 'middle'}
                      height={chartData.length > 6 ? 56 : 28}
                    />
                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                      formatter={(value) => [fmt(Number(value)), 'Activities']}
                    />
                    <Bar dataKey="total" name="Activities" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {chartData.map((d, i) => (
                        <Cell key={d.name} fill={ACTIVITY_COLORS[i % ACTIVITY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Per-BDE table */}
            <Card className="p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-6 pt-6">
                <SectionHeader icon={Users} title="By BDE" tone="blue" />
              </div>
              {data!.byOwner.length === 0 ? (
                <p className="px-6 pb-8 pt-2 text-center text-sm text-gray-400">
                  No salespeople with activity in this period.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-y border-gray-100 bg-gray-50/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                        <th className="px-6 py-3">BDE</th>
                        <th className="px-4 py-3 text-right">Calls</th>
                        <th className="px-4 py-3 text-right">Meetings</th>
                        <th className="px-4 py-3 text-right">Emails</th>
                        <th className="px-4 py-3 text-right">Follow-ups</th>
                        <th className="px-4 py-3 text-right">Tasks</th>
                        <th className="px-6 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {data!.byOwner.map((o) => (
                        <tr key={o.ownerId} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                          <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{o.name}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{fmt(o.calls)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{fmt(o.meetings)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{fmt(o.emails)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{fmt(o.followUps)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{fmt(o.tasks)}</td>
                          <td className="px-6 py-3 text-right tabular-nums font-semibold text-gray-900 dark:text-white">{fmt(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </PermissionPageGuard>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
