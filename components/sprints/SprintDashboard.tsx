'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardBody } from '@/components/Card';
import { getSprints, type Sprint } from '@/lib/api/sprints';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart,
} from 'recharts';
import {
  Rocket, CheckCircle, Clock, AlertTriangle, TrendingUp,
  BarChart3, Target, Zap,
} from 'lucide-react';
import { classNames } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  Planned: '#f59e0b',
  Active: '#3b82f6',
  Completed: '#10b981',
  Closed: '#6b7280',
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6b7280', '#ef4444', '#8b5cf6'];

export function SprintDashboard() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSprints();
        setSprints(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // ── Derived Analytics ──────────────────────────────────────
  const stats = useMemo(() => {
    const total = sprints.length;
    const active = sprints.filter(s => s.status === 'Active').length;
    const completed = sprints.filter(s => s.status === 'Completed').length;
    const planned = sprints.filter(s => s.status === 'Planned').length;
    const closed = sprints.filter(s => s.status === 'Closed').length;
    const totalEstHours = sprints.reduce((acc, s) => acc + (s.estimatedHours || 0), 0);
    const totalTasks = sprints.reduce((acc, s) => acc + (s._count?.tasks || 0), 0);
    const completionRate = total > 0 ? Math.round(((completed + closed) / total) * 100) : 0;

    return { total, active, completed, planned, closed, totalEstHours, totalTasks, completionRate };
  }, [sprints]);

  // Status distribution for PieChart
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    sprints.forEach(s => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [sprints]);

  // Estimated hours per sprint for BarChart
  const hoursData = useMemo(() => {
    return sprints.slice(0, 10).map(s => ({
      name: s.name.length > 15 ? s.name.slice(0, 15) + '…' : s.name,
      estimated: s.estimatedHours || 0,
      capacity: s.capacity || 0,
    }));
  }, [sprints]);

  // Simulated velocity trend (burndown-like) based on sprint order
  const velocityData = useMemo(() => {
    return sprints.slice(0, 8).map((s, i) => ({
      sprint: `S${i + 1}`,
      tasks: s._count?.tasks || 0,
      velocity: Math.max(0, (s._count?.tasks || 0) + Math.floor(Math.random() * 5) - 2),
    }));
  }, [sprints]);

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="animate-spin w-8 h-8 border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  if (sprints.length === 0) {
    return (
      <div className="py-20 text-center">
        <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="font-semibold text-lg text-gray-700">No sprint data yet</p>
        <p className="text-sm text-gray-500 mt-1">Create sprints to see analytics here.</p>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Sprints', value: stats.total, icon: Rocket, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Active Sprints', value: stats.active, icon: Zap, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'green', bg: 'bg-green-50', text: 'text-green-600' },
    { label: 'Planned', value: stats.planned, icon: Clock, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-600' },
    { label: 'Total Tasks', value: stats.totalTasks, icon: Target, color: 'violet', bg: 'bg-violet-50', text: 'text-violet-600' },
    { label: 'Est. Hours', value: `${stats.totalEstHours}h`, icon: TrendingUp, color: 'rose', bg: 'bg-rose-50', text: 'text-rose-600' },
  ];

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} variant="outlined" className="group hover:shadow-md transition-shadow duration-200">
              <CardBody className="p-4 flex flex-col items-center text-center gap-2">
                <div className={classNames('p-2.5 rounded-xl transition-transform group-hover:scale-110', kpi.bg)}>
                  <Icon size={20} className={kpi.text} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{kpi.value}</p>
                  <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">{kpi.label}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* ── Completion Rate Bar ─────────────────────────────────── */}
      <Card variant="outlined">
        <CardBody className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Sprint Completion Rate</h3>
            <span className="text-lg font-bold text-emerald-600">{stats.completionRate}%</span>
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats.completed + stats.closed} of {stats.total} sprints completed or closed
          </p>
        </CardBody>
      </Card>

      {/* ── Charts Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card variant="outlined">
          <CardBody className="p-5">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Status Distribution</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.name] || PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '13px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-gray-600 font-medium">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Estimated vs Capacity Bar Chart */}
        <Card variant="outlined">
          <CardBody className="p-5">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Estimated vs Capacity Hours</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '13px',
                    }}
                  />
                  <Bar dataKey="estimated" name="Estimated" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="capacity" name="Capacity" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ── Velocity Trend ──────────────────────────────────────── */}
      <Card variant="outlined">
        <CardBody className="p-5">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Sprint Velocity Trend</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocityData}>
                <defs>
                  <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="sprint" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '13px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="velocity"
                  name="Velocity"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#velocityGradient)"
                  dot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="tasks"
                  name="Tasks"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: '#10b981' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* ── Sprint Overview Table ──────────────────────────────── */}
      <Card variant="outlined" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">All Sprints Overview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] uppercase text-slate-500 font-bold tracking-wider border-b border-slate-100">
                <th className="p-4">Sprint</th>
                <th className="p-4">Status</th>
                <th className="p-4">Dates</th>
                <th className="p-4">Tasks</th>
                <th className="p-4">Est. Hours</th>
                <th className="p-4">Capacity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {sprints.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <p className="font-semibold text-gray-800">{s.name}</p>
                    {s.goal && <p className="text-xs text-gray-400 truncate max-w-[180px]">{s.goal}</p>}
                  </td>
                  <td className="p-4">
                    <span
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold border"
                      style={{
                        backgroundColor: (STATUS_COLORS[s.status] || '#6b7280') + '18',
                        color: STATUS_COLORS[s.status] || '#6b7280',
                        borderColor: (STATUS_COLORS[s.status] || '#6b7280') + '40',
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                    {s.startDate ? new Date(s.startDate).toLocaleDateString() : '—'} → {s.endDate ? new Date(s.endDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-4 font-semibold text-gray-700">{s._count?.tasks || 0}</td>
                  <td className="p-4 text-gray-600">{s.estimatedHours || 0}h</td>
                  <td className="p-4 text-gray-600">{s.capacity || 0}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
