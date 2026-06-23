'use client';

/**
 * SE-044.1 — Add one or more members to a sales team.
 *
 * Pick any number of users (from the assignable-users list) and a role
 * (BDE / Team Lead), then add them all at once. A user belongs to at most one
 * team — adding someone already on another team MOVES them (the backend
 * upserts). Each user is added via the existing per-member endpoint; partial
 * failures are reported and the successful adds are kept.
 */

import { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/ui/SelectField';
import { useToast } from '@/lib/hooks/useToast';
import { addTeamMember } from '@/lib/api/salesTeams';
import { fetchAssignableUsers } from '@/lib/api/leads';
import { classNames } from '@/lib/utils';
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

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [role, setRole] = useState<TeamMemberRole>('bde');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds(new Set());
    setRole('bde');
    setSearch('');
    setError(undefined);

    let active = true;
    fetchAssignableUsers()
      .then((res) => active && setUsers(res))
      .catch(() => active && setUsers([]));
    return () => {
      active = false;
    };
  }, [isOpen]);

  // Users not already on this team — the only ones eligible to add.
  const memberIds = useMemo(() => new Set((team.members ?? []).map((m) => m.userId)), [team.members]);
  const available = useMemo(() => users.filter((u) => !memberIds.has(u.id)), [users, memberIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (u) => u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q),
    );
  }, [available, search]);

  const toggle = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allFilteredSelected = filtered.length > 0 && filtered.every((u) => selectedIds.has(u.id));
  const toggleAllFiltered = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((u) => next.delete(u.id));
      else filtered.forEach((u) => next.add(u.id));
      return next;
    });

  const handleSubmit = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setError('Select at least one user to add');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    const results = await Promise.allSettled(ids.map((id) => addTeamMember(team.id, id, role)));
    const added = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - added;

    // Refresh the team so successfully-added members appear (and drop out of
    // the picker) regardless of any partial failure.
    if (added > 0) onAdded();

    if (failed === 0) {
      toast(`${added} member${added === 1 ? '' : 's'} added to team`, 'success');
      onClose();
    } else {
      const firstError = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')?.reason;
      const reason = firstError instanceof Error ? firstError.message : 'some members could not be added';
      toast(
        added > 0
          ? `Added ${added} of ${results.length} — ${failed} failed (${reason})`
          : `Failed to add members — ${reason}`,
        added > 0 ? 'warning' : 'error',
      );
      // Keep the modal open so the user can retry the ones that failed.
      setSelectedIds(new Set());
    }
    setSubmitting(false);
  };

  const count = selectedIds.size;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Members — ${team.name}`} size="md">
      <div className="space-y-4">
        <SelectField
          id="member-role"
          label="Role"
          options={ROLE_OPTIONS}
          value={role}
          onChange={(v) => setRole(v as TeamMemberRole)}
        />

        {/* User multi-select */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Users <span className="text-rose-500">*</span>
            </label>
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={toggleAllFiltered}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                {allFilteredSelected ? 'Clear all' : 'Select all'}
              </button>
            )}
          </div>

          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <div
            className={classNames(
              'max-h-60 overflow-y-auto rounded-xl border',
              error ? 'border-rose-400 dark:border-rose-800' : 'border-gray-200 dark:border-gray-700',
            )}
          >
            {available.length === 0 ? (
              <div className="flex flex-col items-center gap-1 px-3 py-8 text-center text-sm text-gray-500">
                <Users className="h-6 w-6 text-gray-300" />
                Everyone is already on this team.
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-gray-500">No users match “{search}”.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((u) => {
                  const checked = selectedIds.has(u.id);
                  return (
                    <li key={u.id}>
                      <label
                        className={classNames(
                          'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors',
                          checked ? 'bg-blue-50/60 dark:bg-blue-950/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            toggle(u.id);
                            if (error) setError(undefined);
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{u.name}</p>
                          <p className="truncate text-xs text-gray-400">
                            {u.email}{u.role ? ` · ${u.role}` : ''}
                          </p>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {error ? (
            <p className="mt-1.5 text-xs font-medium text-rose-500">{error}</p>
          ) : (
            <p className="mt-1.5 text-xs text-gray-400">
              {count > 0 ? `${count} user${count === 1 ? '' : 's'} selected` : 'Select one or more users to add.'}
            </p>
          )}
        </div>

        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-300">
          A user can belong to one team at a time. Adding someone already on another team will move them here.
        </p>

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={submitting} disabled={count === 0}>
            {count > 1 ? `Add ${count} Members` : 'Add Member'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
