'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { Users, Flame, TrendingUp, CheckCircle2, MessageSquare } from 'lucide-react';
import { Card } from '@/components/Card';
import { StatCard } from '@/components/dashboard/StatCard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchLeadOverviewAnalytics } from '@/lib/api/leadQualification';
import { temperatureLabel } from '@/lib/data/leadTemperature';
import type { LeadOverviewAnalytics } from '@/lib/types/leadQualification';

const INTERACTION_COLORS: Record<string, string> = {
  Call: '#3b82f6',
  Email: '#f59e0b',
  Meeting: '#10b981',
};
const TEMPERATURE_COLORS: Record<string, string> = {
  Hot: '#ef4444',
  Warm: '#f59e0b',
  Cold: '#3b82f6',
};
const BAR_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

/** Lead qualification & follow-up analytics: scores, BDE load, conversion, follow-ups, interactions. */
export function LeadAnalyticsDashboard() {
  const { toast } = useToast();
  const [data, setData] = useState<LeadOverviewAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setData(await fetchLeadOverviewAnalytics());
    } catch {
      setIsError(true);
      toast('Failed to load lead analytics', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const bdeData = (data?.leadsPerBde ?? []).slice(0, 8).map((b) => ({ name: b.name, leads: b.leads }));
  const interactionData = (data?.interactions.byType ?? [])
    .filter((i) => i.count > 0)
    .map((i) => ({ name: i.type, value: i.count }));
  const temperatureData = (data?.temperatureDistribution ?? [])
    .filter((r) => r.count > 0)
    .map((r) => ({ name: temperatureLabel(r.temperature), value: r.count }));

  return (
    <div className="space-y-6">
      {/* Stat tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <StatCard
          label="Total Leads" value={data?.totalLeads ?? 0} icon={Users} variant="primary"
          isLoading={isLoading} isError={isError} onRetry={load}
        />
        <StatCard
          label="Hot Leads" value={data?.hotLeads ?? 0} icon={Flame} variant="warning"
          isLoading={isLoading} isError={isError} onRetry={load}
        />
        <StatCard
          label="Conversion Rate" value={data ? `${data.conversionRate}%` : '0%'} icon={TrendingUp} variant="success"
          isLoading={isLoading} isError={isError} onRetry={load}
        />
        <StatCard
          label="Follow-up Completion" value={data ? `${data.followUp.completionRate}%` : '0%'} icon={CheckCircle2} variant="warning"
          isLoading={isLoading} isError={isError} onRetry={load}
        />
        <StatCard
          label="Interactions" value={data?.interactions.total ?? 0} icon={MessageSquare} variant="info"
          isLoading={isLoading} isError={isError} onRetry={load}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads per BDE */}
        <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Leads per BDE</h3>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : bdeData.length === 0 ? (
            <p className="text-sm text-gray-500">No assigned leads yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={bdeData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" allowDecimals={false} stroke="#9ca3af" fontSize={12} />
                <YAxis type="category" dataKey="name" width={100} stroke="#9ca3af" fontSize={12} />
                <Tooltip />
                <Bar dataKey="leads" name="Leads" radius={[0, 4, 4, 0]}>
                  {bdeData.map((entry, i) => (
                    <Cell key={entry.name} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Interaction volume */}
        <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Interaction Volume</h3>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : interactionData.length === 0 ? (
            <p className="text-sm text-gray-500">No interactions logged yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={interactionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {interactionData.map((entry, i) => (
                    <Cell key={entry.name} fill={INTERACTION_COLORS[entry.name] || BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Lead temperature distribution */}
      <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Lead Temperature Distribution</h3>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : temperatureData.length === 0 ? (
          <p className="text-sm text-gray-500">No leads yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={temperatureData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
              <YAxis allowDecimals={false} stroke="#9ca3af" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" name="Leads" radius={[4, 4, 0, 0]}>
                {temperatureData.map((entry) => (
                  <Cell key={entry.name} fill={TEMPERATURE_COLORS[entry.name] || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Follow-up summary */}
      <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Follow-up Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Summary label="Total" value={data?.followUp.total ?? 0} />
          <Summary label="Completed" value={data?.followUp.completed ?? 0} />
          <Summary label="Pending" value={data?.followUp.pending ?? 0} />
          <Summary label="Completion Rate" value={`${data?.followUp.completionRate ?? 0}%`} />
        </div>
      </Card>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}
