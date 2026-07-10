'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Card } from '@/components/Card';
import { SectionHeader } from '@/components/sales-reports-exec/reportShared';
import type { AttendanceTrend } from '@/lib/hr/attendanceAnalytics.types';

function formatBucket(label: string, granularity: string): string {
  if (granularity === 'month') {
    const [y, m] = label.split('-');
    if (y && m) return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString([], { month: 'short', year: '2-digit' });
    return label;
  }
  const d = new Date(`${label}T00:00:00`);
  if (Number.isNaN(d.getTime())) return label;
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TrendTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-900">
      <p className="font-semibold text-gray-900 dark:text-white">{p.x}</p>
      <p className="mt-1 text-indigo-600 dark:text-indigo-400">Attendance: {p.attendancePct}%</p>
      <p className="text-gray-600 dark:text-gray-300">
        Present {p.present} · Absent {p.absent} · Late {p.late} · Leave {p.leave}
      </p>
    </div>
  );
}

export function AttendanceTrendChart({ trend }: { trend: AttendanceTrend }) {
  const data = trend.points.map((p) => ({ ...p, x: formatBucket(p.label, trend.granularity) }));
  const delta = trend.comparison?.deltaPct;

  return (
    <Card className="p-5">
      <SectionHeader
        icon={TrendingUp}
        title="Attendance Trend"
        tone="indigo"
        action={
          delta != null ? (
            <span className={`text-xs font-semibold ${delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs prev
            </span>
          ) : undefined
        }
      />
      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">No data for this range</div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
              <XAxis dataKey="x" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" width={46} />
              <Tooltip content={<TrendTooltip />} />
              <Area type="monotone" dataKey="attendancePct" stroke="#6366f1" strokeWidth={2} fill="url(#attGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
