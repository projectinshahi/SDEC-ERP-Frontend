'use client';

/**
 * SE-044.1 — Create / edit a sales team.
 *
 * Name is required, description optional. A manager can optionally be chosen
 * from the assignable-users list; if left blank on create the backend defaults
 * the manager to the creator. On edit, the modal is seeded from the team.
 */

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { TextareaField } from '@/components/ui/TextareaField';
import { useToast } from '@/lib/hooks/useToast';
import { createTeam, updateTeam } from '@/lib/api/salesTeams';
import { fetchAssignableUsers } from '@/lib/api/leads';
import type { SalesTeam } from '@/lib/types/salesExecution';
import type { AssignableUser } from '@/lib/types/lead';

interface TeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** When supplied, the modal is in edit mode. */
  team?: SalesTeam | null;
}

export function TeamFormModal({ isOpen, onClose, onSaved, team }: TeamFormModalProps) {
  const { toast } = useToast();
  const isEdit = Boolean(team);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});

  // Seed the form whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setName(team?.name ?? '');
    setDescription(team?.description ?? '');
    setManagerId(team?.managerId ? String(team.managerId) : '');
    setErrors({});
  }, [isOpen, team]);

  // Load the manager picker options once the modal is open.
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetchAssignableUsers()
      .then((res) => active && setUsers(res))
      .catch(() => active && setUsers([]));
    return () => {
      active = false;
    };
  }, [isOpen]);

  const managerOptions = useMemo(
    () => users.map((u) => ({ value: String(u.id), label: u.role ? `${u.name} (${u.role})` : u.name })),
    [users],
  );

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrors({ name: 'Team name is required' });
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit && team) {
        await updateTeam(team.id, {
          name: trimmed,
          description: description.trim() || null,
          managerId: managerId ? Number(managerId) : undefined,
        });
        toast('Team updated', 'success');
      } else {
        await createTeam({
          name: trimmed,
          description: description.trim() || null,
          managerId: managerId ? Number(managerId) : undefined,
        });
        toast('Team created', 'success');
      }
      onSaved();
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to ${isEdit ? 'update' : 'create'} team`;
      toast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Team' : 'New Team'} size="md">
      <div className="space-y-4">
        <InputField
          id="team-name"
          label="Team Name"
          required
          placeholder="e.g. Enterprise West"
          value={name}
          onChange={(v) => {
            setName(v);
            if (errors.name) setErrors({});
          }}
          error={errors.name}
        />

        <TextareaField
          id="team-description"
          label="Description"
          rows={3}
          placeholder="Optional — what this team focuses on…"
          value={description}
          onChange={setDescription}
        />

        <SelectField
          id="team-manager"
          label="Manager"
          placeholder={isEdit ? 'Select a manager' : 'Defaults to you'}
          options={managerOptions}
          value={managerId}
          onChange={setManagerId}
        />
        <p className="-mt-1 text-xs text-gray-400 dark:text-gray-500">
          Leave blank to manage this team yourself.
        </p>

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={submitting}>
            {isEdit ? 'Save Changes' : 'Create Team'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
