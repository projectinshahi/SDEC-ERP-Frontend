'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Activity, CheckCircle, Clock, AlertTriangle, Layers, Loader2, Calendar, User, Target
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/Card';
import { fetchBoardAnalytics, BoardAnalyticsFilters } from '@/lib/api/kanban';
import { classNames, formatDate } from '@/lib/utils';
import { SprintSelector } from '@/components/sprints/SprintSelector';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const PRIORITY_COLORS: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#10b981'
};

interface BoardAnalyticsProps {
  boardId: number;
  sprintId: string | null;
  sprints: any[];
}

export function BoardAnalytics({ boardId, sprintId, sprints }: BoardAnalyticsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Local filter states
  const [filterSprint, setFilterSprint] = useState<string | null>(sprintId);

  useEffect(() => {
    // If external sprintId changes (e.g. from the parent component), sync it
    setFilterSprint(sprintId);
  }, [sprintId]);

  useEffect(() => {
    let isMounted = true;
    
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const filters: BoardAnalyticsFilters = {
          sprintId: filterSprint
        };
        
        const res = await fetchBoardAnalytics(boardId, filters);
        if (isMounted) {
          setData(res);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Failed to load board analytics:', err);
          setError('Failed to load analytics data for this board.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (boardId) {
      loadAnalytics();
    }

    return () => { isMounted = false; };
  }, [boardId, filterSprint]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <h3 className="text-lg font-bold text-gray-700">Loading Board Analytics...</h3>
        <p className="text-sm text-gray-500">Gathering real-time insights</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-gray-700">Oops!</h3>
        <p className="text-sm text-gray-500 mt-2">{error}</p>
        <button onClick={() => setFilterSprint(filterSprint)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">
          Try Again
        </button>
      </div>
    );
  }

  if (!data || data.overview.totalTasks === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mt-4">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-600">
          <Activity size={24} className="text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">No Analytics Available</h3>
        <p className="text-sm text-gray-500 mt-2 max-w-sm">
          There are no tasks in this board yet (or for this sprint filter). Add some tasks to generate insights!
        </p>
      </div>
    );
  }

  const { overview, columnDistribution, priorityDistribution, assigneeWorkload, dueDateAnalytics, recentActivity, sprintAnalytics } = data;

  // Board Health UI Mapping
  const healthStyles: Record<string, { color: string; bg: string; border: string }> = {
    Healthy: { color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
    'At Risk': { color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
    Critical: { color: 'text-rose-600', bg: 'bg-rose-100', border: 'border-rose-200' },
  };
  const healthConfig = healthStyles[overview.healthScore] || { color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' };

  return (
    <div className="space-y-6 mt-4">
      {/* Filters Bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Filters:</span>
          <SprintSelector 
            sprints={sprints} 
            selectedSprintId={filterSprint} 
            onSelectSprint={setFilterSprint} 
            isLoading={loading} 
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-1.5 rounded-full border shadow-sm font-semibold text-sm"
             style={{ backgroundColor: `var(--tw-colors-${healthConfig.bg.replace('bg-', '')})`, color: `var(--tw-colors-${healthConfig.color.replace('text-', '')})`, borderColor: `var(--tw-colors-${healthConfig.border.replace('border-', '')})` }}>
          <span>Board Health:</span>
          <span className={classNames("px-2 py-0.5 rounded text-xs font-bold uppercase", healthConfig.color, healthConfig.bg)}>
            {overview.healthScore}
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card variant="outlined" className="bg-white dark:bg-gray-800 border-gray-200 shadow-sm relative overflow-hidden">
          <CardBody className="p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                <Layers size={18} />
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</span>
            </div>
            <span className="text-3xl font-bold text-slate-800 dark:text-white mt-auto">{overview.totalTasks}</span>
          </CardBody>
        </Card>

        <Card variant="outlined" className="bg-white dark:bg-gray-800 border-gray-200 shadow-sm">
          <CardBody className="p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                <CheckCircle size={18} />
              </span>
              <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Completed</span>
            </div>
            <div className="flex items-end justify-between mt-auto">
              <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{overview.completedTasks}</span>
              <span className="text-sm font-bold text-slate-400 mb-1">{overview.completionRate}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${overview.completionRate}%` }} />
            </div>
          </CardBody>
        </Card>

        <Card variant="outlined" className="bg-white dark:bg-gray-800 border-gray-200 shadow-sm">
          <CardBody className="p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                <Activity size={18} />
              </span>
              <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Active</span>
            </div>
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-auto">{overview.activeTasks}</span>
          </CardBody>
        </Card>

        <Card variant="outlined" className="bg-white dark:bg-gray-800 border-gray-200 shadow-sm relative overflow-hidden group">
          <div className={classNames("absolute inset-0 opacity-10 transition-opacity", overview.overdueTasks > 0 ? "bg-red-500 group-hover:opacity-20" : "hidden")} />
          <CardBody className="p-5 flex flex-col h-full relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                <Clock size={18} />
              </span>
              <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider">Overdue</span>
            </div>
            <div className="flex items-center gap-3 mt-auto">
              <span className="text-3xl font-bold text-red-600 dark:text-red-400">{overview.overdueTasks}</span>
              {overview.overdueTasks > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>
          </CardBody>
        </Card>

        <Card variant="outlined" className="bg-white dark:bg-gray-800 border-gray-200 shadow-sm md:col-span-1">
          <CardBody className="p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                <Target size={18} />
              </span>
              <span className="text-[11px] font-bold text-purple-500 uppercase tracking-wider">Est. Points</span>
            </div>
            <span className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-auto">{overview.totalEstimatedPoints ?? 0}</span>
          </CardBody>
        </Card>

        <Card variant="outlined" className="bg-white dark:bg-gray-800 border-gray-200 shadow-sm md:col-span-1">
          <CardBody className="p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <span className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                <User size={18} />
              </span>
              <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">Capacity</span>
            </div>
            <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-auto">{overview.teamCapacity ?? 0}</span>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Charts - Column Distribution */}
        <Card variant="outlined" className="lg:col-span-2 bg-white dark:bg-gray-800 border-gray-200 shadow-sm">
          <CardHeader>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Layers size={18} className="text-indigo-500" />
              Column Distribution
            </h3>
          </CardHeader>
          <CardBody className="h-72 w-full p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={columnDistribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>
                  {columnDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Priority & Due Dates */}
        <div className="space-y-6">
          <Card variant="outlined" className="bg-white dark:bg-gray-800 border-gray-200 shadow-sm">
            <CardHeader>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                Priority Distribution
              </h3>
            </CardHeader>
            <CardBody className="h-48 w-full p-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {priorityDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card variant="outlined" className="bg-white dark:bg-gray-800 border-gray-200 shadow-sm">
            <CardHeader>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Calendar size={18} className="text-blue-500" />
                Due Dates Overview
              </h3>
            </CardHeader>
            <CardBody className="p-4 space-y-4">
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">Overdue</span>
                <span className="text-base font-bold text-red-700 dark:text-red-300">{dueDateAnalytics.overdue}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Due Today</span>
                <span className="text-base font-bold text-amber-700 dark:text-amber-300">{dueDateAnalytics.dueToday}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Due This Week</span>
                <span className="text-base font-bold text-blue-700 dark:text-blue-300">{dueDateAnalytics.dueThisWeek}</span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignee Workload */}
        <Card variant="outlined" className="bg-white dark:bg-gray-800 border-gray-200 shadow-sm">
          <CardHeader>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <User size={18} className="text-teal-500" />
              Assignee Workload
            </h3>
          </CardHeader>
          <CardBody className="p-0">
            {assigneeWorkload.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">No tasks are currently assigned.</div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {assigneeWorkload.map((assignee: any, idx: number) => (
                    <li key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                          {assignee.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{assignee.name}</span>
                      </div>
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-xs font-bold text-slate-700 dark:text-slate-300">
                        {assignee.tasks} tasks
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card variant="outlined" className="bg-white dark:bg-gray-800 border-gray-200 shadow-sm">
          <CardHeader>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Activity size={18} className="text-emerald-500" />
              Recent Board Activity
            </h3>
          </CardHeader>
          <CardBody className="p-0">
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">No recent activity found.</div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentActivity.map((act: any, idx: number) => (
                    <li key={idx} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{act.actor}</span>
                        {' '} {act.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(act.timestamp, 'long')}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
