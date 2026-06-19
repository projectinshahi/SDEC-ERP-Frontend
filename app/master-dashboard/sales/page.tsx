'use client';

import Link from 'next/link';
import {
  Target, TrendingUp, Wallet, Trophy, Users, UserPlus, Briefcase, Award,
  ArrowUpRight, DollarSign, Layers,
} from 'lucide-react';
import { fetchMasterSales } from '@/lib/api/masterModules';
import {
  useMasterResource, ModuleStateScreen, ModuleHeader, StatCard, MiniStat,
  ChartCard, DonutChart, CategoryBars, AreaTrend, ActivityFeed, EmptyState,
} from '@/components/master/MasterKit';
import { Card } from '@/components/Card';
import { formatINR } from '@/lib/utils/currency';

// Feature flag — temporarily hides selected infographic cards (Revenue Trend,
// Pipeline by Stage / "Deal Pipeline", Lead Sources) while preserving their
// full implementation (components, data wiring and chart configs stay intact).
// Flip to `true` to reactivate these cards in a future release.
const SHOW_FUTURE_ANALYTICS: boolean = false;

export default function MasterSalesPage() {
  const { data, status, errorMsg, reload } = useMasterResource(fetchMasterSales);

  if (status !== 'ready' || !data) {
    return <ModuleStateScreen status={status} errorMsg={errorMsg} onRetry={reload} />;
  }

  const { stats, charts, topDeals, activities } = data;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ModuleHeader
        icon={Target}
        title="Global Sales Command"
        subtitle="Organization-wide revenue forecasting, pipeline analysis, and conversion tracking across every sales division."
        accent="bg-emerald-600"
        shadow="shadow-emerald-500/20"
        onRefresh={reload}
        actions={
          <Link
            href="/dashboard/sales"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            Enter Sales Module <ArrowUpRight size={16} />
          </Link>
        }
      />

      {/* Forecast highlight + key revenue stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Forecast highlight — same card shell/typography as StatCard, with a
            subtle emerald wash so it reads as the hero metric without breaking
            the unified light design language. */}
        <Card className="lg:col-span-2 p-6 shadow-sm rounded-2xl relative overflow-hidden border-slate-200 dark:border-slate-800 bg-gradient-to-br from-emerald-50/70 to-transparent dark:from-emerald-900/10">
          <div className="flex items-start justify-between gap-4 h-full">
            <div className="flex flex-col justify-between h-full min-w-0">
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Weighted Pipeline Forecast</p>
                <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                  {formatINR(stats.forecast)}
                </h2>
                <p className="text-xs font-medium text-slate-400 mt-2 max-w-md">
                  Probability-weighted value of all open deals currently in negotiation.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold w-fit bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                {stats.conversionRate}% conversion rate
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50">
              <Wallet size={22} />
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <StatCard label="Closed Won Revenue" value={stats.revenue} format={formatINR} icon={Trophy} tone="emerald" />
          <StatCard label="Open Pipeline Value" value={stats.pipelineValue} format={formatINR} icon={TrendingUp} tone="blue" />
        </div>
      </div>

      {/* Conversion matrix */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard label="Total Leads" value={stats.totalLeads} icon={Users} tone="indigo" sub={`${stats.newLeads} new this month`} />
        <StatCard label="Open Deals" value={stats.openDeals} icon={Briefcase} tone="amber" />
        <StatCard label="Deals Won" value={stats.wonDeals} icon={Award} tone="emerald" />
        <StatCard label="Avg Deal Size" value={stats.avgDealSize} format={formatINR} icon={DollarSign} tone="blue" />
      </div>

      {/* Secondary stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniStat label="Converted Leads" value={stats.convertedLeads} icon={UserPlus} tone="emerald" />
        <MiniStat label="Opportunities" value={stats.totalOpportunities} icon={Layers} tone="blue" />
        <MiniStat label="Total Deals" value={stats.totalDeals} icon={Briefcase} tone="indigo" />
        <MiniStat label="Lost Deals" value={stats.lostDeals} icon={Target} tone="rose" />
      </div>

      {/* Analytics */}
      {/*
        ── Future Release · temporarily hidden infographic cards ───────────────
        Revenue Trend, Pipeline by Stage ("Deal Pipeline") and Lead Sources are
        hidden for now but fully preserved — components, data wiring and chart
        configs are untouched. To restore them, flip SHOW_FUTURE_ANALYTICS
        (declared at the top of this file) to `true`; the original 3-column
        layout returns automatically.
      */}
      {SHOW_FUTURE_ANALYTICS && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Future Release · Revenue Trend Card — spans 2 cols on large screens */}
          <ChartCard title="Revenue Trend" subtitle="Won-deal value · last 6 months" className="lg:col-span-2">
            <AreaTrend data={charts.revenueTrend} dataKey="revenue" color="#10b981" valueFormatter={formatINR} />
          </ChartCard>
          {/* Future Release · Deal Pipeline Card */}
          <ChartCard title="Pipeline by Stage" subtitle="Deal count per stage">
            <CategoryBars data={charts.dealStage} />
          </ChartCard>
          {/* Future Release · Lead Sources Card */}
          <ChartCard title="Lead Sources" subtitle="Where leads originate">
            <CategoryBars data={charts.leadSource} />
          </ChartCard>
        </div>
      )}

      {/* Active analytics — reflowed into a balanced 2-column grid so no gaps
          remain where the hidden cards used to sit. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Deal Status" subtitle="Open · won · lost">
          <DonutChart data={charts.dealStatus} />
        </ChartCard>
        <ChartCard title="Lead Stages" subtitle="Funnel distribution">
          <DonutChart data={charts.leadStage} />
        </ChartCard>
      </div>

      {/* Top open deals + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-500" /> Top Open Deals
              </h3>
            </div>
            {topDeals.length === 0 ? (
              <EmptyState icon={Briefcase} title="No open deals" message="There are no open deals in the pipeline yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                      <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Deal</th>
                      <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Stage</th>
                      <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Owner</th>
                      <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {topDeals.map((deal) => (
                      <tr key={deal.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-5">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white max-w-xs truncate">{deal.title}</p>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                            {deal.stage}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-sm text-slate-600 dark:text-slate-400">{deal.owner?.name || 'Unassigned'}</td>
                        <td className="py-3.5 px-5 text-right text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatINR(deal.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        <ActivityFeed
          activities={activities}
          title="Recent Sales Activity"
          emptyLabel="No recent sales activity recorded."
          maxHeight="max-h-[420px]"
        />
      </div>
    </div>
  );
}
