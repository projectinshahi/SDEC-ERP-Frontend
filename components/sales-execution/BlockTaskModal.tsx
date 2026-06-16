'use client';

/**
 * SE-024 — Block / Unblock a Sales Task.
 *
 * If the task is already blocked, this modal unblocks it. Otherwise it captures
 * a (required) blocker reason and marks the task blocked. Both paths call
 * setSalesTaskBlocked and notify the page via onDone.
 */

import { useEffect, useState } from 'react';
import { Ban, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TextareaField } from '@/components/ui/TextareaField';
import { useToast } from '@/lib/hooks/useToast';
import { setSalesTaskBlocked } from '@/lib/api/salesTasks';
import type { SalesTask } from '@/lib/types/salesExecution';

interface BlockTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: SalesTask | null;
  onDone: () => void;
}

const REASON_EXAMPLES = [
  'Waiting for Client Response',
  'Awaiting Approval',
  'Pricing Pending',
  'Technical Clarification Needed',
];

export function BlockTaskModal({ isOpen, onClose, task, onDone }: BlockTaskModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const isBlocked = !!task?.blocked;

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(undefined);
    }
  }, [isOpen, task?.id]);

  const handleSubmit = async () => {
    if (!task) return;

    if (!isBlocked && !reason.trim()) {
      setError('A blocker reason is required');
      return;
    }

    try {
      setSubmitting(true);
      if (isBlocked) {
        await setSalesTaskBlocked(task.id, false);
        toast('Task unblocked', 'success');
      } else {
        await setSalesTaskBlocked(task.id, true, reason.trim());
        toast('Task marked as blocked', 'warning');
      }
      onDone();
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to update task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBlocked ? 'Unblock Task' : 'Mark Task as Blocked'}
      size="md"
    >
      <div className="space-y-4">
        {task && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{task.title}</p>
          </div>
        )}

        {isBlocked ? (
          <>
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
              <Ban size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">This task is currently blocked.</p>
                {task?.blockerReason && <p className="mt-0.5 font-medium">{task.blockerReason}</p>}
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Unblocking will clear the blocker reason and return the task to active work.
            </p>
          </>
        ) : (
          <>
            <TextareaField
              id="block-reason"
              label="Blocker reason"
              required
              rows={3}
              placeholder="e.g. Waiting for Client Response"
              value={reason}
              onChange={(v) => {
                setReason(v);
                if (error) setError(undefined);
              }}
              error={error}
            />
            <div className="flex flex-wrap gap-2">
              {REASON_EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setReason(example);
                    setError(undefined);
                  }}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-red-300 hover:text-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {example}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={isBlocked ? 'success' : 'danger'}
            onClick={handleSubmit}
            isLoading={submitting}
          >
            {isBlocked ? (
              <>
                <ShieldCheck size={16} /> Unblock
              </>
            ) : (
              <>
                <Ban size={16} /> Mark Blocked
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
