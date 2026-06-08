'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { fetchBugAnalytics, BugAnalyticsData } from '@/lib/api/bugs';
import { useToast } from '@/lib/hooks/useToast';
import { useProject } from '@/lib/context/ProjectContext';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Bug, AlertCircle, CheckCircle2, RotateCcw, Clock, Target, FolderDot } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function BugAnalyticsDashboard() {
  const { activeProject } = useProject();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BugAnalyticsData | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [activeProject]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetchBugAnalytics(activeProject?.id);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      toast('Failed to load bug analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!activeProject && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-gray-200">
        <FolderDot size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">No Active Project</h2>
        <p className="text-gray-500 mt-2">Please select a project to view bug analytics.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 h-32"></div>
        ))}
        <div className="bg-white p-6 rounded-xl border border-gray-100 h-96 lg:col-span-2"></div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 h-96 lg:col-span-2"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-3">
        <Target size={48} className="text-indigo-200 mb-2" />
        <h3 className="text-lg font-semibold text-gray-800">No Analytics Available</h3>
        <p className="text-gray-500 text-sm">Create bugs to generate analytics.</p>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Bugs', value: data.totalBugs, icon: Bug, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Open Bugs', value: data.openBugs, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'In Progress', value: data.inProgressBugs, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Closed Bugs', value: data.closedBugs, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Reopened', value: data.reopenedBugs, icon: RotateCcw, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} variant="outlined" className="p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{stat.title}</p>
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="outlined" className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 tracking-tight">Bug Trend (Last 30 Days)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trendAnalytics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="created" name="Created" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card variant="outlined" className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 tracking-tight">Status Distribution</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {data.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  itemStyle={{ fontWeight: 600 }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card variant="outlined" className="p-6">
          <h3 className="text-lg font-bold text-szlate-800 mb-6 tracking-tight">Assignee Workload</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.assigneeAnalytics} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }} width={80} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="count" name="Bugs Assigned" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card variant="outlined" className="p-6">
          <div className="grid grid-cols-2 gap-6 h-full">
            <div className="flex flex-col justify-center items-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Avg Resolution Time</h4>
              <p className="text-4xl font-black text-slate-800">{data.resolutionTimeAvgDays} <span className="text-lg font-bold text-slate-400">days</span></p>
            </div>
            <div className="flex flex-col justify-center items-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Reopen Rate</h4>
              <p className="text-4xl font-black text-rose-600">{data.reopenRate}%</p>
            </div>
            <div className="col-span-2 h-40">
              <h4 className="text-sm font-bold text-slate-700 mb-4 tracking-tight">Priority Distribution</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.priorityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val: string) => val ? val.charAt(0).toUpperCase() + val.slice(1) : ''} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={30}>
                    {data.priorityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
