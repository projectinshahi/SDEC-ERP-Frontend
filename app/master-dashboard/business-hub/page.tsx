'use client';

import Link from 'next/link';
import {
  FolderDot, Briefcase, Target, AlertTriangle, CalendarDays, LayoutGrid, Bug,
  ArrowUpRight, DollarSign, Users, TrendingUp, Activity,
} from 'lucide-react';
import { fetchMasterAnalytics } from '@/lib/api/masterDashboard';
import {
  useMasterResource, ModuleStateScreen, ModuleHeader, StatCard, ActivityFeed,
} from '@/components/master/MasterKit';
import { Card } from '@/components/Card';
import { formatINR } from '@/lib/utils/currency';
import { classNames } from '@/lib/utils';

export default function MasterBusinessHubPage() {
  const { data, status, errorMsg, reload } = useMasterResource(fetchMasterAnalytics);

  if (status !== 'ready' || !data) {
    return <ModuleStateScreen status={status} errorMsg={errorMsg} onRetry={reload} />;
  }

  const { stats, activities } = data;

  // Each workspace shows a LIVE metric pulled from the org-wide analytics —
  // never a static badge.
  const workspaces = [
    {
      title: 'Projects Workspace', description: 'Manage tasks, sprints, and project boards.',
      icon: Briefcase, color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50',
      href: '/dashboard/projects', metric: `${stats.projects.active} active`, sub: `${stats.projects.total} total`,
    },
    {
      title: 'Sales CRM', description: 'Lead tracking, deal pipelines, and conversions.',
      icon: Target, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
      href: '/dashboard/sales', metric: formatINR(stats.sales.pipelineValue), sub: `${stats.sales.openDeals} open deals`,
    },
    {
      title: 'Tickets & Blockers', description: 'System incidents and SLA tracking.',
      icon: AlertTriangle, color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
      href: '/dashboard/blockers', metric: `${stats.tickets.open} open`, sub: `${stats.tickets.critical} critical`,
    },
    {
      title: 'Meetings & Calendar', description: 'Unified meeting calendar across all modules.',
      icon: CalendarDays, color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/50',
      href: '/master-dashboard/meetings', metric: `${stats.meetings.upcoming} upcoming`, sub: `${stats.meetings.total} total`,
    },
    {
      title: 'Bug Tracking', description: 'Log and monitor software defects.',
      icon: Bug, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
      href: '/dashboard/bugs', metric: `${stats.bugs.open} open`, sub: `${stats.bugs.critical} critical`,
    },
    {
      title: 'Task Boards', description: 'Detailed Kanban boards for active sprints.',
      icon: LayoutGrid, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
      href: '/dashboard/tasks', metric: `${stats.users.total} members`, sub: 'across the org',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ModuleHeader
        icon={FolderDot}
        title="Business Hub"
        subtitle="Centralised command workspace — live organization snapshot with direct access to every departmental module."
        accent="bg-amber-600"
        shadow="shadow-amber-500/20"
        onRefresh={reload}
      />

      {/* Live org snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Revenue" value={stats.sales.revenue} format={formatINR} icon={DollarSign} tone="emerald" />
        <StatCard label="Pipeline" value={stats.sales.pipelineValue} format={formatINR} icon={TrendingUp} tone="blue" />
        <StatCard label="Active Projects" value={stats.projects.active} icon={Briefcase} tone="indigo" />
        <StatCard label="Open Tickets" value={stats.tickets.open} icon={AlertTriangle} tone="rose" alert={stats.tickets.critical > 0} />
        <StatCard label="Meetings" value={stats.meetings.upcoming} icon={CalendarDays} tone="violet" />
        <StatCard label="Team" value={stats.users.total} icon={Users} tone="amber" />
      </div>

      {/* Workspace launchpad */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-amber-500" /> Department Workspaces
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((ws) => (
            <Link key={ws.title} href={ws.href} className="group block h-full">
              <Card className="h-full p-6 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl hover:border-amber-300 dark:hover:border-amber-700/50 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className={classNames('w-12 h-12 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110', ws.color)}>
                      <ws.icon size={22} />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-amber-50 dark:group-hover:bg-amber-900/20 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      <ArrowUpRight size={16} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {ws.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{ws.description}</p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{ws.metric}</span>
                  <span className="text-xs font-medium text-slate-400">{ws.sub}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Cross-module activity */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" /> Organization Activity
        </h2>
        <ActivityFeed
          activities={activities}
          title="Live Cross-Module Feed"
          emptyLabel="No recent organization activity recorded."
          maxHeight="max-h-[420px]"
        />
      </div>
    </div>
  );
}
