'use client';

import { useState, useEffect } from 'react';
import { Columns3 } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { useToast } from '@/lib/hooks/useToast';

/** Minimal stage shape shared by LeadStage and DealStage. */
interface StageRef {
  id: number;
  name: string;
}

interface StageFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'rename';
  /** The stage being renamed (ignored in 'add' mode). */
  stage?: StageRef | null;
  /** Existing stage names, for instant client-side duplicate validation. */
  existingNames: string[];
  /** Noun for copy, e.g. 'lead' or 'deal'. */
  noun?: string;
  /** Injected create/rename so this one component serves both pipelines. */
  createStage: (name: string) => Promise<unknown>;
  renameStage: (id: number, name: string) => Promise<unknown>;
  onClose: () => void;
  /** Called after a successful create/rename so the board can reload. */
  onSaved: () => void;
}

/**
 * Add or rename a pipeline stage — shared by the Lead AND Deal pipeline boards
 * (single implementation; the only difference is the injected create/rename API).
 * Validation (empty / spaces-only / duplicate) runs client-side for instant
 * feedback and is re-enforced by the backend.
 */
export function StageFormModal({
  isOpen, mode, stage, existingNames, noun = 'record', createStage, renameStage, onClose, onSaved,
}: StageFormModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(mode === 'rename' ? stage?.name ?? '' : '');
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, mode, stage]);

  const validate = (raw: string): string | null => {
    const clean = raw.replace(/\s+/g, ' ').trim();
    if (!clean) return 'Stage name cannot be empty.';
    if (clean.length > 100) return 'Stage name must be 100 characters or fewer.';
    const isSelf = mode === 'rename' && stage
      ? clean.toLowerCase() === stage.name.toLowerCase()
      : false;
    const dup = existingNames.some((n) => n.toLowerCase() === clean.toLowerCase());
    if (dup && !isSelf) return `A stage named "${clean}" already exists.`;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.replace(/\s+/g, ' ').trim();
    const validationError = validate(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      if (mode === 'add') {
        await createStage(clean);
        toast(`Stage "${clean}" added`, 'success');
      } else if (stage) {
        await renameStage(stage.id, clean);
        toast(`Stage renamed to "${clean}"`, 'success');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save stage. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const liveError = error ?? (name.trim() ? validate(name) : null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? 'Add Stage' : 'Rename Stage'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {mode === 'add'
            ? `Create a new column in the ${noun} pipeline. The stage is saved to the database and appears as the last column.`
            : `Rename this pipeline stage. Every ${noun} currently in it moves with the new name.`}
        </p>

        <InputField
          label="Stage name"
          id="stage-name"
          icon={Columns3}
          value={name}
          onChange={(v) => { setName(v); setError(null); }}
          placeholder="e.g. Negotiation, Follow Up, Won"
          error={liveError || undefined}
          required
          autoFocus
          maxLength={100}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSaving} disabled={!!liveError}>
            {mode === 'add' ? 'Add Stage' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
