'use client';

import React from 'react';
import { Users, UserCheck, UserX, Clock, TrendingUp, CalendarOff } from 'lucide-react';
import { AttendanceStats } from '@/lib/hr/attendance.types';

interface AttendanceStatsProps {
  stats: AttendanceStats;
}

interface StatCard {
  label: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  colorClass: string;       // Tailwind accent color token prefix (e.g. "violet")
  bgClass: string;
  borderClass: string;
  textClass: string;
  iconBg: string;
}

export function AttendanceStatsRow({ stats }: AttendanceStatsProps) {
  const cards: StatCard[] = [
    {
      label: 'Total Employees',
      value: stats.totalEmployees,
      subtitle: 'Registered staff',
      icon: Users,
      colorClass: 'indigo',
      bgClass: 'bg-indigo-50 dark:bg-indigo-950/20',
      borderClass: 'border-indigo-100 dark:border-indigo-900/30',
      textClass: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    },
    {
      label: 'Present Today',
      value: stats.presentToday,
      subtitle: 'Checked in',
      icon: UserCheck,
      colorClass: 'emerald',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/20',
      borderClass: 'border-emerald-100 dark:border-emerald-900/30',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      label: 'Absent Today',
      value: stats.absentToday,
      subtitle: 'No check-in',
      icon: UserX,
      colorClass: 'rose',
      bgClass: 'bg-rose-50 dark:bg-rose-950/20',
      borderClass: 'border-rose-100 dark:border-rose-900/30',
      textClass: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-100 dark:bg-rose-900/30',
    },
    {
      label: 'Late Arrivals',
      value: stats.lateArrivals,
      subtitle: 'After 10:00 AM',
      icon: Clock,
      colorClass: 'amber',
      bgClass: 'bg-amber-50 dark:bg-amber-950/20',
      borderClass: 'border-amber-100 dark:border-amber-900/30',
      textClass: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'On Leave',
      value: stats.onLeave,
      subtitle: 'Approved absence',
      icon: CalendarOff,
      colorClass: 'blue',
      bgClass: 'bg-blue-50 dark:bg-blue-950/20',
      borderClass: 'border-blue-100 dark:border-blue-900/30',
      textClass: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Avg. Hours',
      value: stats.averageHours,
      subtitle: 'Per employee',
      icon: TrendingUp,
      colorClass: 'blue',
      bgClass: 'bg-blue-50 dark:bg-blue-950/20',
      borderClass: 'border-blue-100 dark:border-blue-900/30',
      textClass: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`rounded-2xl border ${card.borderClass} ${card.bgClass} p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 group`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                <Icon size={18} className={card.textClass} />
              </div>
            </div>
            <p className={`text-2xl font-black tabular-nums tracking-tight ${card.textClass}`}>
              {card.value}
            </p>
            <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mt-1 leading-snug">
              {card.label}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
              {card.subtitle}
            </p>
          </div>
        );
      })}
    </div>
  );
}
