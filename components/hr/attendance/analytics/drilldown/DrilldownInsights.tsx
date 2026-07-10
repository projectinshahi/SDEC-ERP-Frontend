'use client';

import { CheckCircle2, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import type { EmployeeInsight, InsightType } from '@/lib/hr/attendanceAnalytics.types';

const STYLE: Record<InsightType, { icon: typeof Info; chip: string; ring: string }> = {
  positive: {
    icon: CheckCircle2,
    chip: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    ring: 'border-emerald-200 dark:border-emerald-900/40',
  },
  warning: {
    icon: AlertTriangle,
    chip: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    ring: 'border-amber-200 dark:border-amber-900/40',
  },
  critical: {
    icon: AlertOctagon,
    chip: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
    ring: 'border-rose-200 dark:border-rose-900/40',
  },
  info: {
    icon: Info,
    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    ring: 'border-slate-200 dark:border-slate-700',
  },
};

export function DrilldownInsights({ insights }: { insights: EmployeeInsight[] }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] text-gray-400">
        Rule-based insights derived from attendance <span className="font-medium">status</span> only.
      </p>
      {insights.map((ins) => {
        const s = STYLE[ins.type];
        const Icon = s.icon;
        return (
          <div
            key={ins.code}
            className={`flex gap-3 rounded-xl border bg-white p-3.5 dark:bg-gray-900 ${s.ring}`}
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.chip}`}>
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{ins.title}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{ins.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
