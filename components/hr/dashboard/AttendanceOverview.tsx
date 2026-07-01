'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity } from 'lucide-react';

interface AttendanceItem {
  name: string;
  value: number;
  color: string;
  percentage?: string;
}

interface AttendanceOverviewProps {
  data?: AttendanceItem[];
  loading?: boolean;
}

const COLORS = [
  { name: 'Present', color: '#22c55e' },
  { name: 'Absent', color: '#ef4444' },
  { name: 'Late', color: '#f59e0b' },
  { name: 'Leave', color: '#3b82f6' },
];

const FALLBACK_DATA: AttendanceItem[] = [
  { name: 'Present', value: 0, color: '#22c55e' },
  { name: 'Absent', value: 0, color: '#ef4444' },
  { name: 'Late', value: 0, color: '#f59e0b' },
  { name: 'Leave', value: 0, color: '#3b82f6' },
];

export function AttendanceOverview({ data, loading = false }: AttendanceOverviewProps) {
  const chartData = data && data.length > 0 ? data : FALLBACK_DATA;
  const total = chartData.reduce((acc, cur) => acc + cur.value, 0);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-850 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Activity size={14} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Attendance Overview</h2>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-9">Today's attendance split</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-5 flex flex-col items-center justify-center gap-5">
        {loading ? (
          <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse mx-auto" style={{ maxWidth: 160 }} />
        ) : (
          <>
            {/* Donut chart */}
            <div className="relative w-40 h-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={total === 0 ? [{ name: 'No data', value: 1, color: '#e5e7eb' }] : chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={total === 0 ? 0 : 2}
                    cornerRadius={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {(total === 0 ? [{ color: '#e5e7eb' }] : chartData).map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#f9fafb',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#f9fafb' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">{total}</span>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Total</span>
              </div>
            </div>

            {/* Legend */}
            <div className="w-full grid grid-cols-2 gap-2">
              {chartData.map((item) => {
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-850/80 px-3 py-2 bg-gray-50/60 dark:bg-gray-800/20"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 truncate">{item.name}</span>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 tabular-nums">{item.value}</span>
                      <span className="text-[10px] text-gray-450 dark:text-gray-500 block">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
