'use client';

import React from 'react';
import { Briefcase, Users, CalendarDays, UserCheck, Clock } from 'lucide-react';
import { Card } from '@/components/Card';
import { ApiRecruitmentStats } from '@/lib/api/hr-recruitment';

interface RecruitmentStatsProps {
  stats: ApiRecruitmentStats;
}

export function RecruitmentStats({ stats }: RecruitmentStatsProps) {
  // Sum up all candidates across all stages for total applicants
  const totalApplicants = 
    stats.Applied + 
    stats.Screening + 
    stats.Interview + 
    stats.Offer + 
    stats.Hired + 
    stats.Rejected;

  const statCards = [
    {
      label: 'Open Positions',
      value: 12, // Keep static as requested
      icon: Briefcase,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
    },
    {
      label: 'Applicants',
      value: totalApplicants, // Sum of all candidates
      icon: Users,
      color: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300',
    },
    {
      label: 'Interviews',
      value: stats.Interview, // Interview stage candidates count
      icon: CalendarDays,
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
    },
    {
      label: 'Hired',
      value: stats.Hired, // Hired stage candidates count
      icon: UserCheck,
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    {
      label: 'Avg Hiring Time',
      value: '12d', // Keep static as requested
      icon: Clock,
      color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;

        return (
          <Card
            key={stat.label}
            className="p-5 rounded-2xl border border-gray-150 dark:border-gray-850 bg-white dark:bg-gray-900 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>

                <p className="text-2xl font-black mt-2 text-gray-950 dark:text-white tabular-nums tracking-tight">
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