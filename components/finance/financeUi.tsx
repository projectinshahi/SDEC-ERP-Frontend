'use client';

/**
 * Shared Finance UI primitives — a labeled form <select>, a status chip, and the
 * common payment-method options. Kept in one place so Income/Expenses/
 * Transactions render consistently (single source for styling + option lists).
 */

import { classNames } from '@/lib/utils';

export const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'UPI', 'Card', 'Cheque', 'Other'] as const;

/** Colour classes for a finance record status (income/expense share the palette). */
export function statusChipClass(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'received' || s === 'paid')
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40';
  // pending / anything else
  return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/40';
}

export function StatusChip({ status }: { status: string }) {
  return (
    <span className={classNames('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize', statusChipClass(status))}>
      {status || '—'}
    </span>
  );
}

/** Income = emerald, Expense = rose. */
export function TypeChip({ type }: { type: 'income' | 'expense' }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize',
        type === 'income'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/40'
          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/40',
      )}
    >
      {type}
    </span>
  );
}

interface LabeledSelectProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}

/** A labeled <select> matching the InputField look (used in the create/edit forms). */
export function LabeledSelect({ label, id, value, onChange, options, required }: LabeledSelectProps) {
  return (
    <div className="space-y-1.5 w-full">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1 font-bold">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full py-2.5 px-3.5 rounded-xl border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-900 bg-white shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/** Compact unlabeled filter select used in page toolbars. */
export function FilterSelect({ value, onChange, options, ariaLabel }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/**
 * Finance dates are plain CALENDAR dates stored as UTC midnight (the create/edit
 * forms send `new Date('yyyy-mm-dd').toISOString()`). Both the date-input prefill
 * and the display therefore read the date in UTC, so the picked day round-trips
 * identically in EVERY timezone (no local-offset off-by-one).
 */

/** yyyy-mm-dd for <input type=date> from a stored (UTC-midnight) ISO string. */
export function toDateInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Human date, e.g. "31 May 2026" (rendered in UTC to match the stored date). */
export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
