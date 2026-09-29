'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/marketing/FieldError';
import { classNames } from '@/lib/utils';
import { useToast } from '@/lib/hooks/useToast';
import { useConfirm } from '@/lib/hooks/useConfirm';
import {
  collect, hasErrors, requiredText, validDate, validTime, fieldErrorsFromApi, invalidInputCls,
  type FieldErrors,
} from '@/lib/marketing/contentValidation';
import type { UserDbResponse } from '@/lib/api/users';
import {
  createProjectEvent, updateProjectEvent, deleteProjectEvent,
  type MarketingEvent, type EventTypeOption,
} from '@/lib/api/marketingProjects';

/**
 * MK-001.3 — Calendar event create / edit / delete.
 *
 * Validation mirrors the server's rules (title, date, end-after-start) so the
 * offending FIELD is marked rather than the whole form failing with one toast —
 * but the server re-validates regardless, and any field errors it returns are
 * mapped back onto the same inputs.
 *
 * Delete goes through the app-wide confirmation dialog, which owns the loading
 * state and the double-click guard.
 */

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30';
const labelCls = 'mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300';

export interface EventDraft {
  event?: MarketingEvent;   // present = edit
  date: string;             // 'YYYY-MM-DD'
  time: string | null;      // 'HH:MM' or null for all-day
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  draft: EventDraft | null;
  eventTypes: EventTypeOption[];
  users: UserDbResponse[];
  canWrite: boolean;
  /** Called after a successful create/update/delete so the page can refetch. */
  onSaved: () => void;
}

export function EventFormModal({
  isOpen, onClose, projectId, draft, eventTypes, users, canWrite, onSaved,
}: Props) {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  /* Seeded once, at mount. The parent remounts this component (via `key`) for
     every new draft, so reopening for a DIFFERENT event structurally cannot
     show the previous one's values — no reset effect, and no window where the
     old draft is still on screen. */
  const [form, setForm] = useState(() => ({
    title: draft?.event?.title ?? '',
    date: draft?.event?.date ?? draft?.date ?? '',
    startTime: draft?.event?.startTime ?? draft?.time ?? '',
    endTime: draft?.event?.endTime ?? '',
    eventType: draft?.event?.eventType ?? '',
    assigneeId: draft?.event?.assigneeId != null ? String(draft.event.assigneeId) : '',
    notes: draft?.event?.notes ?? '',
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const editing = !!draft?.event;

  const set = (k: keyof typeof form) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: ev.target.value }));

  const validate = (): FieldErrors => {
    const errs = collect({
      title: requiredText(form.title, 'Title'),
      date: requiredText(form.date, 'Date') ?? validDate(form.date, 'Date'),
      startTime: validTime(form.startTime, 'Start time')
        // An end with no start has no meaning — the server rejects it too.
        ?? (!form.startTime && form.endTime ? 'Add a start time, or clear the end time.' : undefined),
      endTime: validTime(form.endTime, 'End time')
        ?? (form.startTime && form.endTime && form.endTime <= form.startTime
          ? 'End time must be after the start time.' : undefined),
    });
    return errs;
  };

  const onSubmit = async () => {
    const errs = validate();
    setErrors(errs);
    if (hasErrors(errs)) return;

    setSaving(true);                       // also blocks double-submit
    try {
      const payload = {
        title: form.title.trim(),
        date: form.date,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        eventType: form.eventType || null,
        assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        notes: form.notes.trim() || null,
      };
      if (editing) await updateProjectEvent(projectId, draft!.event!.id, payload);
      else await createProjectEvent(projectId, payload);

      toast(editing ? 'Event updated successfully' : 'Event created successfully', 'success');
      onSaved();
      onClose();
    } catch (err) {
      const mapped = fieldErrorsFromApi(err);
      setErrors(mapped);
      if (!hasErrors(mapped)) {
        toast((err as { details?: { error?: string } })?.details?.error
          || `Unable to ${editing ? 'update' : 'create'} the event`, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!draft?.event) return;
    await confirm({
      title: 'Delete event',
      message: `Delete "${draft.event.title}"? It is removed from the project calendar and this cannot be undone.`,
      confirmLabel: 'Delete',
      intent: 'danger',
      onConfirm: async () => {
        await deleteProjectEvent(projectId, draft.event!.id);
        toast('Event deleted successfully', 'success');
        onSaved();
        onClose();
      },
    });
  };

  const readOnly = !canWrite;

  return (
    <Modal
      confirmDiscard
      isOpen={isOpen}
      onClose={onClose}
      busy={saving}
      title={editing ? 'Edit event' : 'New event'}
      size="md"
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="ev-title" className={labelCls}>Title <span className="text-rose-500">*</span></label>
          <input id="ev-title" value={form.title} onChange={set('title')} disabled={readOnly}
            aria-invalid={!!errors.title} maxLength={255}
            className={classNames(inputCls, errors.title && invalidInputCls)} placeholder="e.g. Product shoot" />
          <FieldError message={errors.title} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="ev-date" className={labelCls}>Date <span className="text-rose-500">*</span></label>
            <input id="ev-date" type="date" value={form.date} onChange={set('date')} disabled={readOnly}
              aria-invalid={!!errors.date}
              className={classNames(inputCls, errors.date && invalidInputCls)} />
            <FieldError message={errors.date} />
          </div>
          <div>
            <label htmlFor="ev-start" className={labelCls}>Start time</label>
            <input id="ev-start" type="time" value={form.startTime} onChange={set('startTime')} disabled={readOnly}
              aria-invalid={!!errors.startTime}
              className={classNames(inputCls, errors.startTime && invalidInputCls)} />
            <FieldError message={errors.startTime} />
          </div>
          <div>
            <label htmlFor="ev-end" className={labelCls}>End time</label>
            {/* min pairs the pickers so the widget itself cannot offer an order
                the server would reject. */}
            <input id="ev-end" type="time" value={form.endTime} onChange={set('endTime')} disabled={readOnly}
              min={form.startTime || undefined} aria-invalid={!!errors.endTime}
              className={classNames(inputCls, errors.endTime && invalidInputCls)} />
            <FieldError message={errors.endTime} />
          </div>
        </div>
        <p className="-mt-1 text-[11px] text-gray-400">
          Leave both times blank for an all-day event. A start time with no end lasts one hour.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-type" className={labelCls}>Event type</label>
            <select id="ev-type" value={form.eventType} onChange={set('eventType')} disabled={readOnly}
              aria-invalid={!!errors.eventType}
              className={classNames(inputCls, errors.eventType && invalidInputCls)}>
              <option value="">Not set</option>
              {eventTypes.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <FieldError message={errors.eventType} />
          </div>
          <div>
            <label htmlFor="ev-assignee" className={labelCls}>Assigned to</label>
            <select id="ev-assignee" value={form.assigneeId} onChange={set('assigneeId')} disabled={readOnly}
              className={classNames(inputCls, errors.assigneeId && invalidInputCls)}>
              <option value="">Unassigned</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <FieldError message={errors.assigneeId} />
          </div>
        </div>

        <div>
          <label htmlFor="ev-notes" className={labelCls}>Notes</label>
          <textarea id="ev-notes" value={form.notes} onChange={set('notes')} disabled={readOnly} rows={3}
            className={classNames(inputCls, 'resize-y')} placeholder="Anything the team needs to know" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div>
            {editing && canWrite && (
              <Button variant="danger" onClick={() => void onDelete()} disabled={saving}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            {canWrite && (
              <Button onClick={() => void onSubmit()} isLoading={saving}>
                {editing ? 'Save changes' : 'Create event'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
