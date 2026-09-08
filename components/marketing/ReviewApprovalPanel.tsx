'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Lock, ShieldCheck, RotateCcw, Link2 } from 'lucide-react';
import { classNames } from '@/lib/utils';
import {
  APPROVAL_STATUSES, APPROVAL_LABELS, NOTES_REQUIRED, OUTCOME_STAGE_LABEL,
  type ApprovalStatus, type MarketingContent, type ReviewChecklistState, type ReviewChecklistItem,
} from '@/lib/api/marketingContent';

/**
 * M07 #34/#35 — internal review checklist + Approver panel.
 *
 * Every rule shown here is ALSO enforced server-side (assigned-Approver identity,
 * stage, checklist completeness, mandatory revision notes). The UI mirrors those
 * rules so the affordances are honest; it never becomes the enforcement point.
 */

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const STATUS_BADGE: Record<string, string> = {
  pending: 'border-gray-200 bg-gray-50 text-gray-600',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  changes_requested: 'border-amber-200 bg-amber-50 text-amber-700',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
};

export function ApprovalStatusBadge({ status }: { status: string | null | undefined }) {
  const key = (status ?? 'pending') as ApprovalStatus;
  return (
    <span className={classNames(
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
      STATUS_BADGE[key] ?? STATUS_BADGE.pending,
    )}>
      {key === 'approved' ? <CheckCircle2 className="h-3 w-3" />
        : key === 'rejected' ? <XCircle className="h-3 w-3" />
          : key === 'changes_requested' ? <RotateCcw className="h-3 w-3" /> : null}
      {APPROVAL_LABELS[key] ?? key}
    </span>
  );
}

/* ── #34 checklist ─────────────────────────────────────────────────────────── */

export function ReviewChecklist({ state, canCheck, busyItem, onToggle }: {
  state: ReviewChecklistState;
  canCheck: boolean;
  busyItem: string | null;
  onToggle: (item: ReviewChecklistItem, checked: boolean) => void;
}) {
  const done = state.items.filter((i) => i.checked).length;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          Internal Review Checklist
        </p>
        <span className={classNames(
          'rounded-full px-2 py-0.5 text-[11px] font-bold leading-none',
          state.complete ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        )}>
          {done}/{state.items.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {state.items.map((item) => (
          <li
            key={item.key}
            className="flex items-start gap-2 rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2"
          >
            <input
              id={`rc-${item.key}`}
              type="checkbox"
              checked={item.checked}
              disabled={!canCheck || busyItem === item.key}
              onChange={(e) => onToggle(item, e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            <label htmlFor={`rc-${item.key}`} className="min-w-0 flex-1 cursor-pointer">
              <span className="block text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
              {/* Audit attribution for the CURRENT check. The historical record of
                  every tick lives in the revision log and is never cleared. */}
              {item.checked && (item.checkedByName || item.checkedAt) && (
                <span className="block text-[11px] text-gray-400">
                  Checked by {item.checkedByName ?? 'Unknown'}
                  {item.checkedAt ? ` · ${dateTime(item.checkedAt)}` : ''}
                </span>
              )}
            </label>
            {busyItem === item.key && <Loader2 className="mt-0.5 h-3.5 w-3.5 animate-spin text-gray-400" />}
          </li>
        ))}
      </ul>
      {!canCheck && (
        <p className="text-xs italic text-gray-400">
          Read-only — completing the review checklist requires Edit Content, or being this card&apos;s Approver.
        </p>
      )}
    </div>
  );
}

/* ── #35 read-only Approver view ───────────────────────────────────────────── */

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      {value ? (
        <p className="whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">{value}</p>
      ) : (
        <p className="text-sm text-gray-400">Not provided</p>
      )}
    </div>
  );
}

/**
 * The Approver reads the card here. These are rendered as TEXT, not as disabled
 * inputs, so there is no editable control to re-enable and nothing to submit —
 * the Approver cannot modify card content through this view at all.
 */
