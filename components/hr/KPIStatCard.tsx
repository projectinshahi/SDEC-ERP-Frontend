'use client';

import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/Card';

export interface KPIStatCardProps {
  label: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'violet' | 'sky' | 'teal';
}

const VARIANTS: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300',
  teal: 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300',
};

export function KPIStatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue',
}: KPIStatCardProps) {
  return (
    <Card
      hoverable
      className="
        relative overflow-hidden p-5
        bg-gradient-to-b from-white to-gray-50/60
        dark:from-gray-900 dark:to-gray-950
        border border-gray-200 dark:border-gray-800
        shadow-sm hover:shadow-lg
        transition-all duration-300
        group
      "
    >
      {/* Top Accent Strip */}
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700" />

      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
            {label}
          </p>

          <p className="text-3xl font-black text-gray-900 dark:text-white mt-3 tracking-tight leading-none tabular-nums">
            {value}
          </p>

          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-3 truncate">
            {subtitle}
          </p>
        </div>

        <div
          className={`
            w-12 h-12 rounded-2xl
            flex items-center justify-center
            shrink-0
            border border-current/10
            shadow-sm
            transition-transform duration-300
            group-hover:scale-110
            ${VARIANTS[variant]}
          `}
        >
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}