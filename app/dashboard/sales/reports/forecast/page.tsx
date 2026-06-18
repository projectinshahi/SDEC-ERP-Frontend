'use client';

/**
 * SE-037.1 — Revenue Forecast vs Actual.
 *
 * Universal date-range filter (SE-039.1) at the top, headline KPI tiles
 * (Forecast / Actual / Variance / Achievement %), a grouped Forecast-vs-Actual
 * bar chart per owner and a per-BDE breakdown table. Excel / CSV / Print(PDF)
 * export. Periods with no data render zeros (never errors). Loading → Skeleton.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  RefreshCw,
  TrendingUp,
  Target,
  Scale,
  Gauge,
  BarChart3,
  Users,
} from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchForecastVsActual, type ReportWindow } from '@/lib/api/salesReports';
import type { ForecastVsActual } from '@/lib/types/salesReports';
import {
  KpiCard,
  SectionHeader,
  AttainmentBadge,
  AttainmentBar,
  formatINR,
} from '@/components/sales-execution/performance/perfShared';
import {
  DateRangeSelector,
  defaultRangeWindow,
} from '@/components/sales-reports/DateRangeSelector';
import { ExportBar } from '@/components/sales-reports/reportShared';

export default function ForecastVsActualPage() {
  const { toast } = useToast();
  const [reportWindow, setReportWindow] = useState<ReportWindow>(defaultRangeWindow);

  const [data, setData] = useState<ForecastVsActual | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        setData(await fetchForecastVsActual(reportWindow));
      } catch {
        toast('Failed to load forecast vs actual', 'error');
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

  const chartData = (data?.byOwner ?? []).map((o) => ({
    name: o.name,
    Forecast: Math.round(o.forecast || 0),
    Actual: Math.round(o.actual || 0),
  }));

  const variance = data?.variance ?? 0;

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 print:block">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Revenue Forecast vs Actual
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Forecasted revenue measured against actual closed-won revenue.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <DateRangeSelector value={reportWindow} onChange={setReportWindow} />
            <div className="flex items-center gap-2">
              <ExportBar
                type="forecast"
                reportWindow={reportWindow}
                onError={(m) => toast(m, 'error')}
                disabled={isLoading}
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
          <ForecastSkeleton />
        ) : (
          <div className="space-y-6">
            {/* KPI tiles */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Forecast Revenue"
                value={formatINR(data?.forecast)}
                sub="Expected for the period"
                icon={Target}
                tone="violet"
              />
              <KpiCard
                label="Actual Revenue"
                value={formatINR(data?.actual)}
                sub="Closed-won in period"
                icon={TrendingUp}
                tone="emerald"
              />
              <KpiCard
                label="Variance"
                value={
                  <span className={variance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    {variance < 0 ? '-' : ''}
                    {formatINR(Math.abs(variance))}
                  </span>
                }
                sub={variance < 0 ? 'Below forecast' : 'At or above forecast'}
                icon={Scale}
                tone={variance < 0 ? 'rose' : 'emerald'}
              />
              <KpiCard
                label="Achievement"
                value={
                  <span className="flex flex-col gap-2">
                    <span>{Math.round(data?.achievementPct || 0)}%</span>
                    <AttainmentBar pct={data?.achievementPct || 0} />
                  </span>
                }
                sub="Actual ÷ forecast"
                icon={Gauge}
                tone="blue"
              />
            </div>

            {/* Forecast vs Actual per owner */}
            <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <SectionHeader icon={BarChart3} title="Forecast vs Actual by BDE" tone="indigo" />
              {chartData.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  No owner-level data for this period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 48 + 60)}>
                  <BarChart data={chartData} margin={{ top: 8, right: 16, left: -4, bottom: 0 }}>
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
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={64}
                      tickFormatter={(v) => formatINR(Number(v))}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                      formatter={(value, name) => [formatINR(Number(value)), name]}
                    />
                    <Legend />
                    <Bar dataKey="Forecast" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={42} />
                    <Bar dataKey="Actual" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Per-BDE table */}
            <Card className="p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-6 pt-6">
                <SectionHeader icon={Users} title="By BDE" tone="blue" />
              </div>
              {(data?.byOwner.length ?? 0) === 0 ? (
                <p className="px-6 pb-8 pt-2 text-center text-sm text-gray-400">
                  No salespeople with forecast or actuals in this period.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-y border-gray-100 bg-gray-50/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                        <th className="px-6 py-3">BDE</th>
                        <th className="px-4 py-3 text-right">Forecast</th>
                        <th className="px-4 py-3 text-right">Actual</th>
                        <th className="px-4 py-3 text-right">Variance</th>
                        <th className="px-6 py-3 text-right">Achievement %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {data!.byOwner.map((o) => (
                        <tr key={o.ownerId} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                          <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{o.name}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                            {formatINR(o.forecast)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-white">
                            {formatINR(o.actual)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right tabular-nums font-medium ${
                              (o.variance || 0) < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {(o.variance || 0) < 0 ? '-' : ''}
                            {formatINR(Math.abs(o.variance || 0))}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className="inline-flex justify-end">
                              <AttainmentBadge pct={o.achievementPct} />
                            </span>
                          </td>
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

function ForecastSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
