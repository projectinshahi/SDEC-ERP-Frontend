'use client';

/**
 * SE-034 — Pipeline Summary report.
 *
 * Enterprise-style pipeline analytics: headline KPI tiles, a "Deals by Stage"
 * funnel (rendered as a horizontal bar — recharts ^3 FunnelChart typing is
 * fussy here), and a per-salesperson breakdown table. Period filter + Excel /
 * CSV / Print(PDF) export. Loading → Skeleton, empty → EmptyState.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  RefreshCw,
  Layers,
  LineChart,
  CircleDot,
  Trophy,
  XCircle,
  IndianRupee,
  Filter,
  Users,
  BarChart3,
} from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchPipelineReport } from '@/lib/api/salesReports';
import type { PipelineSummary } from '@/lib/types/salesReports';
import { KpiCard, SectionHeader } from '@/components/sales-execution/performance/perfShared';
import {
  ExportBar,
  PeriodFilter,
  formatINR,
  useReportPeriod,
} from '@/components/sales-reports/reportShared';

const STAGE_COLORS = [
  '#6366f1',
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#84cc16',
  '#f59e0b',
  '#f97316',
  '#f43f5e',
];

export default function PipelineSummaryPage() {
  const { toast } = useToast();
  const { choice, setChoice, reportWindow, label } = useReportPeriod('month');

  const [data, setData] = useState<PipelineSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        setData(await fetchPipelineReport(reportWindow));
      } catch {
        toast('Failed to load pipeline summary', 'error');
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
    !!data &&
    (data.totals.total > 0 || data.byStage.length > 0 || data.byOwner.length > 0);

  const stageChart = (data?.byStage ?? [])
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((s) => ({
      stage: s.stage,
      count: s.count,
      value: s.value,
      weightedForecast: s.weightedForecast,
    }));

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 print:block">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline Summary</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Open pipeline, weighted forecast & deals by stage · {label}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <PeriodFilter value={choice} onChange={setChoice} disabled={isLoading} />
            <div className="flex items-center gap-2">
              <ExportBar
                type="pipeline"
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
          <PipelineSkeleton />
        ) : !hasData ? (
          <EmptyState
            icon={<Layers size={32} />}
            title="No pipeline data yet"
            description="Once deals are created for this period, the pipeline summary will appear here."
          />
        ) : (
          <div className="space-y-6">
            {/* KPI tiles */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <KpiCard
                label="Total Pipeline Value"
                value={formatINR(data!.revenue.pipelineValue)}
                sub={`${data!.totals.open} open deal${data!.totals.open === 1 ? '' : 's'}`}
                icon={Layers}
                tone="blue"
              />
              <KpiCard
                label="Weighted Forecast"
                value={formatINR(data!.revenue.forecastRevenue)}
                sub="Probability-weighted"
                icon={LineChart}
                tone="violet"
              />
              <KpiCard
                label="Open Deals"
                value={data!.totals.open}
                sub={`${data!.totals.total} total in scope`}
                icon={CircleDot}
                tone="indigo"
              />
              <KpiCard
                label="Won"
                value={data!.totals.won}
                sub={formatINR(data!.revenue.wonValue)}
                icon={Trophy}
                tone="emerald"
              />
              <KpiCard
                label="Lost"
                value={data!.totals.lost}
                sub={formatINR(data!.revenue.lostValue)}
                icon={XCircle}
                tone="rose"
              />
              <KpiCard
                label="Avg Deal Value"
                value={formatINR(data!.revenue.avgDealValue)}
                sub="Across deals in scope"
                icon={IndianRupee}
                tone="amber"
              />
            </div>

            {/* Deals by stage — funnel as horizontal bars */}
            <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <SectionHeader icon={BarChart3} title="Deals by Stage" tone="indigo" />
              {stageChart.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No stage data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, stageChart.length * 46 + 40)}>
                  <BarChart
                    layout="vertical"
                    data={stageChart}
                    margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                  >
                    <XAxis type="number" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="stage"
                      stroke="#9ca3af"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={130}
                      interval={0}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                      formatter={(value, name) => {
                        if (name === 'count') return [value, 'Deals'];
                        return [formatINR(Number(value)), 'Pipeline Value'];
                      }}
                    />
                    <Bar dataKey="count" name="count" radius={[0, 6, 6, 0]} maxBarSize={30}>
                      {stageChart.map((d, i) => (
                        <Cell key={d.stage} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Stage value table beneath the chart for precise figures */}
              {stageChart.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-y border-gray-100 bg-gray-50/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                        <th className="px-4 py-2.5">Stage</th>
                        <th className="px-4 py-2.5 text-right">Deals</th>
                        <th className="px-4 py-2.5 text-right">Value</th>
                        <th className="px-4 py-2.5 text-right">Weighted Forecast</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {stageChart.map((s, i) => (
                        <tr key={s.stage} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                          <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: STAGE_COLORS[i % STAGE_COLORS.length] }}
                              />
                              {s.stage}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-300">
                            {s.count}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-gray-900 dark:text-white">
                            {formatINR(s.value)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-300">
                            {formatINR(s.weightedForecast)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Salesperson view */}
            <Card className="p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-6 pt-6">
                <SectionHeader icon={Users} title="Salesperson View" tone="blue" />
              </div>
              {data!.byOwner.length === 0 ? (
                <div className="px-6 pb-6">
                  <EmptyState
                    icon={<Users size={32} />}
                    title="No owners with pipeline"
                    description="Assign deals to salespeople to see their pipeline breakdown."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-y border-gray-100 bg-gray-50/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                        <th className="px-6 py-3">Owner</th>
                        <th className="px-4 py-3 text-right">Open</th>
                        <th className="px-4 py-3 text-right">Pipeline Value</th>
                        <th className="px-4 py-3 text-right">Forecast</th>
                        <th className="px-6 py-3 text-right">Won Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {data!.byOwner.map((o) => (
                        <tr key={o.ownerId} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                          <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{o.name}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                            {o.openCount}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-white">
                            {formatINR(o.pipelineValue)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                            {formatINR(o.forecast)}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                            {formatINR(o.wonValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <p className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 print:hidden">
              <Filter size={12} /> Figures reflect the selected period ({label}).
            </p>
          </div>
        )}
      </div>
    </PermissionPageGuard>
  );
}

function PipelineSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
