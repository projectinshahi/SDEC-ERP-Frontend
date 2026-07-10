'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Card } from '@/components/Card';
import { SectionHeader } from '@/components/sales-reports-exec/reportShared';
import type { DepartmentRankingResponse } from '@/lib/hr/attendanceAnalytics.types';

const barColor = (pct: number) => (pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#f43f5e');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DeptTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-900">
      <p className="font-semibold text-gray-900 dark:text-white">#{r.rank} {r.department}</p>
      <p className="mt-1 text-gray-600 dark:text-gray-300">Attendance {r.attendancePct}% · Absenteeism {r.absenteeismPct}%</p>
      <p className="text-gray-600 dark:text-gray-300">Headcount {r.headcount} · Present {r.present} · Absent {r.absent}</p>
      {r.deltaPct != null && (
        <p className={r.deltaPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
          {r.deltaPct >= 0 ? '▲' : '▼'} {Math.abs(r.deltaPct)}% vs prev
        </p>
      )}
    </div>
  );
}

export function DepartmentRankingChart({ data }: { data: DepartmentRankingResponse }) {
  const rows = data.departments;
  return (
    <Card className="p-5">
      <SectionHeader
        icon={BarChart3}
        title="Department Ranking"
        tone="blue"
        action={<span className="text-xs font-medium text-gray-400">Company avg {data.companyAvgAttendancePct}%</span>}
      />
      {rows.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">No data</div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 5, right: 10, left: -12, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
              <XAxis dataKey="department" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} height={54} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" width={46} />
              <Tooltip content={<DeptTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
              <ReferenceLine y={data.companyAvgAttendancePct} stroke="#9ca3af" strokeDasharray="4 4" />
              <Bar dataKey="attendancePct" radius={[6, 6, 0, 0]}>
                {rows.map((r) => (
                  <Cell key={r.department} fill={barColor(r.attendancePct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
