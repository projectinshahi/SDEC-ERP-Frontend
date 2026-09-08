'use client';

import { useState } from 'react';
import { Loader2, Undo2 } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { CONTENT_STAGES, BLOCKED_STAGE } from '@/lib/api/marketingContent';

/**
 * M06 #29 — the mandatory reason prompt for a BACKWARD stage move.
 *
 * Reuses the existing shared Modal. It asks BEFORE anything is persisted or
 * optimistically moved, so closing it leaves the card exactly where it was; the
 * caller only moves the card when `onConfirm` resolves.
 *
 * This is an affordance, not the enforcement point: the server recomputes the
 * direction from the persisted stage and rejects a reasonless backward move
 * regardless of what the UI did.
 *
 * Callers pass a `key` derived from the request, so each new backward move
 * mounts a fresh instance — a previous reason can never be carried over, and no
 * resetting effect is needed.
 */

const stageLabel = (key: string | null): string =>
  [...CONTENT_STAGES, BLOCKED_STAGE].find((s) => s.key === key)?.label ?? key ?? '';

export interface StageBackRequest {
  cardId: number;
  cardTitle: string;
  from: string;
  to: string;
}

export function StageBackReasonModal({ request, onCancel, onConfirm }: {
  request: StageBackRequest | null;
  onCancel: () => void;
  /** Resolve to close; reject/throw to keep the modal open with the error shown. */
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!request) return null;

  const submit = async () => {
    // Whitespace-only is rejected here AND on the server.
    if (!reason.trim()) { setError('A reason is required to move this card backward.'); return; }
    setSaving(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError((err as { details?: { error?: string } } | null)?.details?.error || 'Could not move the card.');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={saving ? () => {} : onCancel} title="Reason required" size="md">
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
          <Undo2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            You are moving <b>{request.cardTitle}</b> backward from{' '}
            <b>{stageLabel(request.from)}</b> to <b>{stageLabel(request.to)}</b>. A reason is
            required and is recorded in the card&apos;s stage history.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300" htmlFor="stage-back-reason">
            Reason <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="stage-back-reason"
            autoFocus
            value={reason}
            onChange={(e) => { setReason(e.target.value); if (error) setError(null); }}
            rows={3}
            placeholder="e.g. Client requested a revision to the creative direction."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
          />
          {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !reason.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />} Move card
          </button>
        </div>
      </div>
    </Modal>
  );
}
