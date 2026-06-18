'use client';

/**
 * SE-035 — Win Rate report.
 *
 * Headline win rate % (won / (won + lost)) with a won-vs-lost donut, plus win
 * rate breakdowns by owner, team and product. Honours the `null` = N/A
 * contract — win rates with no closed deals render "N/A", never a number.
 * Period filter + Excel / CSV / Print(PDF) export.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import {
  RefreshCw,
  Trophy,
  Users,
  Building2,
  Package,
  Percent,
  Info,
} from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchWinRateReport } from '@/lib/api/salesReports';
import type {
  WinRateReport,
  WinRateOwnerRow,
  WinRateTeamRow,
  WinRateProductRow,
} from '@/lib/types/salesReports';
import { SectionHeader } from '@/components/sales-execution/performance/perfShared';
import {
  ExportBar,
  PeriodFilter,
  formatRate,
  useReportPeriod,
} from '@/components/sales-reports/reportShared';

const WON_COLOR = '#10b981';
const LOST_COLOR = '#f43f5e';

/** Win-rate → Badge variant; N/A renders neutral. */
function rateBadge(rate: number | null): { variant: 'default' | 'success' | 'warning' | 'danger'; text: string } {
  if (rate == null) return { variant: 'default', text: 'N/A' };
  const text = `${Math.round(rate)}%`;
  if (rate >= 60) return { variant: 'success', text };
  if (rate >= 35) return { variant: 'warning', text };
  return { variant: 'danger', text };
}

export default function WinRateReportPage() {
  const { toast } = useToast();
  const { choice, setChoice, reportWindow, label } = useReportPeriod('month');

  const [data, setData] = useState<WinRateReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        setData(await fetchWinRateReport(reportWindow));
      } catch {
        toast('Failed to load win rate report', 'error');
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

  const overall = data?.overall;
  const totalClosed = (overall?.won ?? 0) + (overall?.lost ?? 0);
  const hasData = !!data && totalClosed > 0;

  const donutData = useMemo(
    () => [
      { name: 'Won', value: overall?.won ?? 0, color: WON_COLOR },
      { name: 'Lost', value: overall?.lost ?? 0, color: LOST_COLOR },
    ],
    [overall],
  );

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 print:block">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Win Rate</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Won vs lost across owners, teams & products · {label}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <PeriodFilter value={choice} onChange={setChoice} disabled={isLoading} />
            <div className="flex items-center gap-2">
              <ExportBar
                type="win-rate"
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
          <WinRateSkeleton />
        ) : !hasData ? (
          <EmptyState
            icon={<Trophy size={32} />}
            title="No closed deals yet"
            description="Win rate becomes available once deals have been won or lost in this period."
          />
        ) : (
          <div className="space-y-6">
            {/* Headline win rate + donut */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl lg:col-span-1">
                <SectionHeader icon={Percent} title="Overall Win Rate" tone="emerald" />
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <p className="text-5xl font-bold tabular-nums text-gray-900 dark:text-white">
                    {formatRate(overall!.winRate)}
                  </p>
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {overall!.won}
                    </span>{' '}
                    won /{' '}
                    <span className="font-semibold tabular-nums">{totalClosed}</span> closed
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <Badge variant="success">{overall!.won} Won</Badge>
                    <Badge variant="danger">{overall!.lost} Lost</Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl lg:col-span-2">
                <SectionHeader icon={Trophy} title="Won vs Lost" tone="violet" />
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {donutData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {data!.approximateProduct && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Info size={13} /> Product breakdown is approximate — based on free-text product tags.
              </p>
            )}

            {/* By owner */}
            <WinRateTable
              title="Win Rate by Owner"
              icon={Users}
              tone="blue"
              firstHeader="Owner"
              rows={data!.byOwner}
              keyOf={(r: WinRateOwnerRow) => r.ownerId}
              labelOf={(r: WinRateOwnerRow) => r.name}
              emptyText="No owners with closed deals."
            />

            {/* By team */}
            <WinRateTable
              title="Win Rate by Team"
              icon={Building2}
              tone="indigo"
              firstHeader="Team"
              rows={data!.byTeam}
              keyOf={(r: WinRateTeamRow) => r.teamId}
              labelOf={(r: WinRateTeamRow) => r.name}
              emptyText="No teams with closed deals."
            />

            {/* By product */}
            <WinRateTable
              title="Win Rate by Product"
              icon={Package}
              tone="amber"
              firstHeader="Product"
              rows={data!.byProduct}
              keyOf={(r: WinRateProductRow) => r.product}
              labelOf={(r: WinRateProductRow) => r.product}
              emptyText="No products with closed deals."
            />
          </div>
        )}
      </div>
    </PermissionPageGuard>
  );
}

interface WinRateRowLike {
  won: number;
  lost: number;
  winRate: number | null;
}

function WinRateTable<T extends WinRateRowLike>({
  title,
  icon,
  tone,
  firstHeader,
  rows,
  keyOf,
  labelOf,
  emptyText,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: 'blue' | 'indigo' | 'amber';
  firstHeader: string;
  rows: T[];
  keyOf: (row: T) => string | number;
  labelOf: (row: T) => string;
  emptyText: string;
}) {
  return (
    <Card className="p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-6 pt-6">
        <SectionHeader icon={icon} title={title} tone={tone} />
      </div>
      {rows.length === 0 ? (
        <div className="px-6 pb-6">
          <p className="py-4 text-center text-sm text-gray-400">{emptyText}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                <th className="px-6 py-3">{firstHeader}</th>
                <th className="px-4 py-3 text-right">Won</th>
                <th className="px-4 py-3 text-right">Lost</th>
                <th className="px-6 py-3 text-right">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((r) => {
                const badge = rateBadge(r.winRate);
                return (
                  <tr key={keyOf(r)} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{labelOf(r)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {r.won}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-rose-600 dark:text-rose-400">
                      {r.lost}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Badge variant={badge.variant}>{badge.text}</Badge>
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

function WinRateSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-2xl lg:col-span-1" />
        <Skeleton className="h-56 rounded-2xl lg:col-span-2" />
      </div>
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}
