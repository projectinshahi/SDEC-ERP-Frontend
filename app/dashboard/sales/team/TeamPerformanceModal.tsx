'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Users, Target, TrendingUp, DollarSign, CalendarClock, Activity, Trophy,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Skeleton } from '@/components/Skeleton';
import { useToast } from '@/lib/hooks/useToast';
import { fetchTeamPerformanceDetail } from '@/lib/api/salesDashboard';
import type { TeamPerformanceDetail } from '@/lib/types/salesDashboard';

interface TeamPerformanceModalProps {
  teamId: number | null;
  onClose: () => void;
}

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

function avatar(name: string) {
  const initials = name.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-emerald-500'];
  return { initials, color: colors[Math.abs(hash) % colors.length] };
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${tone || 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}

/** Drill-down: live performance breakdown for one team (overview, members, lead/
 *  deal/revenue/follow-up stats, recent activity). All from the live endpoint. */
export function TeamPerformanceModal({ teamId, onClose }: TeamPerformanceModalProps) {
  const { toast } = useToast();
  const [data, setData] = useState<TeamPerformanceDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (teamId == null) return;
    try {
      setLoading(true);
      setData(await fetchTeamPerformanceDetail(teamId));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load team performance', 'error');
    } finally {
      setLoading(false);
    }
  }, [teamId, toast]);

  useEffect(() => {
    if (teamId != null) load();
    else setData(null);
  }, [teamId, load]);

  const m = data?.metrics;
  const winRate = m && (m.wonDeals + m.lostDeals) > 0 ? Math.round((m.wonDeals / (m.wonDeals + m.lostDeals)) * 100) : 0;

  return (
    <Modal isOpen={teamId != null} onClose={onClose} title={data?.team?.name ? `${data.team.name} — Performance` : 'Team Performance'} size="lg">
      {loading || !m ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-500" /> Overview
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Performance Score" value={m.performanceScore} tone="text-indigo-600 dark:text-indigo-400" />
              <Stat label="Conversion Rate" value={`${m.conversionRate}%`} tone="text-emerald-600 dark:text-emerald-400" />
              <Stat label="Members (active)" value={`${m.totalMembers} (${m.activeMembers})`} />
              <Stat label="Team Lead" value={m.teamLead || '—'} />
            </div>
          </section>

          {/* Lead + Deal + Revenue + Follow-up stats */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-blue-500" /> Lead Statistics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Total Leads" value={m.totalLeads} />
                <Stat label="Converted" value={m.convertedLeads} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-violet-500" /> Deal Statistics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Total Deals" value={m.totalDeals} />
                <Stat label="Won / Lost" value={`${m.wonDeals} / ${m.lostDeals}`} />
                <Stat label="Win Rate" value={`${winRate}%`} />
                <Stat label="Deal Value" value={inr(m.totalDealValue)} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-emerald-500" /> Revenue
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <Stat label="Total Revenue (won)" value={inr(m.totalRevenue)} tone="text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <CalendarClock className="w-4 h-4 text-amber-500" /> Follow-up Statistics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Total" value={m.totalFollowups} />
                <Stat label="Completed" value={m.completedFollowups} />
                <Stat label="Pending" value={m.pendingFollowups} />
                <Stat label="Overdue" value={m.overdueFollowups} tone={m.overdueFollowups > 0 ? 'text-rose-600 dark:text-rose-400' : undefined} />
              </div>
            </div>
          </section>

          {/* Members */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-indigo-500" /> Members ({data!.perMember.length})
            </h3>
            {data!.perMember.length === 0 ? (
              <p className="text-sm text-gray-500">No members assigned to this team.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-2 font-medium text-gray-500">Member</th>
                      <th className="px-4 py-2 font-medium text-gray-500">Leads</th>
                      <th className="px-4 py-2 font-medium text-gray-500">Conv.</th>
                      <th className="px-4 py-2 font-medium text-gray-500">Deals (W)</th>
                      <th className="px-4 py-2 font-medium text-gray-500 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data!.perMember.map((pm) => {
                      const { initials, color } = avatar(pm.name);
                      return (
                        <tr key={pm.userId}>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${color}`}>{initials}</div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{pm.name}</p>
                                <p className="text-[11px] text-gray-400">{pm.role === 'team_lead' ? 'Team Lead' : 'BDE'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{pm.totalLeads}</td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{pm.convertedLeads}</td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{pm.totalDeals} ({pm.wonDeals})</td>
                          <td className="px-4 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{inr(pm.totalRevenue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recent activity */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-gray-400" /> Recent Activity
            </h3>
            {data!.recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity.</p>
            ) : (
              <ul className="space-y-3">
                {data!.recentActivity.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 break-words">{a.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {a.actor?.name ? `${a.actor.name} · ` : ''}
                        {new Date(a.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
