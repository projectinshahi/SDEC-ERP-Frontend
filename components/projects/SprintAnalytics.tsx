'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/api-client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';
import { 
  Activity, CheckCircle, Clock, AlertTriangle, Layers, Zap, Loader2, ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/Card';

interface SprintAnalyticsProps {
  projectId: string;
}

export function SprintAnalytics({ projectId }: SprintAnalyticsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get<any>(`/projects/${projectId}/sprint-analytics`);
        setData(res.data);
      } catch (err: any) {
        console.error('Failed to load sprint analytics:', err);
        setError(err.message || 'Failed to load sprint analytics');
      } finally {
        setLoading(false);
      }
    };
    if (projectId) fetchAnalytics();
  }, [projectId]);

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium tracking-wide">Aggregating Sprint Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h3 className="text-red-700 dark:text-red-400 font-semibold">Failed to Load Analytics</h3>
        <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">{error}</p>
      </div>
    );
  }

  if (!data || data.overview.totalSprints === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
          <Layers className="w-8 h-8 text-indigo-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">No Sprint Data Available</h3>
        <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm mb-6">
          There are no sprints associated with this project yet. Create your first sprint to unlock powerful analytics and tracking.
        </p>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-md shadow-indigo-600/20">
          Create Your First Sprint
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const {
    overview,
    sprintProgress,
    sprintStatusDistribution,
    teamContribution,
    workloadDistribution,
    sprintVelocity,
    health,
    recentActivity
  } = data;

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const STATUS_COLORS = {
    backlog: '#94a3b8',
    todo: '#cbd5e1',
    inProgress: '#3b82f6',
    review: '#f59e0b',
    done: '#10b981'
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'Healthy': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
      case 'At Risk': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
      case 'Critical': return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1: Total Sprints */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col hover:border-indigo-300 transition-colors group">
          <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
            <Layers className="w-4 h-4 group-hover:text-indigo-500 transition-colors" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sprints</span>
          </div>
          <span className="text-3xl font-bold text-slate-800 dark:text-white mt-auto">{overview.totalSprints}</span>
        </div>

        {/* Card 2: Active Sprint */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col hover:border-indigo-300 transition-colors group">
          <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
            <Activity className="w-4 h-4 group-hover:text-indigo-500 transition-colors" />
            <span className="text-xs font-semibold uppercase tracking-wider">Active Sprint</span>
          </div>
          <span className="text-lg font-bold text-slate-800 dark:text-white mt-auto truncate" title={overview.activeSprintName || 'No Active Sprint'}>
            {overview.activeSprintName || 'No Active Sprint'}
          </span>
        </div>

        {/* Card 3: Completion Rate */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col hover:border-emerald-300 transition-colors group relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <CheckCircle className="w-4 h-4 group-hover:text-emerald-500 transition-colors" />
              <span className="text-xs font-semibold uppercase tracking-wider">Completion</span>
            </div>
          </div>
          <div className="flex items-end gap-2 mt-auto">
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{overview.completionRate}%</span>
          </div>
          {/* Background Progress Bar */}
          <div className="absolute bottom-0 left-0 h-1 bg-emerald-500" style={{ width: `${overview.completionRate}%` }} />
        </div>

        {/* Card 4: Total Tasks */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col hover:border-blue-300 transition-colors group">
          <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
            <Layers className="w-4 h-4 group-hover:text-blue-500 transition-colors" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tasks</span>
          </div>
          <span className="text-3xl font-bold text-slate-800 dark:text-white mt-auto">{overview.totalTasks}</span>
        </div>

        {/* Card 5: Completed Tasks */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col hover:border-emerald-300 transition-colors group">
          <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
            <CheckCircle className="w-4 h-4 group-hover:text-emerald-500 transition-colors" />
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
          </div>
          <span className="text-3xl font-bold text-slate-800 dark:text-white mt-auto">{overview.completedTasks}</span>
        </div>

        {/* Card 6: Overdue Tasks */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col hover:border-red-300 transition-colors group relative">
          <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
            <Clock className="w-4 h-4 group-hover:text-red-500 transition-colors" />
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue</span>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">{overview.overdueTasks}</span>
            {overview.overdueTasks > 0 && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Charts Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Sprint Status Distribution */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Sprint Status Distribution
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sprintStatusDistribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="sprintName" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <RechartsTooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="backlog" name="Backlog" stackId="a" fill={STATUS_COLORS.backlog} radius={[0, 0, 4, 4]} />
                  <Bar dataKey="todo" name="To Do" stackId="a" fill={STATUS_COLORS.todo} />
                  <Bar dataKey="inProgress" name="In Progress" stackId="a" fill={STATUS_COLORS.inProgress} />
                  <Bar dataKey="review" name="Review" stackId="a" fill={STATUS_COLORS.review} />
                  <Bar dataKey="done" name="Done" stackId="a" fill={STATUS_COLORS.done} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sprint Velocity */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Sprint Velocity (Story Points)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sprintVelocity} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="sprintName" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <RechartsTooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="storyPoints" name="Story Points" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {sprintVelocity.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Sprint Progress Breakdown */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Sprint Progress Breakdown</h3>
            <div className="space-y-4">
              {sprintProgress.map((sprint: any) => (
                <div key={sprint.sprintId} className="group">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{sprint.sprintName}</span>
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{sprint.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-2.5 rounded-full transition-all duration-1000 ease-out group-hover:bg-indigo-400"
                      style={{ width: `${sprint.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-slate-500">
                    <span>{sprint.startDate || 'No Start Date'}</span>
                    <span>{sprint.endDate || 'No End Date'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Sidebar Area */}
        <div className="space-y-6">
          
          {/* Health Indicator */}
          <div className={`p-6 rounded-xl border ${getHealthColor(health.status)} transition-colors flex flex-col items-center justify-center text-center`}>
            <h3 className="text-sm font-bold uppercase tracking-wider opacity-80 mb-2">Project Health</h3>
            <span className="text-4xl font-extrabold mb-4">{health.status}</span>
            <div className="w-full grid grid-cols-2 gap-4 mt-2 border-t border-current/10 pt-4">
              <div>
                <p className="text-xs opacity-80 mb-1">Completion</p>
                <p className="text-lg font-bold">{health.completionRate}%</p>
              </div>
              <div>
                <p className="text-xs opacity-80 mb-1">Overdue</p>
                <p className="text-lg font-bold">{health.overdueRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Top Contributors */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Top Contributors</h3>
            <div className="space-y-4">
              {teamContribution.length > 0 ? teamContribution.slice(0, 5).map((member: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                      {member.userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">{member.userName}</span>
                  </div>
                  <span className="text-sm font-semibold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-300">
                    {member.completedTasks} Tasks
                  </span>
                </div>
              )) : (
                <p className="text-sm text-slate-500 italic text-center py-4">No completed tasks yet</p>
              )}
            </div>
          </div>

          {/* Workload Distribution */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Active Workload</h3>
            <div className="space-y-4">
              {workloadDistribution.length > 0 ? workloadDistribution.slice(0, 5).map((member: any, idx: number) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{member.userName}</span>
                    <span className="font-semibold text-slate-500">{member.activeTasks} Active</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, (member.activeTasks / 10) * 100)}%` }} // Arbitrary max 10 for visual scale
                    />
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500 italic text-center py-4">No active tasks</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.length > 0 ? recentActivity.slice(0, 5).map((activity: any, idx: number) => (
                <div key={idx} className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-700 pb-1">
                  <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                  <p className="text-xs text-slate-500 mb-0.5">
                    {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: true})}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-medium">{activity.actor}</span> {activity.action}
                  </p>
                </div>
              )) : (
                <p className="text-sm text-slate-500 italic text-center py-4">No recent sprint activity</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
