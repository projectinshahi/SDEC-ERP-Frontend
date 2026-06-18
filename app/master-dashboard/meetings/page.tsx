'use client';

import Link from 'next/link';
import {
  CalendarDays, Clock, CheckCircle2, XCircle, Video, ArrowUpRight, PlayCircle,
} from 'lucide-react';
import { fetchMasterMeetings } from '@/lib/api/masterModules';
import {
  useMasterResource, ModuleStateScreen, ModuleHeader, StatCard,
  ChartCard, DonutChart, CategoryBars, AreaTrend, EmptyState, ActivityFeed,
} from '@/components/master/MasterKit';
import { Card } from '@/components/Card';

export default function MasterMeetingsPage() {
  const { data, status, errorMsg, reload } = useMasterResource(fetchMasterMeetings);

  if (status !== 'ready' || !data) {
    return <ModuleStateScreen status={status} errorMsg={errorMsg} onRetry={reload} />;
  }

  const { stats, charts, upcoming, activities } = data;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ModuleHeader
        icon={CalendarDays}
        title="Executive Calendar"
        subtitle="Organization-wide overview of every meeting schedule, client sync, and internal operation — live."
        accent="bg-violet-600"
        shadow="shadow-violet-500/20"
        onRefresh={reload}
        actions={
          <Link
            href="/dashboard/meetings"
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-bold shadow-md shadow-violet-500/20 transition-all flex items-center gap-2"
          >
            Open Full Calendar <ArrowUpRight size={16} />
          </Link>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <StatCard label="Upcoming" value={stats.upcoming} icon={Clock} tone="violet" />
        <StatCard label="Ongoing" value={stats.ongoing} icon={PlayCircle} tone="blue" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Cancelled" value={stats.cancelled} icon={XCircle} tone="rose" />
        <StatCard label="Total Scheduled" value={stats.total} icon={CalendarDays} tone="indigo" />
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Meeting Trends" subtitle="Volume · last 6 months" className="lg:col-span-1">
          <AreaTrend data={charts.trend} dataKey="value" color="#8b5cf6" height={220} />
        </ChartCard>
        <ChartCard title="By Status" subtitle="Across the organization">
          <DonutChart data={charts.statusDistribution} />
        </ChartCard>
        <ChartCard title="By Type" subtitle="Meeting categories">
          <CategoryBars data={charts.typeDistribution} />
        </ChartCard>
      </div>

      {/* Upcoming Agenda */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays className="text-violet-500 w-5 h-5" /> Upcoming Global Agenda
          </h2>
          <span className="text-sm font-semibold text-slate-500">Next {upcoming.length} scheduled</span>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No Upcoming Meetings"
              message="There are currently no meetings scheduled in the organization's global calendar."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Date &amp; Time</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Meeting</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Organizer</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {upcoming.map((meeting) => (
                    <tr key={meeting.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {new Date(meeting.meetingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">
                          {meeting.startTime} - {meeting.endTime}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white max-w-md truncate">{meeting.title}</p>
                        {meeting.project && <p className="text-xs text-slate-500 mt-0.5 truncate">{meeting.project.name}</p>}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 capitalize">
                          {meeting.meetingType.toLowerCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-700 dark:text-violet-400 text-xs font-bold">
                            {meeting.organizer?.name?.charAt(0) || '?'}
                          </div>
                          <span className="text-sm text-slate-600 dark:text-slate-400">{meeting.organizer?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {meeting.meetingLink ? (
                          <a
                            href={meeting.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
                            title="Join Meeting"
                          >
                            <Video size={16} />
                          </a>
                        ) : (
                          <span className="text-sm text-slate-400">No Link</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Meeting Activity */}
      <ActivityFeed
        activities={activities}
        title="Recent Meeting Activity"
        emptyLabel="No recent meeting activity recorded."
        maxHeight="max-h-[400px]"
      />
    </div>
  );
}
