'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { useToast } from '@/lib/hooks/useToast';
import { setTarget } from '@/lib/api/bdeDashboard';
import { TARGET_TYPE_LABELS } from '@/lib/types/salesExecution';
import type { TargetType, PeriodType } from '@/lib/types/salesExecution';

interface SetTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAmount: number;
  period: string;
  onSaved: () => void;
  /** Optional: set a target for a specific BDE (managers). */
  ownerId?: number;
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

/** Derive YYYY-MM / current year / current quarter from a base monthly period (YYYY-MM). */
function deriveDefaults(period: string) {
  const now = new Date();
  const yearFromPeriod = /^\d{4}-\d{2}$/.test(period) ? period.slice(0, 4) : String(now.getFullYear());
  const monthFromPeriod = /^\d{4}-\d{2}$/.test(period) ? period : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentQuarter = `Q${Math.floor(now.getMonth() / 3) + 1}`;
  return { yearFromPeriod, monthFromPeriod, currentQuarter };
}

/**
 * Modal to set/update a sales target for a given period (SE-040/041).
 *
 * Supports a metric TYPE (revenue / deal_count / calls / meetings / conversions)
 * and a period granularity (monthly / quarterly / yearly). The amount label and
 * formatting switch between INR (revenue) and plain counts for everything else.
 *
 * Keeps the original props/behaviour: when nothing is changed it defaults to a
 * revenue + monthly target using the passed `period`, so the BDE dashboard keeps
 * working unchanged.
 */
export function SetTargetModal({ isOpen, onClose, currentAmount, period, onSaved, ownerId }: SetTargetModalProps) {
  const { toast } = useToast();
  const defaults = useMemo(() => deriveDefaults(period), [period]);

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TargetType>('revenue');
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [monthlyPeriod, setMonthlyPeriod] = useState(defaults.monthFromPeriod);
  const [year, setYear] = useState(defaults.yearFromPeriod);
  const [quarter, setQuarter] = useState(defaults.currentQuarter);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const d = deriveDefaults(period);
      setAmount(currentAmount > 0 ? String(currentAmount) : '');
      setType('revenue');
      setPeriodType('monthly');
      setMonthlyPeriod(d.monthFromPeriod);
      setYear(d.yearFromPeriod);
      setQuarter(d.currentQuarter);
      setError('');
    }
  }, [isOpen, currentAmount, period]);

  const isRevenue = type === 'revenue';

  // Resolve the period string sent to the API based on the chosen granularity.
  const resolvedPeriod = useMemo(() => {
    if (periodType === 'yearly') return year;
    if (periodType === 'quarterly') return `${year}-${quarter}`;
    return monthlyPeriod || period;
  }, [periodType, year, quarter, monthlyPeriod, period]);

  const handleSave = async () => {
    const parsed = Number(amount);
    if (!amount.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setError(isRevenue ? 'Enter a valid target amount greater than zero.' : 'Enter a valid target count greater than zero.');
      return;
    }
    if (periodType === 'yearly' && !/^\d{4}$/.test(year)) {
      setError('Enter a valid 4-digit year.');
      return;
    }
    if (periodType === 'monthly' && !/^\d{4}-\d{2}$/.test(resolvedPeriod)) {
      setError('Enter a valid month (YYYY-MM).');
      return;
    }
    try {
      setIsSaving(true);
      await setTarget({ targetAmount: parsed, type, period: resolvedPeriod, periodType, ownerId });
      toast('Target updated successfully', 'success');
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to set target', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Sales Target" size="sm">
      <div className="space-y-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Define a target metric and period. The achievement is computed live from your sales activity.
        </p>

        <SelectField
          id="bde-target-type"
          label="Target Type"
          options={TYPE_OPTIONS}
          value={type}
          onChange={(v) => {
            setType(v as TargetType);
            if (error) setError('');
          }}
        />

        <SelectField
          id="bde-target-period-type"
          label="Period Type"
          options={PERIOD_TYPE_OPTIONS}
          value={periodType}
          onChange={(v) => {
            setPeriodType(v as PeriodType);
            if (error) setError('');
          }}
        />

        {periodType === 'monthly' && (
          <InputField
            id="bde-target-month"
            label="Month"
            type="month"
            value={monthlyPeriod}
            onChange={(v) => {
              setMonthlyPeriod(v);
              if (error) setError('');
            }}
          />
        )}

        {periodType === 'quarterly' && (
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              id="bde-target-quarter"
              label="Quarter"
              options={QUARTER_OPTIONS}
              value={quarter}
              onChange={(v) => {
                setQuarter(v);
                if (error) setError('');
              }}
            />
            <InputField
              id="bde-target-quarter-year"
              label="Year"
              type="number"
              min={2000}
              placeholder="e.g. 2026"
              value={year}
              onChange={(v) => {
                setYear(v);
                if (error) setError('');
              }}
            />
          </div>
        )}

        {periodType === 'yearly' && (
          <InputField
            id="bde-target-year"
            label="Year"
            type="number"
            min={2000}
            placeholder="e.g. 2026"
            value={year}
            onChange={(v) => {
              setYear(v);
              if (error) setError('');
            }}
          />
        )}

        <InputField
          id="bde-target-amount"
          label={isRevenue ? 'Target Amount (INR)' : 'Target (count)'}
          type="number"
          min={0}
          placeholder={isRevenue ? 'e.g. 500000' : 'e.g. 25'}
          value={amount}
          onChange={(v) => {
            setAmount(v);
            if (error) setError('');
          }}
          error={error || undefined}
          required
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            Save Target
          </Button>
        </div>
      </div>
    </Modal>
  );
}
