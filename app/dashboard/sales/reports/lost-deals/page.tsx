'use client';

/**
 * SE-036 — Lost Deal Analysis report.
 *
 * KPIs (Total Lost, Lost Value), AI-style insights callouts, top loss reasons,
 * top competitors, most-lost stage, disqualification reasons and a monthly loss
 * trend. Export (Excel/CSV), Print/PDF and a Period filter.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import {
  AlertTriangle,
  TrendingDown,
  Wallet,
  Lightbulb,
  Swords,
  Layers,
  Filter,
  LineChart as LineChartIcon,
  Inbox,
} from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/lib/hooks/useToast';
import { fetchLostDealReport, exportReport } from '@/lib/api/salesReports';
import type { LostDealAnalysis } from '@/lib/types/salesReports';
import type { ReportExportFormat } from '@/lib/types/salesReports';
import {
  CHART_COLORS,
  KpiCard,
  ReportSkeleton,
  ReportToolbar,
  SectionTitle,
  formatINR,
  formatPct,
  usePeriodWindow,
} from '@/components/sales-reports-analysis/reportShared';

function LostDealsReport() {
  const { toast } = useToast();
  const { period, setPeriod, window: reportWindow } = usePeriodWindow();
  const [data, setData] = useState<LostDealAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLostDealReport(reportWindow)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          toast('Failed to load lost deal analysis.', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportWindow, toast]);

  const handleExport = useCallback(
    async (format: ReportExportFormat) => {
      setExporting(true);
      try {
        await exportReport('lost-deals', format, reportWindow);
        toast(`Lost deal report exported as ${format.toUpperCase()}.`, 'success');
      } catch {
        toast('Export failed. Please try again.', 'error');
      } finally {
        setExporting(false);
      }
    },
    [reportWindow, toast],
  );

  if (loading) return <ReportSkeleton />;

  const topStage = data?.byStage?.length
    ? [...data.byStage].sort((a, b) => b.count - a.count)[0]
    : null;

  const lossReasonData = (data?.byLossReason ?? []).map((r) => ({
    name: r.label,
    count: r.count,
    pct: r.pct ?? 0,
    value: r.value ?? 0,
  }));

  const competitorData = (data?.byCompetitor ?? []).map((c) => ({
    name: c.label,
    count: c.count,
    value: c.value ?? 0,
  }));

  const trendData = (data?.trend ?? []).map((t) => ({
    period: t.period,
    count: t.count,
    value: t.value,
  }));

  const maxCompetitor = competitorData.reduce((m, c) => Math.max(m, c.count), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <TrendingDown className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Lost Deal Analysis</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Why deals are slipping away — reasons, competitors and trends.
            </p>
          </div>
        </div>
      </div>

      <ReportToolbar
        period={period}
        onPeriodChange={setPeriod}
        onExport={handleExport}
        exporting={exporting}
        disabled={!data}
      />

      {!data || data.total === 0 ? (
        <EmptyState
          icon={<Inbox className="h-9 w-9" />}
          title="No lost deals in this period"
          description="Nothing was marked as lost for the selected window. Try a wider period."
        />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard
              label="Total Lost"
              value={data.total.toLocaleString('en-IN')}
              icon={<TrendingDown className="h-5 w-5" />}
              accent="text-red-600 dark:text-red-400"
              sub="Deals marked lost this period"
            />
            <KpiCard
              label="Lost Value"
              value={formatINR(data.totalValue)}
              icon={<Wallet className="h-5 w-5" />}
              accent="text-amber-600 dark:text-amber-400"
              sub="Total pipeline value forfeited"
            />
          </div>

          {/* Insights */}
          {data.insights?.length > 0 && (
            <Card variant="outlined" className="rounded-2xl p-5">
              <SectionTitle
                icon={<Lightbulb className="h-5 w-5" />}
                title="Insights"
                caption="Automated observations from the lost-deal data."
              />
              <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {data.insights.map((insight, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Top loss reasons */}
            <Card variant="outlined" className="rounded-2xl p-5">
              <SectionTitle
                icon={<AlertTriangle className="h-5 w-5" />}
                title="Top Loss Reasons"
                caption="Most frequent reasons cited for losing deals."
              />
              {lossReasonData.length === 0 ? (
                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">No loss reasons recorded.</p>
              ) : (
                <>
                  <div className="mt-4">
                    <ResponsiveContainer width="100%" height={Math.max(180, lossReasonData.length * 40 + 20)}>
                      <BarChart data={lossReasonData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="#9ca3af"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={120}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                          formatter={(v) => [`${v} deals`, 'Count']}
                        />
                        <Bar dataKey="count" name="Count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                          {lossReasonData.map((d, i) => (
                            <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {lossReasonData.map((r, i) => (
                      <li key={r.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          {r.name}
                        </span>
                        <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{r.count}</span>
                          <Badge variant="info">{formatPct(r.pct)}</Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>

            {/* Top competitors */}
            <Card variant="outlined" className="rounded-2xl p-5">
              <SectionTitle
                icon={<Swords className="h-5 w-5" />}
                title="Top Competitors"
                caption={
                  data.approximateCompetitor
                    ? 'Approximate — derived from free-text tags.'
                    : 'Competitors deals were lost to.'
                }
              />
              {competitorData.length === 0 ? (
                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">No competitor data recorded.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {competitorData.map((c, i) => (
                    <li key={c.name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-200">{c.name}</span>
                        <span className="text-gray-500 dark:text-gray-400">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{c.count}</span> deals
                          {c.value > 0 && <span className="ml-2 text-xs">({formatINR(c.value)})</span>}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${maxCompetitor ? (c.count / maxCompetitor) * 100 : 0}%`,
                            backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Most lost stage */}
            <Card variant="outlined" className="rounded-2xl p-5">
              <SectionTitle
                icon={<Layers className="h-5 w-5" />}
                title="Most Lost Stage"
                caption="Pipeline stages where deals are most often lost."
              />
              {!data.byStage?.length ? (
                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">No stage data recorded.</p>
              ) : (
                <>
                  {topStage && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                        Highest drop-off
                      </p>
                      <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-50">{topStage.label}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {topStage.count} deals lost{topStage.pct != null && ` · ${formatPct(topStage.pct)}`}
                      </p>
                    </div>
                  )}
                  <ul className="mt-4 space-y-2">
                    {data.byStage.map((s) => (
                      <li key={s.label} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-200">{s.label}</span>
                        <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{s.count}</span>
                          {s.pct != null && <Badge variant="warning">{formatPct(s.pct)}</Badge>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>

            {/* Disqualification reasons */}
            <Card variant="outlined" className="rounded-2xl p-5">
              <SectionTitle
                icon={<Filter className="h-5 w-5" />}
                title="Disqualification Reasons"
                caption="Why leads/deals were disqualified."
              />
              {!data.byDisqualifyReason?.length ? (
                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">No disqualification reasons recorded.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {data.byDisqualifyReason.map((d) => (
                    <li
                      key={d.label}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800/60"
                    >
                      <span className="text-gray-700 dark:text-gray-200">{d.label}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{d.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Trend */}
          <Card variant="outlined" className="rounded-2xl p-5">
            <SectionTitle
              icon={<LineChartIcon className="h-5 w-5" />}
              title="Loss Trend"
              caption="Lost deals over time."
            />
            {trendData.length === 0 ? (
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">No trend data available.</p>
            ) : (
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendData} margin={{ top: 8, right: 24, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="period" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                    <Tooltip
                      cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
                      formatter={(v, name) =>
                        name === 'Lost Value' ? [formatINR(Number(v)), 'Lost Value'] : [`${v} deals`, 'Lost Count']
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Lost Count"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default function LostDealsPage() {
  return (
    <PermissionPageGuard module="sales">
      <LostDealsReport />
    </PermissionPageGuard>
  );
}
