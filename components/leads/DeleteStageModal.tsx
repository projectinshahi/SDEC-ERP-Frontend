'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/ui/SelectField';
import { useToast } from '@/lib/hooks/useToast';
import { deleteLeadStage } from '@/lib/api/leads';
import type { LeadStage } from '@/lib/types/lead';

interface DeleteStageModalProps {
  isOpen: boolean;
  stage: LeadStage | null;
  /** Number of leads currently in this stage. */
  leadCount: number;
  /** Stages the leads can be relocated to (excludes the one being deleted). */
  otherStages: LeadStage[];
  onClose: () => void;
  /** Called after a successful delete so the board can reload. */
  onDeleted: () => void;
}

/**
 * Delete a pipeline stage. When the stage still holds leads, the user must pick
 * a destination stage so no lead is left orphaned — mirroring the backend, which
 * relocates leads inside the same transaction as the delete.
 */
export function DeleteStageModal({
  isOpen, stage, leadCount, otherStages, onClose, onDeleted,
}: DeleteStageModalProps) {
  const { toast } = useToast();
  const [reassignTo, setReassignTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReassignTo(otherStages[0]?.name ?? '');
      setError(null);
      setIsDeleting(false);
    }
  }, [isOpen, otherStages]);

  if (!stage) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      // Only send a destination when leads need relocating.
      const res = await deleteLeadStage(stage.id, leadCount > 0 ? reassignTo : undefined);
      toast(
        leadCount > 0
          ? `Stage "${stage.name}" deleted · ${leadCount} lead${leadCount === 1 ? '' : 's'} moved to ${res.reassignedTo}`
          : `Stage "${stage.name}" deleted`,
        'success',
      );
      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete stage. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Stage" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>
            You are about to delete the <strong>{stage.name}</strong> stage. This cannot be undone.
          </span>
        </div>

        {leadCount > 0 ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This stage contains{' '}
              <strong>{leadCount} lead{leadCount === 1 ? '' : 's'}</strong>. Choose where to move
              {leadCount === 1 ? ' it' : ' them'} before deleting.
            </p>
            <SelectField
              label="Move leads to"
              id="reassign-stage"
              icon={ArrowRight}
              value={reassignTo}
              onChange={setReassignTo}
              options={otherStages.map((s) => ({ value: s.name, label: s.name }))}
              required
            />
          </>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This stage has no leads, so it can be removed safely.
          </p>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            variant="danger"
            isLoading={isDeleting}
            disabled={leadCount > 0 && !reassignTo}
            onClick={handleDelete}
          >
            Delete Stage
          </Button>
        </div>
      </div>
    </Modal>
  );
}
