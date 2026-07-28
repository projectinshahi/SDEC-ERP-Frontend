'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/ui/SelectField';
import { TextareaField } from '@/components/ui/TextareaField';
import { useToast } from '@/lib/hooks/useToast';
import { disqualifyLead } from '@/lib/api/leadLifecycle';
import { fetchLeadInteractions } from '@/lib/api/leadQualification';

/**
 * Mirrors MIN_CALL_ATTEMPTS in leadLifecycle.controller.ts. The backend stays the
 * authority (it re-checks and its message wins); this copy only lets the modal
 * explain the rule BEFORE the user fills the form.
 */
const MIN_CALL_ATTEMPTS = 3;

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

  // Logged Call count — null while loading / unknown. Checked up front so the
  // 3-call rule is explained BEFORE the user fills in a reason, instead of only
  // as a rejection after submitting. Reuses the existing interactions endpoint.
  const [callCount, setCallCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setReason('Not Interested');
    setOtherReason('');
    setGateError(null);
    setCallCount(null);
    fetchLeadInteractions(leadId)
      .then((list) => setCallCount(list.filter((i) => i.type === 'Call').length))
      // Unknown count → let the user try; the backend still enforces the rule.
      .catch(() => setCallCount(null));
  }, [isOpen, leadId]);

  const blocked = callCount !== null && callCount < MIN_CALL_ATTEMPTS;

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
        </p>

        {/* The 3-call rule, stated up front with this lead's actual progress, so a
            blocked disqualification is never a surprise at submit time. */}
        {blocked && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              <strong>This lead cannot be disqualified yet.</strong> At least {MIN_CALL_ATTEMPTS} completed
              calls must be logged first — {callCount} of {MIN_CALL_ATTEMPTS} logged so far.
              Log the remaining {MIN_CALL_ATTEMPTS - (callCount ?? 0)} call
              {MIN_CALL_ATTEMPTS - (callCount ?? 0) === 1 ? '' : 's'} in the Interactions timeline, then try again.
            </span>
          </div>
        )}
        {callCount !== null && !blocked && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {callCount} calls logged — the {MIN_CALL_ATTEMPTS}-call minimum is met.
          </p>
        )}

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
          <Button type="submit" variant="danger" isLoading={isSaving} disabled={blocked}>Disqualify</Button>
        </div>
      </form>
    </Modal>
  );
}
