'use client';

import { Phone, Users, CheckCircle2, Percent, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Card } from '@/components/Card';
import type { BdeDashboard } from '@/lib/types/salesExecution';

interface ProductivityCardProps {
  productivity: BdeDashboard['productivity'];
}

const TILES = [
  { key: 'callsCompleted', label: 'Calls Completed', icon: Phone, tone: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300', barColor: '#3b82f6' },
  { key: 'meetingsCompleted', label: 'Meetings Completed', icon: Users, tone: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300', barColor: '#8b5cf6' },
  { key: 'followUpsCompleted', label: 'Follow-ups Completed', icon: CheckCircle2, tone: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300', barColor: '#10b981' },
] as const;

/**
 * BDE productivity snapshot: calls / meetings / follow-ups completed + conversion rate,
 * with a lightweight bar chart of the three counts.
 */
export function ProductivityCard({ productivity }: ProductivityCardProps) {
  const conversionRate = Math.round(productivity.conversionRate || 0);

  const chartData = TILES.map((t) => ({
    name: t.label.replace(' Completed', ''),
    value: productivity[t.key] || 0,
    color: t.barColor,
  }));

  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300">
          <Activity size={20} />
        </span>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">My Productivity</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TILES.map(({ key, label, icon: Icon, tone }) => (
          <div key={key} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4">
            <span className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
              <Icon size={18} />
            </span>
            <p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{productivity[key] || 0}</p>
            <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          </div>
        ))}
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-4">
          <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300">
            <Percent size={18} />
          </span>
          <p className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">{conversionRate}%</p>
          <p className="mt-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">Conversion Rate</p>
        </div>
      </div>

      <div className="mt-5">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={28} />
            <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
            <Bar dataKey="value" name="Completed" radius={[6, 6, 0, 0]} maxBarSize={48}>
              {chartData.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
