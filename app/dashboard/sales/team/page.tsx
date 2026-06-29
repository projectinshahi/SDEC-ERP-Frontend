'use client';

/**
 * Sales → Team (consolidated). A single Team Management destination with two
 * tabs:
 *   • Teams       — CRUD management (create / edit / archive teams + membership),
 *                   gated by `sales.team.manage`. (Formerly /dashboard/sales/teams.)
 *   • Performance — read-only manager workspace (leaderboards + team KPIs).
 * The old /dashboard/sales/teams route now redirects here.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users, Plus, Archive, ArchiveRestore, Pencil, ChevronRight, UserRound,
  Trophy, Medal, TrendingUp, LayoutGrid, BarChart3, Trash2,
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { TeamFormModal } from '@/components/sales-execution/teams/TeamFormModal';
import { TeamDetailModal } from '@/components/sales-execution/teams/TeamDetailModal';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { fetchTeams, archiveTeam, unarchiveTeam, deleteTeam } from '@/lib/api/salesTeams';
import { fetchTeamPerformance } from '@/lib/api/salesDashboard';
import { TeamPerformanceModal } from './TeamPerformanceModal';
import { classNames } from '@/lib/utils';
import type { SalesTeam } from '@/lib/types/salesExecution';
import type { TeamPerformance } from '@/lib/types/salesDashboard';

type Tab = 'teams' | 'performance';

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

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'teams', label: 'Teams', icon: LayoutGrid },
  { key: 'performance', label: 'Performance', icon: BarChart3 },
];

export default function TeamPage() {
  const [tab, setTab] = useState<Tab>('teams');

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales' },
              { label: 'Team', href: '/dashboard/sales/team' },
            ]}
          />
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Team Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Organise your sales teams and track their performance — all in one place.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={classNames(
                  'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
                  active
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>

        {tab === 'teams' ? <TeamsManagement /> : <PerformanceSection />}
      </div>
    </PermissionPageGuard>
  );
}

/* ═══════════════════════════ Teams management ═════════════════════════════ */

function StatTile({
  label, value, icon: Icon, tone,
}: {
  label: string; value: number; icon: React.ComponentType<{ size?: number; className?: string }>; tone: string;
}) {
  return (
    <Card variant="outlined" className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <Icon size={16} className={tone} />
      </div>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
    </Card>
  );
}

