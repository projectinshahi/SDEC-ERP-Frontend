'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { SelectField } from '@/components/ui/SelectField';
import { TextareaField } from '@/components/ui/TextareaField';
import { InputField } from '@/components/ui/InputField';
import { useToast } from '@/lib/hooks/useToast';
import { createLeadInteraction } from '@/lib/api/leadQualification';
import type { InteractionType } from '@/lib/types/leadQualification';

interface AddInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  onSaved: () => void;
}

const TYPES: InteractionType[] = ['Call', 'Email', 'Meeting'];

/** Returns the current local datetime as a value for <input type="datetime-local">. */
function nowLocalDatetime(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

/**
 * Log a Call / Email / Meeting interaction against a lead. Blocks empty notes
 * and future dates (matching server-side validation).
 */
export function AddInteractionModal({ isOpen, onClose, leadId, onSaved }: AddInteractionModalProps) {
  const { toast } = useToast();
  const [type, setType] = useState<InteractionType>('Call');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(nowLocalDatetime());
  const [errors, setErrors] = useState<{ notes?: string; date?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setType('Call');
      setNotes('');
      setDate(nowLocalDatetime());
      setErrors({});
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: { notes?: string; date?: string } = {};
    if (!notes.trim()) next.notes = 'Notes are required.';
    if (date && new Date(date).getTime() > Date.now()) next.date = 'Date cannot be in the future.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      setIsSaving(true);
      await createLeadInteraction(leadId, {
        type,
        notes: notes.trim(),
        date: date ? new Date(date).toISOString() : undefined,
      });
      toast('Interaction logged', 'success');
      onSaved();
      onClose();
    } catch (error: any) {
      toast(error?.message || 'Failed to log interaction', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Interaction" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label="Type" id="interaction-type" value={type}
          onChange={(v) => setType(v as InteractionType)}
          options={TYPES.map((t) => ({ value: t, label: t }))}
        />
        <TextareaField
          label="Notes" id="interaction-notes" required rows={4}
          value={notes} onChange={setNotes} error={errors.notes}
          placeholder="e.g. Discussed pricing / Sent proposal / Demo completed"
        />
        <InputField
          label="Date" id="interaction-date" type="datetime-local"
          value={date} onChange={setDate} error={errors.date}
          max={nowLocalDatetime()}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSaving}>Log Interaction</Button>
        </div>
      </form>
    </Modal>
  );
}
