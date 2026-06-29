'use client';

/**
 * Target Management — create / edit a sales target.
 *
 * A manager-facing form over the EXISTING setTarget upsert endpoint (single
 * source of truth): captures an optional name + description, the assigned BDE,
 * the metric type, the period (monthly / quarterly / yearly) and the revenue/
 * count target. Achievement is never entered — it is computed live from deals.
 */

import { useEffect, useMemo, useState } from 'react';
import { Target as TargetIcon } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { TextareaField } from '@/components/ui/TextareaField';
import { useToast } from '@/lib/hooks/useToast';
import { setTarget } from '@/lib/api/bdeDashboard';
import { TARGET_TYPE_LABELS } from '@/lib/types/salesExecution';
import type { TargetType, PeriodType, TargetListEntry } from '@/lib/types/salesExecution';

interface OwnerOption {
  id: number;
  name: string;
}

interface TargetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** When set, the modal is in EDIT mode (owner + period are locked). */
  editTarget?: TargetListEntry | null;
  /** Assignable BDEs for the "Assigned BDE" picker (create mode). */
  owners: OwnerOption[];
}

const TYPE_OPTIONS = (Object.keys(TARGET_TYPE_LABELS) as TargetType[]).map((value) => ({
  value,
  label: TARGET_TYPE_LABELS[value],
}));

const PERIOD_TYPE_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const QUARTER_OPTIONS = [
  { value: 'Q1', label: 'Q1 (Jan–Mar)' },
  { value: 'Q2', label: 'Q2 (Apr–Jun)' },
  { value: 'Q3', label: 'Q3 (Jul–Sep)' },
  { value: 'Q4', label: 'Q4 (Oct–Dec)' },
];

function currentDefaults() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const quarter = `Q${Math.floor(now.getMonth() / 3) + 1}`;
  return { year, month, quarter };
}

