'use client';

import {
  Briefcase,
  Users,
  CalendarDays,
  UserCheck,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/Card';

const stats = [
  {
    label: 'Open Positions',
    value: 12,
    icon: Briefcase,
    color:
      'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
  },
  {
    label: 'Applicants',
    value: 84,
    icon: Users,
    color:
      'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300',
  },
  {
    label: 'Interviews',
    value: 18,
    icon: CalendarDays,
    color:
      'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
  },
  {
    label: 'Hired',
    value: 7,
    icon: UserCheck,
    color:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  {
    label: 'Avg Hiring Time',
    value: '12d',
    icon: Clock,
    color:
      'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
  },
];

export function RecruitmentStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <Card
            key={stat.label}
            hoverable
            className="p-5 rounded-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>

                <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>

              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.color}`}
              >
                <Icon size={20} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}