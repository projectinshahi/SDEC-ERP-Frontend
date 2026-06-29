'use client';

import Link from 'next/link';
import {
  Target, TrendingUp, Wallet, Trophy, Users, UserPlus, Briefcase, Award,
  ArrowUpRight, DollarSign, Layers,
} from 'lucide-react';
import { fetchMasterSales, type MasterSalesLeaderboardRow, type MasterLeadSourceRow } from '@/lib/api/masterModules';
import {
  useMasterResource, ModuleStateScreen, ModuleHeader, StatCard, MiniStat,
  ChartCard, DonutChart, AreaTrend, ActivityFeed, EmptyState,
} from '@/components/master/MasterKit';
import { Card } from '@/components/Card';
import { formatINR } from '@/lib/utils/currency';
import { formatLeadSource } from '@/lib/data/leadSources';

export default function MasterSalesPage() {
  const { data, status, errorMsg, reload } = useMasterResource(fetchMasterSales);

  if (status !== 'ready' || !data) {
    return <ModuleStateScreen status={status} errorMsg={errorMsg} onRetry={reload} />;
  }

  const { stats, charts, topDeals, activities, leaderboard, leadSourceAnalytics } = data;

  // Conversion funnel from live org-wide counts (each stage a subset of the prior).
  const funnel = [
    { label: 'Total Leads', value: stats.totalLeads },
    { label: 'Opportunities', value: stats.totalOpportunities },
    { label: 'Total Deals', value: stats.totalDeals },
    { label: 'Won Deals', value: stats.wonDeals },
  ];
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);
  const pipelineByValue = [...charts.dealStage].sort((a, b) => b.amount - a.amount);

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

      {/* Revenue Tracker + Sales Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Revenue Tracker" subtitle="Won-deal value · last 6 months" className="lg:col-span-2">
          <AreaTrend data={charts.revenueTrend} dataKey="revenue" color="#10b981" valueFormatter={formatINR} />
        </ChartCard>
        <ChartCard title="Sales Funnel" subtitle="Leads → Opportunities → Deals → Won">
          <SalesFunnel rows={funnel} max={funnelMax} />
        </ChartCard>
      </div>

      {/* Team Leaderboard + Lead Source Analytics — live, org-wide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TeamLeaderboard rows={leaderboard} className="lg:col-span-2" />
        <LeadSourceAnalytics rows={leadSourceAnalytics} />
      </div>

      {/* Deal Pipeline by Value + Deal Status + Lead Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Deal Pipeline by Value" subtitle="Open + closed value per stage">
          <PipelineByValue rows={pipelineByValue} />
        </ChartCard>
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

/* ──────────────────────────── Subcomponents ──────────────────────────────── */

const FUNNEL_COLORS = ['#6366f1', '#3b82f6', '#0ea5e9', '#22c55e'];
const PIPELINE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

/** Centered tapering funnel — Leads → Opportunities → Deals → Won (live counts). */
function SalesFunnel({ rows, max }: { rows: { label: string; value: number }[]; max: number }) {
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      {rows.map((row, i) => {
        const widthPct = Math.max((row.value / max) * 100, 16);
        return (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-semibold text-white shadow-sm"
            style={{ width: `${widthPct}%`, backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
            title={`${row.label}: ${row.value}`}
          >
            <span className="truncate">{row.label}</span>
            <span className="ml-2 shrink-0 tabular-nums">{row.value}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Deal pipeline value per stage (amount), with the deal count as a chip. */
function PipelineByValue({ rows }: { rows: { label: string; value: number; amount: number }[] }) {
  if (rows.length === 0) return <EmptyState icon={Layers} title="No pipeline data" message="No deals in the pipeline yet." />;
  return (
    <div className="space-y-2.5 py-1">
      {rows.map((s, i) => (
        <div key={s.label} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIPELINE_COLORS[i % PIPELINE_COLORS.length] }} />
            <span className="truncate text-sm text-slate-600 dark:text-slate-300 capitalize">{s.label}</span>
            <span className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 text-[10px] font-bold text-slate-500">{s.value}</span>
          </span>
          <span className="shrink-0 text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{formatINR(s.amount)}</span>
        </div>
      ))}
    </div>
  );
}

const LEAD_SOURCE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

/**
 * Team Leaderboard — per-salesperson assigned target vs live closed revenue and
 * achievement %, with a progress indicator. Live org-wide data (active revenue
 * targets), computed by the backend via the shared target engine.
 */
function TeamLeaderboard({ rows, className }: { rows: MasterSalesLeaderboardRow[]; className?: string }) {
  return (
    <Card className={`border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden ${className ?? ''}`}>
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" /> Team Leaderboard
        </h3>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Trophy} title="No active targets" message="Assign revenue targets to sales people to populate the leaderboard." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Sales Person</th>
                <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Target</th>
                <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Closed</th>
                <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[160px]">Achievement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r, i) => {
                const pct = Math.min(Math.max(r.achievementPct, 0), 100);
                const bar = r.achievementPct >= 100 ? 'bg-emerald-500' : r.achievementPct >= 60 ? 'bg-amber-500' : 'bg-rose-500';
                const pctText = r.achievementPct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : r.achievementPct >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
                return (
                  <tr key={r.ownerId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 text-center text-xs font-bold ${i < 3 ? 'text-amber-500' : 'text-slate-400'}`}>{i + 1}</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[160px]">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-right text-sm text-slate-600 dark:text-slate-300 tabular-nums">{formatINR(r.target)}</td>
                    <td className="py-3 px-5 text-right text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatINR(r.closedRevenue)}</td>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-xs font-bold tabular-nums w-10 text-right ${pctText}`}>{r.achievementPct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/**
 * Lead Source Analytics — per-source lead count, conversion % and won-deal
 * revenue. Source-agnostic (groups by whatever sources exist), so newly added
 * Lead Sources appear automatically. Live org-wide data.
 */
function LeadSourceAnalytics({ rows }: { rows: MasterLeadSourceRow[] }) {
  const maxCount = Math.max(...rows.map((r) => r.count), 1);
  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" /> Lead Source Analytics
        </h3>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Layers} title="No leads yet" message="Lead sources will appear here as leads are captured." />
      ) : (
        <div className="p-5 space-y-3.5 max-h-[360px] overflow-y-auto">
          {rows.map((s, i) => (
            <div key={s.source} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">{formatLeadSource(s.source)}</span>
                <span className="font-bold tabular-nums text-slate-900 dark:text-white">{s.count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full" style={{ width: `${(s.count / maxCount) * 100}%`, backgroundColor: LEAD_SOURCE_COLORS[i % LEAD_SOURCE_COLORS.length] }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{s.conversionRate}% conv.</span>
                {s.revenue > 0 && <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatINR(s.revenue)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
