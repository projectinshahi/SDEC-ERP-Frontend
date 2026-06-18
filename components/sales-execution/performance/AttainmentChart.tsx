'use client';

/**
 * Lightweight horizontal-ish bar chart of attainment % per member/team.
 * Bar colour follows the same attainment tone scale as the badges.
 */

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from 'recharts';
import { Card } from '@/components/Card';
import { SectionHeader, attainmentHex, type PerfTone } from './perfShared';
import { BarChart3 } from 'lucide-react';

export interface AttainmentChartDatum {
  name: string;
  pct: number;
}

export function AttainmentChart({
  data,
  title,
  tone = 'violet',
}: {
  data: AttainmentChartDatum[];
  title: string;
  tone?: PerfTone;
}) {
  if (!data.length) return null;

  const chartData = data.map((d) => ({ name: d.name, pct: Math.round(d.pct || 0) }));

  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <SectionHeader icon={BarChart3} title={title} tone={tone} />
      <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 26 + 40)}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={chartData.length > 6 ? -25 : 0} textAnchor={chartData.length > 6 ? 'end' : 'middle'} height={chartData.length > 6 ? 48 : 24} />
          <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={36} unit="%" />
          <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} formatter={(v) => [`${v}%`, 'Attainment']} />
          <ReferenceLine y={100} stroke="#10b981" strokeDasharray="4 4" />
          <Bar dataKey="pct" name="Attainment" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {chartData.map((d) => (
              <Cell key={d.name} fill={attainmentHex(d.pct)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
