'use client';

/**
 * SE-044.1 — Add a member to a sales team.
 *
 * Pick a user (from the assignable-users list) and a role (BDE / Team Lead).
 * A user belongs to at most one team — adding someone already on another team
 * MOVES them (the backend upserts); any backend error is surfaced via toast.
 */

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/ui/SelectField';
import { useToast } from '@/lib/hooks/useToast';
import { addTeamMember } from '@/lib/api/salesTeams';
import { fetchAssignableUsers } from '@/lib/api/leads';
import type { SalesTeam, TeamMemberRole } from '@/lib/types/salesExecution';
import type { AssignableUser } from '@/lib/types/lead';

interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
  team: SalesTeam;
}

const ROLE_OPTIONS: { value: TeamMemberRole; label: string }[] = [
  { value: 'bde', label: 'BDE' },
  { value: 'team_lead', label: 'Team Lead' },
];

export function AddTeamMemberModal({ isOpen, onClose, onAdded, team }: AddTeamMemberModalProps) {
  const { toast } = useToast();

  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<TeamMemberRole>('bde');
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) return;
    setUserId('');
    setRole('bde');
    setError(undefined);

    let active = true;
    fetchAssignableUsers()
      .then((res) => active && setUsers(res))
      .catch(() => active && setUsers([]));
    return () => {
      active = false;
    };
  }, [isOpen]);

  // Exclude users already on this team from the picker.
  const memberIds = useMemo(() => new Set((team.members ?? []).map((m) => m.userId)), [team.members]);
  const userOptions = useMemo(
    () =>
      users
        .filter((u) => !memberIds.has(u.id))
        .map((u) => ({ value: String(u.id), label: u.role ? `${u.name} (${u.role})` : u.name })),
    [users, memberIds],
  );

  const handleSubmit = async () => {
    if (!userId) {
      setError('Select a user to add');
      return;
    }
    try {
      setSubmitting(true);
      await addTeamMember(team.id, Number(userId), role);
      toast('Member added to team', 'success');
      onAdded();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add member';
      toast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Member — ${team.name}`} size="md">
      <div className="space-y-4">
        <SelectField
          id="member-user"
          label="User"
          required
          placeholder="Select a user"
          options={userOptions}
          value={userId}
          onChange={(v) => {
            setUserId(v);
            if (error) setError(undefined);
          }}
          error={error}
        />

        <SelectField
          id="member-role"
          label="Role"
          options={ROLE_OPTIONS}
          value={role}
          onChange={(v) => setRole(v as TeamMemberRole)}
        />

        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300">
          A user can belong to one team at a time. Adding someone already on another team will move them here.
        </p>

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={submitting}>
            Add Member
          </Button>
        </div>
      </div>
    </Modal>
  );
}
