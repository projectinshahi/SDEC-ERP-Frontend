'use client';

/**
 * Executive Analytics Dashboard.
 *
 * Headline revenue / pipeline / forecast / win-rate / conversion KPIs, a
 * forecasting panel (month / quarter / year), and rankings of top BDEs and
 * top lead sources. Director / Admin / Manager only — the backend 403s others.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  IndianRupee,
  Layers,
  LineChart,
  Trophy,
  Target as TargetIcon,
  Percent,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Radar,
  Scale,
  ShieldOff,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchExecutiveReport, exportReport } from '@/lib/api/salesReports';
import { isApiError } from '@/lib/api-errors';
import type { ExecutiveAnalytics } from '@/lib/types/salesReports';
import {
  formatINR,
  formatPeriod,
  KpiCard,
  SectionHeader,
  ExportToolbar,
} from '@/components/sales-reports-exec/reportShared';

const BDE_BAR_HEX = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

function pct(n: number | null | undefined): string {
  if (n == null) return 'N/A';
  return `${Math.round(n)}%`;
}

export default function ExecutiveAnalyticsPage() {
  const { toast } = useToast();

  const [data, setData] = useState<ExecutiveAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        setForbidden(false);
        setData(await fetchExecutiveReport());
      } catch (err) {
        if (isApiError(err) && err.statusCode === 403) {
          setForbidden(true);
        } else {
          toast('Failed to load executive analytics', 'error');
        }
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

  const topBdes = data?.rankings.topBdes ?? [];
  const topSources = data?.rankings.topSources ?? [];
  const bdeChart = topBdes.map((b) => ({ name: b.name, revenue: b.revenue }));

  return (
    <PermissionPageGuard requireAny={['sales.reports.view', 'sales.team.manage', 'sales.targets.manage', 'sales.assign']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Executive Analytics</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Company-wide sales analytics{data ? ` · ${formatPeriod(data.period)}` : ''}
            </p>
          </div>
          {!forbidden && (
            <div className="flex flex-wrap items-center gap-2">
              <ExportToolbar type="executive" onExport={(t, f) => exportReport(t, f)} />
              <Button variant="secondary" size="sm" onClick={() => load(true)} disabled={isLoading || isRefreshing} className="print:hidden">
                <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : forbidden ? (
          <EmptyState
            icon={<ShieldOff size={32} />}
            title="Access restricted"
            description="Executive analytics are available to Directors, Admins and Managers only."
          />
        ) : !data ? null : (
          <>
            {/* Headline KPI cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                label="Revenue Won (Period)"
                value={formatINR(data.revenue.wonThisPeriod)}
                icon={IndianRupee}
                tone="emerald"
              />
              <KpiCard label="Active Pipeline" value={formatINR(data.revenue.pipelineValue)} icon={Layers} tone="blue" />
              <KpiCard label="Weighted Forecast" value={formatINR(data.revenue.forecast)} icon={LineChart} tone="violet" />
              <KpiCard
                label="Win Rate"
                value={pct(data.rates.winRate)}
                icon={TargetIcon}
                tone="indigo"
              />
              <KpiCard label="Conversion Rate" value={pct(data.rates.conversionRate)} icon={Percent} tone="amber" />
            </div>

            {/* Extra conversion KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <KpiCard
                label="Deal Conversion Rate"
                value={pct(data.rates.dealConversionRate)}
                icon={TargetIcon}
                tone="blue"
              />
              <KpiCard
                label="Project Conversion Rate"
                value={pct(data.rates.projectConversionRate)}
                icon={Percent}
                tone="emerald"
              />
            </div>

            {/* Forecasting panel */}
            <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <SectionHeader icon={Radar} title="Forecasting" tone="violet" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ForecastWidget label="Current Month" value={data.forecasting.month} icon={CalendarDays} tone="indigo" />
                <ForecastWidget label="Current Quarter" value={data.forecasting.quarter} icon={CalendarRange} tone="blue" />
                <ForecastWidget label="Current Year" value={data.forecasting.year} icon={CalendarClock} tone="emerald" />
              </div>
            </Card>

            {/* Forecast vs Actual */}
            <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <SectionHeader icon={Scale} title="Forecast vs Actual" tone="indigo" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Forecast</p>
                  <p className="mt-2 text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                    {formatINR(data.forecastVsActual.forecast)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Actual</p>
                  <p className="mt-2 text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                    {formatINR(data.forecastVsActual.actual)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Variance</p>
                  <p
                    className={`mt-2 text-xl font-bold tabular-nums ${
                      data.forecastVsActual.variance < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {formatINR(data.forecastVsActual.variance)}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span>Achievement</span>
                  <span className="tabular-nums text-gray-900 dark:text-white">
                    {pct(data.forecastVsActual.achievementPct)}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, Math.round(data.forecastVsActual.achievementPct || 0)))}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Rankings */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Top BDEs */}
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <SectionHeader icon={Trophy} title="Top BDEs" tone="emerald" />
                {topBdes.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">No BDE revenue to rank yet.</p>
                ) : (
                  <ol className="space-y-3">
                    {topBdes.map((b, i) => (
                      <li key={b.ownerId} className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold tabular-nums text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{b.name}</p>
                            <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                              {formatINR(b.revenue)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                            {b.wonCount} deal{b.wonCount === 1 ? '' : 's'} won
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>

              {/* Top Lead Sources */}
              <Card className="p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-6 pt-6">
                  <SectionHeader icon={Layers} title="Top Lead Sources" tone="blue" />
                </div>
                {topSources.length === 0 ? (
                  <p className="px-6 pb-6 text-sm text-gray-400 dark:text-gray-500">No lead source data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-y border-gray-100 bg-gray-50/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                          <th className="px-6 py-3">Source</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-right">Qualified</th>
                          <th className="px-4 py-3 text-right">Converted</th>
                          <th className="px-6 py-3 text-right">Conv. %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {topSources.map((s) => (
                          <tr key={s.source} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                            <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{s.source}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{s.total}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{s.qualified}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{s.converted}</td>
                            <td className="px-6 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                              {Math.round(s.conversionRate || 0)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            {/* Top BDE revenue chart */}
            {bdeChart.length > 0 && (
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <SectionHeader icon={IndianRupee} title="Top BDE Revenue" tone="emerald" />
                <ResponsiveContainer width="100%" height={Math.max(200, bdeChart.length * 28 + 48)}>
                  <BarChart data={bdeChart} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      stroke="#9ca3af"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={bdeChart.length > 6 ? -25 : 0}
                      textAnchor={bdeChart.length > 6 ? 'end' : 'middle'}
                      height={bdeChart.length > 6 ? 48 : 24}
                    />
                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={56} />
                    <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} formatter={(v) => [formatINR(Number(v)), 'Revenue']} />
                    <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {bdeChart.map((d, i) => (
                        <Cell key={d.name} fill={BDE_BAR_HEX[i % BDE_BAR_HEX.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </>
        )}
      </div>
    </PermissionPageGuard>
  );
}

function ForecastWidget({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: 'indigo' | 'blue' | 'emerald';
}) {
  const toneChip: Record<typeof tone, string> = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
  };
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/30">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneChip[tone]}`}>
          <Icon size={18} />
        </span>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <p className="mt-3 text-xl font-bold tabular-nums text-gray-900 dark:text-white">{formatINR(value)}</p>
      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Projected revenue</p>
    </div>
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
      <Skeleton className="h-44 rounded-2xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
