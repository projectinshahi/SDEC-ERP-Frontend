'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { useToast } from '@/lib/hooks/useToast';
import { setTarget } from '@/lib/api/bdeDashboard';

interface SetTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAmount: number;
  period: string;
  onSaved: () => void;
}

/**
 * Modal to set/update the BDE's sales target for a given period.
 */
export function SetTargetModal({ isOpen, onClose, currentAmount, period, onSaved }: SetTargetModalProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(currentAmount > 0 ? String(currentAmount) : '');
      setError('');
    }
  }, [isOpen, currentAmount]);

  const handleSave = async () => {
    const parsed = Number(amount);
    if (!amount.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid target amount greater than zero.');
      return;
    }
    try {
      setIsSaving(true);
      await setTarget(parsed, period);
      toast('Target updated successfully', 'success');
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to set target', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Sales Target" size="sm">
      <div className="space-y-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Set your revenue target for <span className="font-semibold text-gray-700 dark:text-gray-200">{period}</span>.
        </p>
        <InputField
          id="bde-target-amount"
          label="Target Amount (INR)"
          type="number"
          min={0}
          placeholder="e.g. 500000"
          value={amount}
          onChange={(v) => {
            setAmount(v);
            if (error) setError('');
          }}
          error={error || undefined}
          required
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            Save Target
          </Button>
        </div>
      </div>
    </Modal>
  );
}
