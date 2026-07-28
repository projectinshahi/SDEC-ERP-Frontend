'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { TextareaField } from '@/components/ui/TextareaField';
import { useToast } from '@/lib/hooks/useToast';
import { createManualFollowUp } from '@/lib/api/leadQualification';

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  onSaved: () => void;
}

/**
 * Tomorrow 09:00 as the picker's LOCAL `yyyy-MM-ddTHH:mm` value. A reminder now
 * carries a time of day, so it needs a sensible default hour rather than the
 * midnight a date-only field produced (which is why reminders fired at the start
 * of the day instead of when the user meant).
 */
function tomorrowDateTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Manually schedule a follow-up reminder for a lead. */
export function AddReminderModal({ isOpen, onClose, leadId, onSaved }: AddReminderModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(tomorrowDateTime());
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ title?: string; dueDate?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDueDate(tomorrowDateTime());
      setNotes('');
      setErrors({});
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: { title?: string; dueDate?: string } = {};
    if (!title.trim()) next.title = 'A reminder title is required.';
    if (!dueDate) next.dueDate = 'A due date & time is required.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      setIsSaving(true);
      await createManualFollowUp(leadId, {
        title: title.trim(),
        dueDate: new Date(dueDate).toISOString(),
        notes: notes.trim() || undefined,
      });
      toast('Reminder scheduled', 'success');
      onSaved();
      onClose();
    } catch (error: any) {
      toast(error?.message || 'Failed to schedule reminder', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Follow-up Reminder" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="Title" id="reminder-title" required
          value={title} onChange={setTitle} error={errors.title}
          placeholder="e.g. Call client about proposal"
        />
        {/* Date AND time — `new Date('yyyy-MM-ddTHH:mm')` parses as LOCAL, so the
            ISO sent to the API is the exact instant the user picked. */}
        <DateTimePicker
          label="Due Date & Time" id="reminder-date" required
          value={dueDate} onChange={setDueDate} error={errors.dueDate}
        />
        <TextareaField
          label="Notes (optional)" id="reminder-notes" rows={3}
          value={notes} onChange={setNotes}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSaving}>Schedule</Button>
        </div>
      </form>
    </Modal>
  );
}
