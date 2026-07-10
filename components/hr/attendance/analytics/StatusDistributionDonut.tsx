'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { Card } from '@/components/Card';
import { SectionHeader } from '@/components/sales-reports-exec/reportShared';
import type { StatusDistribution } from '@/lib/hr/attendanceAnalytics.types';

const STATUS_COLOR: Record<string, string> = {
  present: '#10b981',
  late: '#f59e0b',
  late_after_lunch: '#f97316',
  leave_full_day: '#3b82f6',
  leave_half_day: '#0ea5e9',
  absent: '#f43f5e',
};
const FALLBACK = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];
const colorFor = (status: string, i: number) => STATUS_COLOR[status] ?? FALLBACK[i % FALLBACK.length];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-900">
      <span className="font-semibold text-gray-900 dark:text-white">{p.label}</span>
      <span className="text-gray-600 dark:text-gray-300"> — {p.count} ({p.pct}%)</span>
    </div>
  );
}

export function StatusDistributionDonut({ distribution }: { distribution: StatusDistribution }) {
  const data = distribution.segments;
  const empty = data.length === 0 || distribution.total === 0;

  return (
    <Card className="p-5">
      <SectionHeader icon={PieIcon} title="Status Distribution" tone="violet" />
      {empty ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">No data</div>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative h-56 w-56 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={62} outerRadius={90} paddingAngle={2}>
                  {data.map((s, i) => (
                    <Cell key={s.status} fill={colorFor(s.status, i)} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black tabular-nums text-gray-900 dark:text-white">{distribution.total}</span>
              <span className="text-[11px] font-medium text-gray-400">records</span>
            </div>
          </div>
          <ul className="w-full flex-1 space-y-2">
            {data.map((s, i) => (
              <li key={s.status} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorFor(s.status, i) }} />
                  <span className="truncate text-gray-700 dark:text-gray-200">{s.label}</span>
                </span>
                <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                  {s.count} · {s.pct}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
