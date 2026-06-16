'use client';

import { useState, useEffect, useCallback } from 'react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card } from '@/components/Card';
import { Trophy, Medal, Users, TrendingUp } from 'lucide-react';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchManagerWorkspace } from '@/lib/api/salesDashboard';
import type { ManagerWorkspace, TeamMember } from '@/lib/types/salesDashboard';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

function avatar(name: string) {
  const initials = name.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-emerald-500'];
  return { initials, color: colors[Math.abs(hash) % colors.length] };
}

const MEDAL = ['text-amber-500', 'text-gray-400', 'text-orange-600'];

export default function ManagerWorkspacePage() {
  const { toast } = useToast();
  const [data, setData] = useState<ManagerWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setData(await fetchManagerWorkspace());
    } catch {
      toast('Failed to load team performance', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        <div>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales' },
              { label: 'Team', href: '/dashboard/sales/team' },
            ]}
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">Manager Workspace</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Team performance, conversions and revenue leaderboard.</p>
        </div>

        {/* Leaderboards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Leaderboard
            title="Top by Revenue" icon={Trophy} loading={isLoading}
            members={data?.leaderboard.topRevenue ?? []}
            metric={(m) => inr(m.revenueGenerated)}
          />
          <Leaderboard
            title="Top by Conversion" icon={TrendingUp} loading={isLoading}
            members={data?.leaderboard.topConversion ?? []}
            metric={(m) => `${m.conversionRate}%`}
          />
        </div>

        {/* Team table */}
        <Card className="overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Team Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">BDE</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Leads</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Conversions</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Conv. Rate</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Meetings</th>
                  <th className="px-6 py-3 font-medium text-gray-500 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading…</td></tr>
                ) : !data || data.team.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No team activity yet.</td></tr>
                ) : (
                  data.team.map((m) => {
                    const { initials, color } = avatar(m.name);
                    return (
                      <tr key={m.ownerId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${color}`}>{initials}</div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{m.name}</p>
                              <p className="text-xs text-gray-400">{m.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{m.leadsAssigned}</td>
                        <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{m.conversions}</td>
                        <td className="px-6 py-3 font-semibold text-gray-900 dark:text-white">{m.conversionRate}%</td>
                        <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{m.meetingsCompleted}</td>
                        <td className="px-6 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{inr(m.revenueGenerated)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PermissionPageGuard>
  );
}

function Leaderboard({ title, icon: Icon, members, metric, loading }: {
  title: string; icon: React.ComponentType<{ size?: number; className?: string }>;
  members: TeamMember[]; metric: (m: TeamMember) => string; loading?: boolean;
}) {
  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-amber-500" />
        {title}
      </h3>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet.</p>
      ) : (
        <ul className="space-y-3">
          {members.map((m, i) => {
            const { initials, color } = avatar(m.name);
            return (
              <li key={m.ownerId} className="flex items-center gap-3">
                <span className={`w-6 text-center font-bold ${i < 3 ? MEDAL[i] : 'text-gray-400'}`}>
                  {i < 3 ? <Medal size={16} className="inline" /> : i + 1}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${color}`}>{initials}</div>
                <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{m.name}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{metric(m)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
