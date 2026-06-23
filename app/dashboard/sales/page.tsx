'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Tooltip,
  PieChart, Pie,
} from 'recharts';
import {
  Users, UserPlus, Target, TrendingUp, Briefcase, Trophy, XCircle, Wallet,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Flame, CheckCircle2,
  LayoutGrid, Clock, BarChart3, Bell,
} from 'lucide-react';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchSalesDashboard } from '@/lib/api/salesDashboard';
import type { SalesDashboard, SalesInsight } from '@/lib/types/salesDashboard';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const FUNNEL_COLORS = ['#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#22c55e'];

const INSIGHT_ICON: Record<SalesInsight['severity'], React.ComponentType<{ size?: number; className?: string }>> = {
  info: Bell, warning: AlertTriangle, danger: Flame, success: CheckCircle2,
};
const INSIGHT_TONE: Record<SalesInsight['severity'], string> = {
  info: 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900',
  warning: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900',
  danger: 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900',
  success: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900',
};

export default function SalesCommandCenterPage() {
  const { toast } = useToast();
  const [data, setData] = useState<SalesDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setData(await fetchSalesDashboard());
    } catch {
      toast('Failed to load sales dashboard', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const dealsPie = data
    ? [
        { name: 'Open', value: data.deals.open, color: '#3b82f6' },
        { name: 'Won', value: data.deals.won, color: '#22c55e' },
        { name: 'Lost', value: data.deals.lost, color: '#ef4444' },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Command Center</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your pipeline at a glance — leads, conversions, revenue forecast and what needs attention today.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <QuickLink href="/dashboard/sales/leads?view=pipeline" icon={LayoutGrid} label="Pipeline" />
            <QuickLink href="/dashboard/sales/follow-ups" icon={Clock} label="Follow-ups" />
            <QuickLink href="/dashboard/sales/team" icon={Trophy} label="Team" />
            <QuickLink href="/dashboard/sales/analytics" icon={BarChart3} label="Analytics" />
          </div>
        </div>

        {/* Smart insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            : data?.insights.map((ins, i) => {
                const Icon = INSIGHT_ICON[ins.severity];
                return (
                  <div key={i} className={`flex items-start gap-2.5 p-3.5 rounded-xl border ${INSIGHT_TONE[ins.severity]}`}>
                    <Icon size={18} className="mt-0.5 shrink-0" />
                    <span className="text-sm font-medium leading-snug">{ins.message}</span>
                  </div>
                );
              })}
        </div>

        {/* Overview KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="Total Leads" icon={Users} variant="indigo" value={data?.leads.total} trend={data?.leads.growthPct} loading={isLoading} />
          <Kpi label="New Leads" icon={UserPlus} variant="blue" value={data?.leads.new} loading={isLoading} />
          <Kpi label="Qualified" icon={Target} variant="violet" value={data?.leads.qualified} loading={isLoading} />
          <Kpi label="Converted" icon={TrendingUp} variant="emerald" value={data?.leads.converted} trend={data?.conversion.growthPct} loading={isLoading} />
          <Kpi label="Open Deals" icon={Briefcase} variant="blue" value={data?.deals.open} loading={isLoading} />
          <Kpi label="Won Deals" icon={Trophy} variant="emerald" value={data?.deals.won} loading={isLoading} />
          <Kpi label="Lost Deals" icon={XCircle} variant="rose" value={data?.deals.lost} loading={isLoading} />
          <Kpi label="Revenue Forecast" icon={Wallet} variant="amber" money value={data?.revenue.forecast} trend={data?.revenue.growthPct} loading={isLoading} />
        </div>

        {/* Trend cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Trend label="Lead Growth" value={data?.leads.growthPct} loading={isLoading} />
          <Trend label="Conversion Growth" value={data?.conversion.growthPct} loading={isLoading} />
          <Trend label="Revenue Growth" value={data?.revenue.growthPct} loading={isLoading} />
          <Trend label="Follow-up Completion" value={data?.followUp.completionRate} suffix="%" positiveOnly loading={isLoading} />
        </div>

        {/* Funnel + revenue + deals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Conversion Funnel</h3>
            {isLoading ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.funnel ?? []} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" allowDecimals={false} stroke="#9ca3af" fontSize={12} />
                  <YAxis type="category" dataKey="label" width={90} stroke="#9ca3af" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" name="Leads" radius={[0, 6, 6, 0]}>
                    {(data?.funnel ?? []).map((entry, i) => (
                      <Cell key={entry.label} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="space-y-6">
            {/* Revenue tiles */}
            <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Revenue</h3>
              <div className="space-y-4">
                <RevenueRow label="Pipeline Value" value={data?.revenue.pipelineValue} loading={isLoading} tone="text-blue-600 dark:text-blue-400" />
                <RevenueRow label="Forecast (weighted)" value={data?.revenue.forecast} loading={isLoading} tone="text-amber-600 dark:text-amber-400" />
                <RevenueRow label="Won Revenue" value={data?.revenue.wonValue} loading={isLoading} tone="text-emerald-600 dark:text-emerald-400" />
              </div>
            </Card>

            {/* Deals donut */}
            <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Deal Status</h3>
              {isLoading ? (
                <Skeleton className="h-40 rounded-xl" />
              ) : dealsPie.length === 0 ? (
                <p className="text-sm text-gray-500">No deals yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={dealsPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                      {dealsPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </div>
      </div>
    </PermissionPageGuard>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

const VARIANTS: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
};

function Kpi({ label, icon: Icon, variant, value, trend, money, loading }: {
  label: string; icon: React.ComponentType<{ size?: number; className?: string }>;
  variant: string; value?: number; trend?: number; money?: boolean; loading?: boolean;
}) {
  return (
    <Card className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-20 mt-2 rounded" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums">
              <AnimatedCounter value={value ?? 0} format={money ? inr : undefined} />
            </p>
          )}
          {!loading && trend !== undefined && <TrendChip value={trend} />}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${VARIANTS[variant]}`}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}

function TrendChip({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold mt-1.5 ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {Math.abs(value)}%
    </span>
  );
}

function Trend({ label, value, suffix, positiveOnly, loading }: {
  label: string; value?: number; suffix?: string; positiveOnly?: boolean; loading?: boolean;
}) {
  const v = value ?? 0;
  const up = v >= 0;
  return (
    <Card className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      {loading ? (
        <Skeleton className="h-7 w-16 mt-2 rounded" />
      ) : (
        <p className={`text-2xl font-bold mt-1 tabular-nums flex items-center gap-1 ${
          positiveOnly ? 'text-gray-900 dark:text-white' : up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}>
          {!positiveOnly && (up ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />)}
          <AnimatedCounter value={Math.abs(v)} />{suffix ?? '%'}
        </p>
      )}
    </Card>
  );
}

function RevenueRow({ label, value, tone, loading }: { label: string; value?: number; tone: string; loading?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      {loading ? <Skeleton className="h-5 w-20 rounded" /> : (
        <span className={`text-sm font-bold tabular-nums ${tone}`}>
          <AnimatedCounter value={value ?? 0} format={inr} />
        </span>
      )}
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ size?: number; className?: string }>; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-blue-300 hover:text-blue-600 transition-colors"
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}
