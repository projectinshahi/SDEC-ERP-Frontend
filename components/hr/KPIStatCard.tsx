'use client';

import { LucideIcon } from 'lucide-react';

export interface KPIStatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'violet' | 'sky' | 'teal' | 'orange' | 'pink';
  loading?: boolean;
}

const VARIANT_MAP: Record<string, { icon: string; badge: string; accent: string }> = {
  blue:    { icon: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',    badge: 'text-blue-600 dark:text-blue-400',    accent: 'from-blue-500' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300', badge: 'text-emerald-600 dark:text-emerald-400', accent: 'from-emerald-500' },
  amber:   { icon: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300',   badge: 'text-amber-600 dark:text-amber-400',   accent: 'from-amber-500' },
  rose:    { icon: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300',     badge: 'text-rose-600 dark:text-rose-400',     accent: 'from-rose-500' },
  indigo:  { icon: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300', badge: 'text-indigo-600 dark:text-indigo-400', accent: 'from-indigo-500' },
  violet:  { icon: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300', badge: 'text-blue-600 dark:text-blue-400', accent: 'from-blue-500' },
  sky:     { icon: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300',       badge: 'text-sky-600 dark:text-sky-400',       accent: 'from-sky-500' },
  teal:    { icon: 'bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300',     badge: 'text-teal-600 dark:text-teal-400',     accent: 'from-teal-500' },
  orange:  { icon: 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300', badge: 'text-orange-600 dark:text-orange-400', accent: 'from-orange-500' },
  pink:    { icon: 'bg-pink-50 text-pink-600 dark:bg-pink-950/50 dark:text-pink-300',     badge: 'text-pink-600 dark:text-pink-400',     accent: 'from-pink-500' },
};

/** Determine font size class based on value string length to prevent overflow */
function getValueClass(value: string | number): string {
  const str = String(value);
  if (str.length > 9) return 'text-lg font-bold';
  if (str.length > 6) return 'text-xl font-bold';
  return 'text-2xl font-bold';
}

export function KPIStatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue',
  loading = false,
}: KPIStatCardProps) {
  const v = VARIANT_MAP[variant] ?? VARIANT_MAP.blue;
  const valueClass = getValueClass(value);

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 p-5 h-28 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1 pr-4">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-3" />
            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-3/4 mt-2" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="
      group relative overflow-hidden rounded-2xl
      border border-gray-200 dark:border-gray-850
      bg-white dark:bg-gray-900
      p-5 h-28
      shadow-sm hover:shadow-md
      transition-shadow duration-200
      cursor-default
    ">
      <div className="flex items-start justify-between h-full">
        {/* Text content */}
        <div className="flex flex-col justify-between h-full min-w-0 flex-1 pr-3">
          {/* Label */}
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate leading-none">
            {label}
          </p>

          {/* Value — font scales dynamically */}
          <p className={`${valueClass} text-gray-900 dark:text-white tracking-tight leading-none mt-1 tabular-nums`}>
            {value}
          </p>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 leading-none mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Icon badge */}
        <div className={`
          w-10 h-10 rounded-xl shrink-0
          flex items-center justify-center
          transition-colors duration-200
          ${v.icon}
        `}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}