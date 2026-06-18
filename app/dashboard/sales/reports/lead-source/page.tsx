'use client';

/**
 * SE-033 — Lead Source Report.
 *
 * Headline KPIs (Total Leads, Total Converted, Overall Conversion %), a donut of
 * leads by source, a bar comparing conversion rate by source, and a ranked table
 * highlighting the best-performing source. Export (Excel/CSV), Print/PDF and a
 * Period filter.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Users, CheckCircle2, Percent, PieChart as PieChartIcon, BarChart3, Trophy, Inbox } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/lib/hooks/useToast';
import { fetchLeadSourceReport, exportReport } from '@/lib/api/salesReports';
import type { LeadSourceReport } from '@/lib/types/salesReports';
import type { ReportExportFormat } from '@/lib/types/salesReports';
import {
  CHART_COLORS,
  KpiCard,
  ReportSkeleton,
  ReportToolbar,
  SectionTitle,
  formatPct,
  usePeriodWindow,
} from '@/components/sales-reports-analysis/reportShared';

function LeadSourceReportView() {
  const { toast } = useToast();
  const { period, setPeriod, window: reportWindow } = usePeriodWindow();
  const [data, setData] = useState<LeadSourceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLeadSourceReport(reportWindow)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          toast('Failed to load lead source report.', 'error');
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
        await exportReport('lead-source', format, reportWindow);
        toast(`Lead source report exported as ${format.toUpperCase()}.`, 'success');
      } catch {
        toast('Export failed. Please try again.', 'error');
      } finally {
        setExporting(false);
      }
    },
    [reportWindow, toast],
  );

  const rankedSources = useMemo(
    () => (data?.sources ? [...data.sources].sort((a, b) => b.total - a.total) : []),
    [data],
  );

  // Best-performing source = highest conversion rate (with a meaningful sample).
  const bestSource = useMemo(() => {
    if (!data?.sources?.length) return null;
    return [...data.sources].sort((a, b) => b.conversionRate - a.conversionRate)[0];
  }, [data]);

  if (loading) return <ReportSkeleton />;

  const donutData = rankedSources.map((s) => ({ name: s.source, value: s.total }));
  const conversionData = rankedSources.map((s) => ({ name: s.source, rate: Number((s.conversionRate || 0).toFixed(1)) }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <PieChartIcon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Lead Source Report</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Where leads come from and how well each channel converts.
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

      {!data || data.totalLeads === 0 ? (
        <EmptyState
          icon={<Inbox className="h-9 w-9" />}
          title="No leads in this period"
          description="No leads were captured for the selected window. Try a wider period."
        />
      ) : (
        <>
          {/* Headline KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              label="Total Leads"
              value={data.totalLeads.toLocaleString('en-IN')}
              icon={<Users className="h-5 w-5" />}
              accent="text-indigo-600 dark:text-indigo-400"
              sub="Across all sources"
            />
            <KpiCard
              label="Total Converted"
              value={data.totalConverted.toLocaleString('en-IN')}
              icon={<CheckCircle2 className="h-5 w-5" />}
              accent="text-emerald-600 dark:text-emerald-400"
              sub="Leads that became deals"
            />
            <KpiCard
              label="Overall Conversion"
              value={formatPct(data.overallConversionRate)}
              icon={<Percent className="h-5 w-5" />}
              accent="text-sky-600 dark:text-sky-400"
              sub="Converted ÷ total leads"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Leads by source — donut */}
            <Card variant="outlined" className="rounded-2xl p-5">
              <SectionTitle
                icon={<PieChartIcon className="h-5 w-5" />}
                title="Leads by Source"
                caption="Share of total leads per channel."
              />
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                    >
                      {donutData.map((d, i) => (
                        <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${v} leads`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                {donutData.map((d, i) => (
                  <li key={d.name} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    {d.name}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{d.value}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Conversion rate by source — bar */}
            <Card variant="outlined" className="rounded-2xl p-5">
              <SectionTitle
                icon={<BarChart3 className="h-5 w-5" />}
                title="Conversion Rate by Source"
                caption="How effectively each channel converts."
              />
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={Math.max(220, conversionData.length * 38 + 40)}>
                  <BarChart data={conversionData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      stroke="#9ca3af"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={conversionData.length > 5 ? -25 : 0}
                      textAnchor={conversionData.length > 5 ? 'end' : 'middle'}
                      height={conversionData.length > 5 ? 56 : 28}
                    />
                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={40} unit="%" />
                    <Tooltip
                      cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                      formatter={(v) => [`${v}%`, 'Conversion']}
                    />
                    <Bar dataKey="rate" name="Conversion" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {conversionData.map((d, i) => (
                        <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Ranked table */}
          <Card variant="outlined" className="rounded-2xl p-5">
            <SectionTitle
              icon={<Trophy className="h-5 w-5" />}
              title="Source Performance"
              caption="Ranked by lead volume. The best-converting source is highlighted."
            />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="py-2.5 pr-4 font-semibold">Source</th>
                    <th className="py-2.5 pr-4 text-right font-semibold">Leads</th>
                    <th className="py-2.5 pr-4 text-right font-semibold">Qualified</th>
                    <th className="py-2.5 pr-4 text-right font-semibold">Converted</th>
                    <th className="py-2.5 text-right font-semibold">Conversion %</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedSources.map((s) => {
                    const isBest = bestSource?.source === s.source && s.conversionRate > 0;
                    return (
                      <tr
                        key={s.source}
                        className={
                          isBest
                            ? 'border-b border-gray-100 bg-emerald-50/60 dark:border-gray-800 dark:bg-emerald-950/20'
                            : 'border-b border-gray-100 dark:border-gray-800'
                        }
                      >
                        <td className="py-2.5 pr-4">
                          <span className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-100">
                            {s.source}
                            {isBest && (
                              <Badge variant="success">
                                <Trophy className="mr-1 h-3 w-3" /> Top
                              </Badge>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-right text-gray-700 dark:text-gray-200">
                          {s.total.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 pr-4 text-right text-gray-700 dark:text-gray-200">
                          {s.qualified.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 pr-4 text-right text-gray-700 dark:text-gray-200">
                          {s.converted.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-gray-900 dark:text-gray-100">
                          {formatPct(s.conversionRate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default function LeadSourcePage() {
  return (
    <PermissionPageGuard module="sales">
      <LeadSourceReportView />
    </PermissionPageGuard>
  );
}
