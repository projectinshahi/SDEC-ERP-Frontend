'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/ui/SelectField';
import { useToast } from '@/lib/hooks/useToast';
import { assignLead } from '@/lib/api/leadQualification';
import { fetchAssignableUsers } from '@/lib/api/leads';
import type { AssignableUser } from '@/lib/types/lead';

interface AssignLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  currentOwnerId?: number | null;
  onAssigned: () => void;
}

/**
 * Assign / reassign a lead to a BDE. The selected user becomes the lead owner;
 * the backend creates the initial follow-up task and notifies the new owner.
 */
export function AssignLeadModal({ isOpen, onClose, leadId, currentOwnerId, onAssigned }: AssignLeadModalProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setOwnerId(currentOwnerId ? String(currentOwnerId) : '');
    fetchAssignableUsers().then(setUsers).catch(() => setUsers([]));
  }, [isOpen, currentOwnerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId) {
      toast('Please select a BDE', 'warning');
      return;
    }
    try {
      setIsSaving(true);
      await assignLead(leadId, Number(ownerId));
      toast('Lead assigned', 'success');
      onAssigned();
      onClose();
    } catch (error: any) {
      toast(error?.message || 'Failed to assign lead', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Lead to BDE" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The assigned Business Development Executive becomes the lead owner and receives an initial
          follow-up task.
        </p>
        <SelectField
          label="Business Development Executive" id="assign-owner" value={ownerId}
          onChange={setOwnerId} placeholder="Select a BDE"
          options={users.map((u) => ({ value: String(u.id), label: u.role ? `${u.name} — ${u.role}` : u.name }))}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSaving}>Assign</Button>
        </div>
      </form>
    </Modal>
  );
}
