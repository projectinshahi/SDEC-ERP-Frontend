'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/ui/SelectField';
import { useToast } from '@/lib/hooks/useToast';

/** Minimal stage shape shared by LeadStage and DealStage. */
interface StageRef {
  id: number;
  name: string;
}

interface DeleteStageModalProps {
  isOpen: boolean;
  stage: StageRef | null;
  /** Number of records (leads/deals) currently in this stage. */
  recordCount: number;
  /** Stages the records can be relocated to (excludes the one being deleted). */
  otherStages: StageRef[];
  /** Noun for copy, e.g. 'lead' or 'deal'. */
  noun?: string;
  /** Injected delete so this one component serves both pipelines. */
  deleteStage: (id: number, reassignTo?: string) => Promise<{ reassignedTo: string }>;
  onClose: () => void;
  /** Called after a successful delete so the board can reload. */
  onDeleted: () => void;
}

/**
 * Delete a pipeline stage — shared by the Lead AND Deal pipeline boards (single
 * implementation; only the injected delete API + record noun differ). When the
 * stage still holds records, the user MUST pick a destination stage so no record
 * is orphaned — mirroring the backend, which relocates records inside the same
 * transaction as the delete. No data is ever lost.
 */
export function DeleteStageModal({
  isOpen, stage, recordCount, otherStages, noun = 'record', deleteStage, onClose, onDeleted,
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
      const res = await deleteStage(stage.id, recordCount > 0 ? reassignTo : undefined);
      toast(
        recordCount > 0
          ? `Stage "${stage.name}" deleted · ${recordCount} ${noun}${recordCount === 1 ? '' : 's'} moved to ${res.reassignedTo}`
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
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Pipeline Column" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>
            You are about to delete the <strong>{stage.name}</strong> column. This cannot be undone.
          </span>
        </div>

        {recordCount > 0 ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This column contains{' '}
              <strong>{recordCount} {noun}{recordCount === 1 ? '' : 's'}</strong>. Please select another
              column to move {recordCount === 1 ? 'it' : 'them'} before deleting.
            </p>
            <SelectField
              label="Move to"
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
            This column has no {noun}s, so it can be removed safely.
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
            disabled={recordCount > 0 && !reassignTo}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
