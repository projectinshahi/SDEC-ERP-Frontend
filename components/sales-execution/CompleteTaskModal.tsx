'use client';

/**
 * SE-026.1 — Complete a Sales Task with an outcome.
 *
 * The completion workflow: Task → Mark Complete → Enter Outcome → Save Notes.
 * Captures a (required) outcome built from OUTCOME_LABELS plus optional
 * completion notes, calls completeSalesTask and notifies the page via onDone.
 */

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/ui/SelectField';
import { TextareaField } from '@/components/ui/TextareaField';
import { useToast } from '@/lib/hooks/useToast';
import { completeSalesTask } from '@/lib/api/salesTasks';
import { OUTCOME_LABELS } from '@/lib/types/salesExecution';
import type { SalesTask, SalesTaskOutcome } from '@/lib/types/salesExecution';

interface CompleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: SalesTask | null;
  onDone: () => void;
}

const OUTCOME_OPTIONS = (Object.keys(OUTCOME_LABELS) as SalesTaskOutcome[]).map((value) => ({
  value,
  label: OUTCOME_LABELS[value],
}));

export function CompleteTaskModal({ isOpen, onClose, task, onDone }: CompleteTaskModalProps) {
  const { toast } = useToast();
  const [outcome, setOutcome] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOutcome('');
      setCompletionNotes('');
      setError(undefined);
    }
  }, [isOpen, task?.id]);

  const handleSubmit = async () => {
    if (!task) return;

    if (!outcome) {
      setError('Select an outcome to complete this task');
      toast('Please select an outcome', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await completeSalesTask(task.id, outcome as SalesTaskOutcome, completionNotes.trim() || undefined);
      toast('Task completed', 'success');
      onDone();
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to complete task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Task" size="md">
      <div className="space-y-4">
        {task && (
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{task.title}</p>
              <p className="mt-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Log the outcome to mark this task complete.
              </p>
            </div>
          </div>
        )}

        <SelectField
          id="complete-outcome"
          label="Outcome"
          required
          placeholder="Select an outcome"
          options={OUTCOME_OPTIONS}
          value={outcome}
          onChange={(v) => {
            setOutcome(v);
            if (error) setError(undefined);
          }}
          error={error}
        />

        <TextareaField
          id="complete-notes"
          label="Completion notes"
          rows={3}
          placeholder="Optional summary of what happened…"
          value={completionNotes}
          onChange={setCompletionNotes}
        />

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleSubmit} isLoading={submitting}>
            <CheckCircle2 size={16} /> Mark Complete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
