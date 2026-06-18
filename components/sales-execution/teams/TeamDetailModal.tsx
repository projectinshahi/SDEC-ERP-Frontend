'use client';

/**
 * SE-044.1 — Team detail modal.
 *
 * Shows the team's manager + members (name, email, role badge) and exposes the
 * gated membership actions: add member, remove member. Edit/Archive of the team
 * itself live on the parent card. Loads the full team (with members) on open.
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail, Trash2, UserPlus, Users } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { fetchTeam, removeTeamMember } from '@/lib/api/salesTeams';
import { AddTeamMemberModal } from './AddTeamMemberModal';
import type { SalesTeam, SalesTeamMember } from '@/lib/types/salesExecution';

interface TeamDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number | null;
  canManage: boolean;
  /** Notify the parent list that membership changed (refresh counts). */
  onChanged: () => void;
}

function roleLabel(role: SalesTeamMember['role']): string {
  return role === 'team_lead' ? 'Team Lead' : 'BDE';
}

export function TeamDetailModal({ isOpen, onClose, teamId, canManage, onChanged }: TeamDetailModalProps) {
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [team, setTeam] = useState<SalesTeam | null>(null);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (teamId == null) return;
    try {
      setLoading(true);
      const data = await fetchTeam(teamId);
      setTeam(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load team';
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [teamId, toast]);

  useEffect(() => {
    if (!isOpen || teamId == null) {
      setTeam(null);
      return;
    }
    void load();
  }, [isOpen, teamId, load]);

  const handleRemove = async (member: SalesTeamMember) => {
    if (!team) return;
    const ok = await confirm({
      title: 'Remove member',
      message: `Remove ${member.user?.name ?? 'this user'} from "${team.name}"?`,
      confirmLabel: 'Remove',
      intent: 'danger',
    });
    if (!ok) return;

    try {
      setRemovingId(member.userId);
      await removeTeamMember(team.id, member.userId);
      toast('Member removed', 'success');
      await load();
      onChanged();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove member';
      toast(message, 'error');
    } finally {
      setRemovingId(null);
    }
  };

  const members = team?.members ?? [];

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={team?.name ?? 'Team'} size="lg">
        <div className="space-y-5">
          {/* Summary */}
          <div className="flex flex-wrap items-center gap-3">
            {team?.manager && (
              <Badge variant="info">Manager: {team.manager.name}</Badge>
            )}
            <Badge variant="default">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </Badge>
            {team?.archived && <Badge variant="warning">Archived</Badge>}
          </div>

          {team?.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300">{team.description}</p>
          )}

          {/* Members header + add */}
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <Users size={16} /> Members
            </h3>
            {canManage && team && !team.archived && (
              <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
                <UserPlus size={16} /> Add Member
              </Button>
            )}
          </div>

          {/* Member list */}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              No members on this team yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-700/60 dark:border-gray-700">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                      {(member.user?.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {member.user?.name ?? `User #${member.userId}`}
                      </p>
                      {member.user?.email && (
                        <p className="flex items-center gap-1 truncate text-xs text-gray-500 dark:text-gray-400">
                          <Mail size={11} /> {member.user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Badge variant={member.role === 'team_lead' ? 'success' : 'default'}>
                      {roleLabel(member.role)}
                    </Badge>
                    {canManage && team && !team.archived && (
                      <button
                        type="button"
                        onClick={() => handleRemove(member)}
                        disabled={removingId === member.userId}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30"
                        aria-label={`Remove ${member.user?.name ?? 'member'}`}
                      >
                        {removingId === member.userId ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end border-t border-gray-100 pt-4 dark:border-gray-700">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {team && (
        <AddTeamMemberModal
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          team={team}
          onAdded={() => {
            void load();
            onChanged();
          }}
        />
      )}
    </>
  );
}
