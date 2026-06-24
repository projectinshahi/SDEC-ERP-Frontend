'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { apiClient } from '@/lib/api/api-client';
import { Target, Loader2 } from 'lucide-react';
import { classNames } from '@/lib/utils';

interface SprintStatsSidebarProps {
  projectId: string;
}

export function SprintStatsSidebar({ projectId }: SprintStatsSidebarProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    rate: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get<any>(`/projects/${projectId}/sprint-analytics`);
        if (res.data && res.data.sprintsList) {
          const sprints = res.data.sprintsList;
          const total = sprints.length;
          const active = sprints.filter((s: any) => s.status === 'Active' || s.status === 'In Progress').length;
          const completed = sprints.filter((s: any) => s.status === 'Completed' || s.status === 'Closed').length;
          const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

          setStats({ total, active, completed, rate });
        }
      } catch (err) {
        console.error('Failed to load sprint stats', err);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) fetchStats();
  }, [projectId]);

  if (loading) {
    return (
      <Card variant="outlined" className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm animate-pulse">
        <CardHeader className="border-b border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 flex items-center gap-2">
          <Target size={16} className="text-gray-400" />
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Sprint Summary</h3>
        </CardHeader>
        <CardBody className="p-5 flex justify-center">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="outlined" className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm">
      <CardHeader className="border-b border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 flex items-center gap-2">
        <Target size={16} className="text-indigo-500" />
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Sprint Summary</h3>
      </CardHeader>
      <CardBody className="p-5 space-y-5">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{stats.total}</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">Total</p>
          </div>
          <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.active}</p>
            <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mt-1">Active</p>
          </div>
          <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg">
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</p>
            <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mt-1">Completed</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completion Rate</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{stats.rate}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${stats.rate}%` }}
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