export function ApproverReadOnlyView({ content }: { content: MarketingContent }) {
  const copy = (content.copy_data ?? {}) as Record<string, string | undefined>;
  const cd = content.creative_direction ?? {};
  const styleTone = [cd.styleTone, cd.styleToneCustom].filter(Boolean).join(' · ') || null;
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
        <Lock className="h-3.5 w-3.5" /> Approver view — read only
      </p>

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-400">Brief</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ReadOnlyField label="Title" value={content.title} />
          <ReadOnlyField label="Objective" value={content.objective} />
          <ReadOnlyField label="Target Audience" value={content.target_audience} />
          <ReadOnlyField label="CTA" value={content.cta} />
          <div className="sm:col-span-2"><ReadOnlyField label="Description" value={content.description} /></div>
          <div className="sm:col-span-2"><ReadOnlyField label="Core Message" value={content.strategy_data?.coreMessage} /></div>
        </div>
      </div>

      <div className="space-y-2 border-t border-gray-200 dark:border-gray-800 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-400">Copy</p>
        <ReadOnlyField label="Main Copy" value={copy.mainCopy} />
        <ReadOnlyField label="Supporting Info" value={copy.supportingInfo} />
        <ReadOnlyField label="Required Text" value={copy.requiredText} />
        {!!copy.referenceLinks && Array.isArray(copy.referenceLinks) && (copy.referenceLinks as unknown as string[]).length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Reference Links</p>
            <ul className="space-y-0.5">
              {(copy.referenceLinks as unknown as string[]).map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noopener noreferrer" className="break-all text-xs font-medium text-cyan-600 hover:underline">{u}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-gray-200 dark:border-gray-800 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-400">Creative Direction</p>
        <ReadOnlyField label="Style / Tone" value={styleTone} />
        <ReadOnlyField label="Brand Requirements" value={cd.brandRequirements} />
        <ReadOnlyField label="Special Instructions" value={cd.specialInstructions} />
        {!!cd.visualReferences?.length && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Visual References</p>
            <ul className="space-y-0.5">
              {cd.visualReferences.map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noopener noreferrer" className="break-all text-xs font-medium text-cyan-600 hover:underline">{u}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-1 border-t border-gray-200 dark:border-gray-800 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700 dark:text-cyan-400">Work Output Links</p>
        {content.workOutputs?.length ? (
          <ul className="space-y-1">
            {content.workOutputs.map((w) => (
              <li key={w.id} className="min-w-0">
                <p className="truncate text-xs font-semibold text-gray-700 dark:text-gray-300" title={w.label}>{w.label}</p>
                <a href={w.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1 break-all text-xs font-medium text-cyan-600 hover:underline">
                  <Link2 className="mt-0.5 h-3 w-3 shrink-0" />{w.url}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No Work Output recorded.</p>
        )}
      </div>
    </div>
  );
}

/* ── #35/#36 decision panel ────────────────────────────────────────────────── */

export function ApprovalActionPanel({ current, checklistComplete, saving, onSubmit }: {
  current: string | null | undefined;
  checklistComplete: boolean;
  saving: boolean;
  onSubmit: (status: ApprovalStatus, notes: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<ApprovalStatus>((current as ApprovalStatus) ?? 'pending');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const notesRequired = NOTES_REQUIRED.includes(status);
  // Approval is the only outcome gated on the checklist — mirroring the server.
  const blockedByChecklist = status === 'approved' && !checklistComplete;
  const disabled = saving || status === 'pending' || blockedByChecklist || (notesRequired && !notes.trim());

  const submit = async () => {
    setError(null);
    try {
      await onSubmit(status, notes.trim());
      setNotes('');
    } catch (err) {
      setError((err as { details?: { error?: string } } | null)?.details?.error || 'Could not save the decision.');
    }
  };

  return (
    <div className="space-y-2.5">
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300" htmlFor="approval-status">
          Decision
        </label>
        <select
          id="approval-status"
          value={status}
          onChange={(e) => { setStatus(e.target.value as ApprovalStatus); setError(null); }}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200"
        >
          {APPROVAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {APPROVAL_LABELS[s]}{OUTCOME_STAGE_LABEL[s] ? ` → ${OUTCOME_STAGE_LABEL[s]}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300" htmlFor="revision-notes">
          Revision Notes {notesRequired && <span className="text-rose-600">*</span>}
        </label>
        <textarea
          id="revision-notes"
          value={notes}
          onChange={(e) => { setNotes(e.target.value); if (error) setError(null); }}
          rows={3}
          placeholder={notesRequired ? 'Required — what must change, and why' : 'Optional note recorded with the decision'}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        />
      </div>

      {blockedByChecklist && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          All six review checklist items must be completed before this card can be approved.
        </p>
      )}
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
      >
        {saving && <Loader2 className="h-3 w-3 animate-spin" />}
        <ShieldCheck className="h-3.5 w-3.5" />
        Submit decision
      </button>
    </div>
  );
}