export function TargetFormModal({ isOpen, onClose, onSaved, editTarget, owners }: TargetFormModalProps) {
  const { toast } = useToast();
  const isEdit = !!editTarget;

  const [name, setName] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [type, setType] = useState<TargetType>('revenue');
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [monthlyPeriod, setMonthlyPeriod] = useState('');
  const [year, setYear] = useState('');
  const [quarter, setQuarter] = useState('Q1');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // (Re)seed the form whenever it opens or the edited target changes.
  useEffect(() => {
    if (!isOpen) return;
    const d = currentDefaults();
    if (editTarget) {
      setName(editTarget.name ?? '');
      setOwnerId(String(editTarget.ownerId));
      setType(editTarget.type);
      setPeriodType(editTarget.periodType);
      setAmount(editTarget.targetAmount > 0 ? String(editTarget.targetAmount) : '');
      setDescription(editTarget.description ?? '');
      // Decode the period string back into the granular inputs.
      const p = editTarget.period;
      if (editTarget.periodType === 'monthly') { setMonthlyPeriod(p); setYear(p.slice(0, 4)); setQuarter(d.quarter); }
      else if (editTarget.periodType === 'quarterly') { setYear(p.slice(0, 4)); setQuarter(p.slice(5) || 'Q1'); setMonthlyPeriod(d.month); }
      else { setYear(p.slice(0, 4)); setMonthlyPeriod(d.month); setQuarter(d.quarter); }
    } else {
      setName('');
      setOwnerId('');
      setType('revenue');
      setPeriodType('monthly');
      setMonthlyPeriod(d.month);
      setYear(d.year);
      setQuarter(d.quarter);
      setAmount('');
      setDescription('');
    }
    setError('');
    // `owners` is deliberately NOT a dependency — it arrives async from the
    // parent and a new array identity each render; depending on it would wipe
    // in-progress input. Single-owner auto-select is handled separately below.
  }, [isOpen, editTarget]);

  // Auto-select the sole BDE once owners load (create mode), without clobbering a
  // selection the user already made.
  useEffect(() => {
    if (!isOpen || editTarget) return;
    if (!ownerId && owners.length === 1) setOwnerId(String(owners[0].id));
  }, [isOpen, editTarget, owners, ownerId]);

  const isRevenue = type === 'revenue';

  const resolvedPeriod = useMemo(() => {
    if (periodType === 'yearly') return year;
    if (periodType === 'quarterly') return `${year}-${quarter}`;
    return monthlyPeriod;
  }, [periodType, year, quarter, monthlyPeriod]);

  const ownerOptions = useMemo(
    () => [{ value: '', label: 'Select a BDE…' }, ...owners.map((o) => ({ value: String(o.id), label: o.name }))],
    [owners],
  );

  const handleSave = async () => {
    if (!isEdit && !ownerId) {
      setError('Select the BDE this target is assigned to.');
      return;
    }
    const parsed = Number(amount);
    if (!amount.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setError(isRevenue ? 'Enter a target amount greater than zero.' : 'Enter a target count greater than zero.');
      return;
    }
    if (periodType === 'yearly' && !/^\d{4}$/.test(year)) {
      setError('Enter a valid 4-digit year.');
      return;
    }
    if (periodType === 'quarterly' && !/^\d{4}$/.test(year)) {
      setError('Enter a valid 4-digit year for the quarter.');
      return;
    }
    if (periodType === 'monthly' && !/^\d{4}-\d{2}$/.test(resolvedPeriod)) {
      setError('Enter a valid month (YYYY-MM).');
      return;
    }
    try {
      setIsSaving(true);
      await setTarget({
        targetAmount: parsed,
        type,
        period: resolvedPeriod,
        periodType,
        ownerId: Number(ownerId),
        name: name.trim() || null,
        description: description.trim() || null,
      });
      toast(isEdit ? 'Target updated' : 'Target created', 'success');
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save target', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Target' : 'New Target'} size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
          <TargetIcon size={18} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
            Achievement is calculated automatically from won deals in the period — you only set the target.
          </p>
        </div>

        <InputField
          id="target-name"
          label="Target Name"
          placeholder="e.g. Q3 Revenue Push"
          value={name}
          onChange={(v) => { setName(v); if (error) setError(''); }}
        />

        {isEdit ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Assigned BDE</label>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
              {editTarget?.ownerName ?? `User #${editTarget?.ownerId}`}
            </div>
          </div>
        ) : (
          <SelectField
            id="target-owner"
            label="Assigned BDE"
            required
            options={ownerOptions}
            value={ownerId}
            onChange={(v) => { setOwnerId(v); if (error) setError(''); }}
          />
        )}

        {/* In edit mode the metric type + period identify the target row (the
            setTarget upsert key), so they are locked — only name / amount /
            description can change. Editing them would create a new orphan row. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            id="target-type"
            label="Target Type"
            options={TYPE_OPTIONS}
            value={type}
            disabled={isEdit}
            onChange={(v) => { setType(v as TargetType); if (error) setError(''); }}
          />
          <SelectField
            id="target-period-type"
            label="Period"
            options={PERIOD_TYPE_OPTIONS}
            value={periodType}
            disabled={isEdit}
            onChange={(v) => { setPeriodType(v as PeriodType); if (error) setError(''); }}
          />
        </div>

        {periodType === 'monthly' && (
          <InputField
            id="target-month"
            label="Month"
            type="month"
            value={monthlyPeriod}
            disabled={isEdit}
            onChange={(v) => { setMonthlyPeriod(v); if (error) setError(''); }}
          />
        )}

        {periodType === 'quarterly' && (
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              id="target-quarter"
              label="Quarter"
              options={QUARTER_OPTIONS}
              value={quarter}
              disabled={isEdit}
              onChange={(v) => { setQuarter(v); if (error) setError(''); }}
            />
            <InputField
              id="target-quarter-year"
              label="Year"
              type="number"
              min={2000}
              placeholder="e.g. 2026"
              value={year}
              disabled={isEdit}
              onChange={(v) => { setYear(v); if (error) setError(''); }}
            />
          </div>
        )}

        {periodType === 'yearly' && (
          <InputField
            id="target-year"
            label="Year"
            type="number"
            min={2000}
            placeholder="e.g. 2026"
            value={year}
            disabled={isEdit}
            onChange={(v) => { setYear(v); if (error) setError(''); }}
          />
        )}

        <InputField
          id="target-amount"
          label={isRevenue ? 'Revenue Target (INR)' : 'Target (count)'}
          type="number"
          min={0}
          placeholder={isRevenue ? 'e.g. 1000000' : 'e.g. 25'}
          value={amount}
          onChange={(v) => { setAmount(v); if (error) setError(''); }}
          required
        />

        <TextareaField
          id="target-description"
          label="Description"
          rows={2}
          placeholder="Optional context for this target…"
          value={description}
          onChange={setDescription}
        />

        {error && <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            {isEdit ? 'Save Changes' : 'Create Target'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
