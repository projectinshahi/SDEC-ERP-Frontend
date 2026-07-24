'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckSquare, Check } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { TextareaField } from '@/components/ui/TextareaField';
import { getStageChecklist, getStageNotesLabel } from '@/lib/data/stageTransitionChecklists';

export interface TransitionStep { fromStage: string; toStage: string; checklist: string[]; description: string }

// ponytail: fixed funnel — linear NQL→…→SAL, with WON/HOLD/LOST as branches off SAL.
// Matches the 8-stage checklist taxonomy; revisit only if stages become admin-configurable.
const FUNNEL = ['NQL', 'MQL', 'SQL', 'PQL', 'SAL'];
const TERMINALS = ['WON', 'HOLD', 'LOST'];
const NAV = [...FUNNEL, ...TERMINALS];

/** Every required transition from→to. Terminal targets walk the funnel to SAL then exit
 *  (SAL→terminal). Backward / same / unknown collapses to a single direct move. */
export function buildSteps(from: string, to: string): { from: string; to: string }[] {
  const P = (a: string, b: string) => ({ from: a, to: b });
  const fi = FUNNEL.indexOf(from);
  if (TERMINALS.includes(to)) {
    if (from === 'SAL' || fi < 0) return [P(from, to)];
    const steps = [];
    for (let i = fi; i < FUNNEL.length - 1; i++) steps.push(P(FUNNEL[i], FUNNEL[i + 1]));
    steps.push(P('SAL', to));
    return steps;
  }
  const ti = FUNNEL.indexOf(to);
  if (fi < 0 || ti < 0 || ti <= fi) return [P(from, to)];
  const steps = [];
  for (let i = fi; i < ti; i++) steps.push(P(FUNNEL[i], FUNNEL[i + 1]));
  return steps;
}

interface StageTransitionDialogProps {
  isOpen: boolean;
  opportunityName: string;
  fromStage: string;
  toStage: string;
  isSaving?: boolean;
  onConfirm: (steps: TransitionStep[]) => void;
  onCancel: () => void;
}

/**
 * Stage Transition Dialog with a persistent Stage Navigator (Salesforce-style path). The full
 * lifecycle is always shown; clicking any forward stage retargets the walk. The system executes
 * every intermediate transition sequentially (each its own checklist + notes) and only commits
 * on the final Finish — a single atomic save; Cancel persists nothing.
 */
export function StageTransitionDialog({
  isOpen, opportunityName, fromStage, toStage, isSaving, onConfirm, onCancel,
}: StageTransitionDialogProps) {
  const [target, setTarget] = useState(toStage);
  const [stepIdx, setStepIdx] = useState(0);
  const [results, setResults] = useState<{ checklist: string[]; description: string }[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState('');

  const reset = (t: string) => { setTarget(t); setStepIdx(0); setResults([]); setChecked(new Set()); setDescription(''); };
  useEffect(() => { if (isOpen) reset(toStage); }, [isOpen, fromStage, toStage]);

  const steps = useMemo(() => buildSteps(fromStage, target), [fromStage, target]);

  if (!isOpen) return null;

  const step = steps[stepIdx] ?? { from: fromStage, to: target };
  const items = getStageChecklist(step.from, step.to);
  const notesLabel = getStageNotesLabel(step.from, step.to);
  const multi = steps.length > 1;
  const isLast = stepIdx >= steps.length - 1;

  // Navigator state: stages already walked this session (origin + finished destinations).
  const walked = new Set<string>([steps[0]?.from ?? fromStage, ...steps.slice(0, stepIdx).map((s) => s.to)]);
  const canTarget = (s: string) => {
    if (s === fromStage || walked.has(s)) return false;
    if (TERMINALS.includes(s)) return FUNNEL.indexOf(fromStage) >= 0 || fromStage === 'SAL';
    return FUNNEL.indexOf(s) > FUNNEL.indexOf(fromStage);
  };

  const toggle = (id: string) =>
    setChecked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const current = () => ({ checklist: items.filter((i) => checked.has(i.id)).map((i) => i.label), description: description.trim() });

  const advance = () => {
    if (isLast) {
      const all = [...results]; all[stepIdx] = current();
      onConfirm(steps.map((s, i) => ({ fromStage: s.from, toStage: s.to, checklist: all[i]?.checklist ?? [], description: all[i]?.description ?? '' })));
    } else {
      setResults((r) => { const n = [...r]; n[stepIdx] = current(); return n; });
      setStepIdx((i) => i + 1); setChecked(new Set()); setDescription('');
    }
  };

  const btnLabel = isSaving ? 'Saving…' : !multi ? 'Save Transition' : isLast ? 'Finish' : 'Next';

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Move Opportunity" size="lg">
      <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">{opportunityName}</p>

        {/* Stage Navigator — full lifecycle, click any forward stage to retarget */}
        <div className="flex items-center gap-1 flex-wrap p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700">
          {NAV.map((s, i) => {
            const done = walked.has(s);
            const active = s === step.to;
            const clickable = canTarget(s);
            return (
              <div key={s} className="flex items-center">
                {i > 0 && <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 mx-0.5 shrink-0" />}
                <button
                  type="button"
                  disabled={!clickable || isSaving}
                  onClick={() => reset(s)}
                  title={clickable ? `Move to ${s}` : undefined}
                  className={[
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors',
                    done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : active ? 'bg-blue-600 text-white'
                      : clickable ? 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:text-blue-600 cursor-pointer'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed',
                  ].join(' ')}
                >
                  {done && <Check className="w-3 h-3 shrink-0" />}{s}
                </button>
              </div>
            );
          })}
        </div>

        {/* Current transition header + progress */}
        <div className="flex items-center gap-3 flex-wrap">
          {multi && <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Step {stepIdx + 1} of {steps.length}</span>}
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">{step.from}</span>
          <ArrowRight className="w-5 h-5 text-gray-400 shrink-0" />
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{step.to}</span>
        </div>

        {items.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-2">
              <CheckSquare className="w-4 h-4 text-gray-400" /> Checklist
              <span className="text-xs font-normal text-gray-400">(optional)</span>
            </p>
            <div className="space-y-1.5">
              {items.map((item) => (
                <label key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
                  <input type="checkbox" checked={checked.has(item.id)} onChange={() => toggle(item.id)} className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-200 select-none">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <TextareaField
          label={notesLabel}
          id="stage-transition-notes"
          value={description}
          onChange={setDescription}
          rows={4}
          placeholder="Meeting summary, customer feedback, reason for the move…"
        />

        <p className="text-xs text-gray-400">Nothing here is required — you can continue with no selections and no notes.</p>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-5 mt-1 border-t border-gray-100 dark:border-gray-700">
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>Cancel</Button>
        <Button onClick={advance} disabled={isSaving}>{btnLabel}</Button>
      </div>
    </Modal>
  );
}
