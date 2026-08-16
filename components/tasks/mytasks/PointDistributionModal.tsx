'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { AlertTriangle, Users } from 'lucide-react';
import type { MyTask, PointAllocation } from '@/lib/api/myTasks';

/**
 * Point Distribution — shown when approving a task that has MORE THAN ONE
 * assignee and carries Estimated Points. The approver ticks whoever actually
 * contributed and splits the points between them; the task is not approved until
 * the split adds up exactly.
 *
 * Single-assignee tasks never reach this modal — the caller approves directly.
 * The same total rule is re-checked server-side, so this is guidance, not the
 * enforcement point.
 */

/** Even split of `pts` (decimals allowed) across ids to 2 dp; the first member
 *  absorbs the rounding remainder so the allocations always sum EXACTLY to `pts`. */
function evenSplit(ids: number[], pts: number): Record<number, string> {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const base = r2(pts / ids.length);
  const first = r2(pts - base * (ids.length - 1));
  const next: Record<number, string> = {};
  ids.forEach((id, i) => { next[id] = String(i === 0 ? first : base); });
  return next;
}
export function PointDistributionModal({
  isOpen, task, saving, onCancel, onConfirm,
}: {
  isOpen: boolean;
  task: MyTask | null;
  saving?: boolean;
  onCancel: () => void;
  onConfirm: (allocations: PointAllocation[]) => void;
}) {
  const total = task?.estimatedPoints || 0;
  const members = useMemo(() => task?.members ?? [], [task]);

  // userId → points as typed ('' = selected but not yet given a value).
  const [alloc, setAlloc] = useState<Record<number, string>>({});

  // Preselect everyone with an even split — the common case is "we all worked on
  // it", and any remainder goes to the first member so the total always starts valid.
  useEffect(() => {
    if (!isOpen || !task) return;
    const ids = (task.members ?? []).map((m) => m.id);
    const pts = task.estimatedPoints || 0;
    if (!ids.length || !pts) { setAlloc({}); return; }
    setAlloc(evenSplit(ids, pts));
  }, [isOpen, task]);

  const selected = Object.entries(alloc).filter(([, v]) => v !== '');
  const allocated = Math.round(selected.reduce((s, [, v]) => s + (Number(v) || 0), 0) * 100) / 100;
  // Decimals allowed → compare with a small tolerance (mirrors the server check).
  const balanced = Math.abs(allocated - total) < 0.001 && selected.some(([, v]) => Number(v) > 0);

  const toggle = (id: number) => {
    setAlloc((prev) => {
      const next = { ...prev };
      if (next[id] !== undefined) delete next[id];
      else next[id] = '0';
      return next;
    });
  };

  const splitEvenly = () => {
    const ids = selected.length ? selected.map(([k]) => Number(k)) : members.map((m) => m.id);
    if (!ids.length) return;
    setAlloc(evenSplit(ids, total));
  };

  if (!isOpen || !task) return null;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Distribute Points" size="md">
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Estimated Points: <strong className="text-gray-700 dark:text-gray-200">{total}</strong></span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {members.length} assigned
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-300">Who earned these points?</p>
          <button type="button" onClick={splitEvenly} className="text-xs font-semibold text-blue-600 hover:underline">
            Split evenly
          </button>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {members.map((m) => {
            const on = alloc[m.id] !== undefined;
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 rounded-lg border p-2.5 transition-colors ${
                  on ? 'border-blue-300 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(m.id)}
                  aria-label={`Include ${m.name}`}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">{m.name}</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  disabled={!on}
                  value={on ? alloc[m.id] : ''}
                  onChange={(e) => setAlloc((p) => ({ ...p, [m.id]: e.target.value }))}
                  aria-label={`Points for ${m.name}`}
                  className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm disabled:bg-gray-50 disabled:text-gray-300 dark:border-gray-700 dark:bg-gray-800 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            );
          })}
        </div>

        <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold ${
          balanced ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
                   : 'bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300'
        }`}>
          <span>Allocated</span>
          <span className="tabular-nums">{allocated} / {total}</span>
        </div>

        {!balanced && (
          <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            The total allocated points must equal the task&apos;s Estimated Points before approval.
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button
            type="button"
            disabled={!balanced || saving}
            isLoading={saving}
            onClick={() => onConfirm(
              selected
                .map(([id, v]) => ({ userId: Number(id), points: Number(v) || 0 }))
                .filter((a) => a.points > 0),
            )}
          >
            Approve &amp; Award
          </Button>
        </div>
      </div>
    </Modal>
  );
}