function TeamsManagement() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('sales.team.manage');
  // Team deletion is its own independent permission (full team managers qualify
  // too). Hard delete is dependency-validated server-side.
  const canDeleteTeam = hasPermission('sales.teams.delete') || canManage;

  // Hold ALL teams (including archived) so the stats are accurate; the
  // "Show archived" toggle filters the displayed grid client-side.
  const [teams, setTeams] = useState<SalesTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<SalesTeam | null>(null);
  const [detailTeamId, setDetailTeamId] = useState<number | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setTeams(await fetchTeams(true));
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to load teams', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingTeam(null);
    setFormOpen(true);
  };

  const openEdit = (team: SalesTeam) => {
    setEditingTeam(team);
    setFormOpen(true);
  };

  const handleArchive = async (team: SalesTeam) => {
    const ok = await confirm({
      title: 'Archive team',
      message: `Archive "${team.name}"? It will be hidden from the active list but its members and history are kept.`,
      confirmLabel: 'Archive',
      intent: 'danger',
    });
    if (!ok) return;

    try {
      setArchivingId(team.id);
      await archiveTeam(team.id);
      toast('Team archived', 'success');
      await load();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to archive team', 'error');
    } finally {
      setArchivingId(null);
    }
  };

  // Restore an archived team to active. Flips the flag on the existing team —
  // members, targets, tasks and history are preserved (no recreate). Reload so
  // it moves from the archived set into the active list with no page refresh.
  const handleUnarchive = async (team: SalesTeam) => {
    const ok = await confirm({
      title: 'Restore Team',
      message: `Are you sure you want to restore "${team.name}"? The team and its members will become active again.`,
      confirmLabel: 'Restore',
      intent: 'primary',
    });
    if (!ok) return;

    try {
      setRestoringId(team.id);
      await unarchiveTeam(team.id);
      toast('Team restored', 'success');
      await load();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to restore team', 'error');
    } finally {
      setRestoringId(null);
    }
  };

  // Permanently delete a team. Dependency validation: a team with members still
  // assigned can't be deleted — give immediate feedback for that common case
  // (the backend is authoritative and ALSO blocks on linked targets). On success
  // reload so the list, stats and dropdowns reflect the removal with no refresh.
  const handleDelete = async (team: SalesTeam) => {
    if ((team.members?.length ?? 0) > 0) {
      toast(
        'This team cannot be deleted because it still has assigned members. Remove or reassign them first, or archive the team instead.',
        'error',
      );
      return;
    }

    const ok = await confirm({
      title: 'Delete Team',
      message: `Are you sure you want to delete "${team.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      intent: 'danger',
    });
    if (!ok) return;

    try {
      setDeletingId(team.id);
      await deleteTeam(team.id);
      toast('Team deleted', 'success');
      await load();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete team', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const activeTeams = useMemo(() => teams.filter((t) => !t.archived), [teams]);
  const archivedTeams = useMemo(() => teams.filter((t) => t.archived), [teams]);
  // Count members across ALL teams (same scope as "Total Teams"). Each user
  // belongs to exactly one team, so there is no double-counting.
  const totalMembers = useMemo(
    () => teams.reduce((sum, t) => sum + (t.members?.length ?? 0), 0),
    [teams],
  );
  const visibleTeams = showArchived ? teams : activeTeams;

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Total Teams" value={teams.length} icon={Users} tone="text-blue-500" />
        <StatTile label="Total Members" value={totalMembers} icon={UserRound} tone="text-indigo-500" />
        <StatTile label="Active Teams" value={activeTeams.length} icon={TrendingUp} tone="text-emerald-500" />
        <StatTile label="Inactive Teams" value={archivedTeams.length} icon={Archive} tone="text-amber-500" />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {loading ? 'Loading…' : `${activeTeams.length} active team${activeTeams.length === 1 ? '' : 's'}`}
        </span>
        <div className="flex items-center gap-4">
          <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
            />
            Show archived
          </label>
          {canManage && (
            <Button variant="primary" onClick={openCreate}>
              <Plus size={18} /> New Team
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} variant="outlined" className="p-5">
              <Skeleton className="mb-3 h-5 w-2/3" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-4 h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : visibleTeams.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title={teams.length === 0 ? 'No teams yet' : 'No active teams'}
          description={
            teams.length === 0
              ? canManage
                ? 'Create your first sales team to start organising managers and members.'
                : 'No sales teams have been set up yet.'
              : 'All teams are archived. Toggle “Show archived” to see them.'
          }
          actionLabel={canManage && teams.length === 0 ? 'New Team' : undefined}
          onAction={canManage && teams.length === 0 ? openCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleTeams.map((team) => {
            const memberCount = team.members?.length ?? 0;
            return (
              <Card
                key={team.id}
                variant="outlined"
                className={classNames(
                  'group flex flex-col p-5 transition-all hover:shadow-lg',
                  team.archived && 'opacity-75',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setDetailTeamId(team.id)}
                    className="min-w-0 text-left"
                  >
                    <h2 className="flex items-center gap-1 truncate text-base font-bold text-gray-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400">
                      {team.name}
                      <ChevronRight
                        size={16}
                        className="flex-shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 dark:text-gray-600"
                      />
                    </h2>
                  </button>
                  {team.archived && <Badge variant="warning">Archived</Badge>}
                </div>

                <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm text-gray-500 dark:text-gray-400">
                  {team.description || 'No description provided.'}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="info">
                    <UserRound size={12} className="mr-1" />
                    {team.manager?.name ?? 'No manager'}
                  </Badge>
                  <Badge variant="default">
                    {memberCount} {memberCount === 1 ? 'member' : 'members'}
                  </Badge>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <Button variant="secondary" size="sm" onClick={() => setDetailTeamId(team.id)}>
                    View Members
                  </Button>
                  {(canManage || canDeleteTeam) && (
                    <div className="flex items-center gap-1">
                      {canManage && !team.archived && (
                        <button
                          type="button"
                          onClick={() => openEdit(team)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          aria-label={`Edit ${team.name}`}
                          title="Edit team"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {canManage && !team.archived && (
                        <button
                          type="button"
                          onClick={() => handleArchive(team)}
                          disabled={archivingId === team.id}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50 dark:hover:bg-amber-950/30"
                          aria-label={`Archive ${team.name}`}
                          title="Archive team"
                        >
                          <Archive size={16} />
                        </button>
                      )}
                      {canManage && team.archived && (
                        <button
                          type="button"
                          onClick={() => handleUnarchive(team)}
                          disabled={restoringId === team.id}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 dark:hover:bg-emerald-950/30"
                          aria-label={`Restore ${team.name}`}
                          title="Restore team"
                        >
                          <ArchiveRestore size={16} />
                        </button>
                      )}
                      {canDeleteTeam && (
                        <button
                          type="button"
                          onClick={() => handleDelete(team)}
                          disabled={deletingId === team.id}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
                          aria-label={`Delete ${team.name}`}
                          title="Delete team"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / edit modal */}
      <TeamFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        team={editingTeam}
        onSaved={() => void load()}
      />

      {/* Detail / membership modal */}
      <TeamDetailModal
        isOpen={detailTeamId != null}
        onClose={() => setDetailTeamId(null)}
        teamId={detailTeamId}
        canManage={canManage}
        onChanged={() => void load()}
      />
    </div>
  );
}

/* ═══════════════════════════ Performance ══════════════════════════════════ */

function PerformanceSection() {
  const { toast } = useToast();
  const [teams, setTeams] = useState<TeamPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openTeamId, setOpenTeamId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchTeamPerformance();
      setTeams(Array.isArray(data) ? data : []);
    } catch {
      toast('Failed to load team performance', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const topByScore = useMemo(
    () => [...teams].sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 5),
    [teams],
  );
  const topByRevenue = useMemo(
    () => [...teams].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5),
    [teams],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Live metrics aggregated from every member of each team.
        </p>
        <Button variant="secondary" size="sm" onClick={() => void load()} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamLeaderboard title="Top Teams by Score" icon={Trophy} loading={isLoading} teams={topByScore} metric={(t) => String(t.performanceScore)} />
        <TeamLeaderboard title="Top Teams by Revenue" icon={TrendingUp} loading={isLoading} teams={topByRevenue} metric={(t) => inr(t.totalRevenue)} />
      </div>

      {/* Team table — one row per team; click to open the detailed breakdown. */}
      <Card className="overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Team Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-500">Team</th>
                <th className="px-6 py-3 font-medium text-gray-500">Lead</th>
                <th className="px-6 py-3 font-medium text-gray-500">Members</th>
                <th className="px-6 py-3 font-medium text-gray-500">Leads</th>
                <th className="px-6 py-3 font-medium text-gray-500">Deals</th>
                <th className="px-6 py-3 font-medium text-gray-500">Conv.</th>
                <th className="px-6 py-3 font-medium text-gray-500">Score</th>
                <th className="px-6 py-3 font-medium text-gray-500 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading…</td></tr>
              ) : teams.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No teams yet. Create a team in the Teams tab.</td></tr>
              ) : (
                teams.map((t) => {
                  const { initials, color } = avatar(t.teamName);
                  return (
                    <tr key={t.teamId} onClick={() => setOpenTeamId(t.teamId)} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${color}`}>{initials}</div>
                          <span className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">{t.teamName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{t.teamLead || '—'}</td>
                      <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{t.activeMembers}/{t.totalMembers}</td>
                      <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{t.totalLeads}</td>
                      <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{t.wonDeals}/{t.totalDeals}</td>
                      <td className="px-6 py-3 font-semibold text-gray-900 dark:text-white">{t.conversionRate}%</td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">{t.performanceScore}</span>
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{inr(t.totalRevenue)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <TeamPerformanceModal teamId={openTeamId} onClose={() => setOpenTeamId(null)} />
    </div>
  );
}

function TeamLeaderboard({ title, icon: Icon, teams, metric, loading }: {
  title: string; icon: React.ComponentType<{ size?: number; className?: string }>;
  teams: TeamPerformance[]; metric: (t: TeamPerformance) => string; loading?: boolean;
}) {
  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-amber-500" />
        {title}
      </h3>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet.</p>
      ) : (
        <ul className="space-y-3">
          {teams.map((t, i) => {
            const { initials, color } = avatar(t.teamName);
            return (
              <li key={t.teamId} className="flex items-center gap-3">
                <span className={`w-6 text-center font-bold ${i < 3 ? MEDAL[i] : 'text-gray-400'}`}>
                  {i < 3 ? <Medal size={16} className="inline" /> : i + 1}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${color}`}>{initials}</div>
                <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{t.teamName}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{metric(t)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
