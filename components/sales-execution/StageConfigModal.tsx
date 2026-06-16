'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { useToast } from '@/lib/hooks/useToast';
import { updateStageConfig } from '@/lib/api/pipeline';
import type { DealStageConfig } from '@/lib/types/salesExecution';

interface StageConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: DealStageConfig[];
  onSaved: () => void;
}

/**
 * SE-021.1 — Per-stage stalled threshold editor.
 *
 * Each stage gets a "days in stage before stalled" input (1–365). Saving sends
 * the full `{ stageName: days }` map to the backend.
 */
export function StageConfigModal({ isOpen, onClose, stages, onSaved }: StageConfigModalProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Seed local editable state from the stage config whenever the modal opens.
  useEffect(() => {
    if (isOpen) {
      const seed: Record<string, string> = {};
      for (const s of stages) seed[s.name] = String(s.stalledThresholdDays);
      setValues(seed);
    }
  }, [isOpen, stages]);

  const handleSave = async () => {
    const thresholds: Record<string, number> = {};
    for (const s of stages) {
      const raw = values[s.name];
      const days = Number(raw);
      if (!Number.isFinite(days) || days < 1 || days > 365) {
        toast(`Threshold for "${s.name}" must be between 1 and 365 days`, 'error');
        return;
      }
      thresholds[s.name] = Math.round(days);
    }

    try {
      setIsSaving(true);
      await updateStageConfig(thresholds);
      toast('Stalled thresholds updated', 'success');
      onSaved();
      onClose();
    } catch {
      toast('Failed to update stalled thresholds', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Stalled Thresholds" size="lg">
      <div className="space-y-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Set how many days a deal can sit in each stage before it is flagged as
          <span className="font-medium text-amber-600 dark:text-amber-400"> at risk</span> or
          <span className="font-medium text-red-600 dark:text-red-400"> stalled</span>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 p-3"
            >
              <InputField
                id={`stage-threshold-${stage.id}`}
                label={stage.name}
                type="number"
                min={1}
                max={365}
                icon={Clock}
                value={values[stage.name] ?? ''}
                onChange={(v) => setValues((prev) => ({ ...prev, [stage.name]: v }))}
              />
              <p className="mt-1 text-[11px] text-gray-400">Days before stalled (1–365)</p>
            </div>
          ))}
        </div>

        {stages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No deal stages configured.</p>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={isSaving} disabled={stages.length === 0}>
            Save thresholds
          </Button>
        </div>
      </div>
    </Modal>
  );
}
