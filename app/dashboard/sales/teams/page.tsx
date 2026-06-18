'use client';

/**
 * SE-044.1 — Sales Teams: creation & membership.
 *
 * A Salesforce/HubSpot-style team-management screen: a grid of team cards with
 * manager, member count and archived status; create / edit / archive a team and
 * manage its members (all gated by `sales.team.manage`). A "Show archived"
 * toggle includes soft-deleted teams. Read-only for users without the
 * management permission.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  Plus,
  Archive,
  Pencil,
  ChevronRight,
  UserRound,
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
import { fetchTeams, archiveTeam } from '@/lib/api/salesTeams';
import { classNames } from '@/lib/utils';
import type { SalesTeam } from '@/lib/types/salesExecution';

function TeamsContent() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('sales.team.manage');

  const [teams, setTeams] = useState<SalesTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<SalesTeam | null>(null);
  const [detailTeamId, setDetailTeamId] = useState<number | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTeams(showArchived);
      setTeams(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load teams';
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showArchived, toast]);

  useEffect(() => {
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
      const message = err instanceof Error ? err.message : 'Failed to archive team';
      toast(message, 'error');
    } finally {
      setArchivingId(null);
    }
  };

  const activeCount = useMemo(() => teams.filter((t) => !t.archived).length, [teams]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Sales', href: '/dashboard/sales' },
              { label: 'Teams', href: '/dashboard/sales/teams' },
            ]}
          />
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Sales Teams</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Organise your sales force into teams, assign managers and manage membership.
          </p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={openCreate}>
            <Plus size={18} /> New Team
          </Button>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {loading ? 'Loading…' : `${activeCount} active team${activeCount === 1 ? '' : 's'}`}
        </span>
        <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
          />
          Show archived
        </label>
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
      ) : teams.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title="No teams yet"
          description={
            canManage
              ? 'Create your first sales team to start organising managers and members.'
              : 'No sales teams have been set up yet.'
          }
          actionLabel={canManage ? 'New Team' : undefined}
          onAction={canManage ? openCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => {
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
                  {canManage && !team.archived && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(team)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                        aria-label={`Edit ${team.name}`}
                        title="Edit team"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchive(team)}
                        disabled={archivingId === team.id}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
                        aria-label={`Archive ${team.name}`}
                        title="Archive team"
                      >
                        <Archive size={16} />
                      </button>
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

export default function SalesTeamsPage() {
  return (
    <PermissionPageGuard module="sales">
      <TeamsContent />
    </PermissionPageGuard>
  );
}
