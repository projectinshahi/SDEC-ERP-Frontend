'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/ui/SelectField';
import { TextareaField } from '@/components/ui/TextareaField';
import { useToast } from '@/lib/hooks/useToast';
import { disqualifyLead } from '@/lib/api/leadLifecycle';

interface DisqualifyLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  onDone: () => void;
}

const REASONS = ['Not Interested', 'Budget Constraints', 'Competitor Selected', 'Invalid Contact', 'Duplicate Lead', 'Other'];

/**
 * SE-009 — disqualify a lead with a mandatory reason. Surfaces the backend's
 * "minimum 3 call attempts" gate inline when it blocks the action.
 */
export function DisqualifyLeadModal({ isOpen, onClose, leadId, onDone }: DisqualifyLeadModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState('Not Interested');
  const [otherReason, setOtherReason] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('Not Interested');
      setOtherReason('');
      setGateError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = reason === 'Other' ? otherReason.trim() : reason;
    if (!finalReason) {
      toast('A disqualification reason is required', 'warning');
      return;
    }
    try {
      setIsSaving(true);
      setGateError(null);
      await disqualifyLead(leadId, finalReason);
      toast('Lead disqualified', 'success');
      onDone();
      onClose();
    } catch (error: any) {
      // The 3-call gate returns a specific message; show it inline.
      const msg = error?.message || 'Failed to disqualify lead';
      if (/call attempt/i.test(msg)) {
        const extra = error?.data?.currentAttempts !== undefined
          ? ` (Current: ${error.data.currentAttempts}, Required: ${error.data.requiredAttempts})`
          : '';
        setGateError(msg + extra);
      } else {
        toast(msg, 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Disqualify Lead" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Disqualified leads leave the active pipeline and stop generating follow-ups.
          A minimum of 3 logged calls is required.
        </p>

        {gateError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{gateError}</span>
          </div>
        )}

        <SelectField
          label="Reason" id="disqualify-reason" value={reason} onChange={setReason}
          options={REASONS}
        />
        {reason === 'Other' && (
          <TextareaField
            label="Specify reason" id="disqualify-other" required rows={2}
            value={otherReason} onChange={setOtherReason}
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" isLoading={isSaving}>Disqualify</Button>
        </div>
      </form>
    </Modal>
  );
}
