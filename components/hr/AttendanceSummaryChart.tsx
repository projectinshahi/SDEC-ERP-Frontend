'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/Card';
import { MOCK_ATTENDANCE_SUMMARY } from '@/lib/hr/mockData';

export function AttendanceSummaryChart() {
  const total = MOCK_ATTENDANCE_SUMMARY.reduce(
    (acc, curr) => acc + curr.value,
    0
  );

  return (
    <Card className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 h-full shadow-sm">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-850 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Attendance Summary
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Real-time attendance split
        </p>
      </div>

      <div className="p-6 flex flex-col lg:flex-row items-center gap-8">
        {/* Donut Chart */}
        <div className="relative w-52 h-52 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={MOCK_ATTENDANCE_SUMMARY}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={4}
                cornerRadius={8}
                dataKey="value"
              >
                {MOCK_ATTENDANCE_SUMMARY.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>

              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: 'none',
                  borderRadius: '14px',
                  color: '#f9fafb',
                  fontSize: '12px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                }}
                itemStyle={{ color: '#f9fafb' }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-28 h-28 rounded-full bg-white dark:bg-gray-950 shadow-sm border border-gray-100 dark:border-gray-850 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-gray-900 dark:text-white leading-none tabular-nums">
                {total}
              </span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-bold mt-1">
                Total
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-4">
          {MOCK_ATTENDANCE_SUMMARY.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-850 px-4 py-3 bg-gray-50/70 dark:bg-gray-800/20 hover:bg-gray-100 dark:hover:bg-gray-800/40 transition"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: item.color }}
                />

                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {item.name}
                </span>
              </div>

              <div className="text-right">
                <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                  {item.value}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {item.percentage}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}