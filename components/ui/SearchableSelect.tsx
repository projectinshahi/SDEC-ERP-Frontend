'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { classNames } from '@/lib/utils';

export interface SearchableOption { value: string; label: string; sublabel?: string }

/**
 * Compact, searchable single-select. Capped + scrollable option list (max-h-56), type-ahead
 * filter, closes on outside-click. Touch-friendly (button-based). Shared by the Opportunity
 * form's CRM Account + Contact selectors.
 */
export function SearchableSelect({
  id, label, value, options, onChange, placeholder = 'Select…', searchPlaceholder = 'Search…', disabled, required,
}: {
  id: string;
  label?: string;
  value: string;
  options: SearchableOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.label.toLowerCase().includes(s) || (o.sublabel || '').toLowerCase().includes(s));
  }, [q, options]);

  return (
    <div className="space-y-1.5 w-full" ref={ref}>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label}{required && <span className="text-red-500 ml-1 font-bold">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button" id={id} disabled={disabled}
          onClick={() => { if (!disabled) { setOpen((v) => !v); setQ(''); } }}
          className={classNames(
            'w-full flex items-center justify-between gap-2 py-2.5 px-3.5 rounded-xl border text-sm font-medium text-left transition-colors',
            disabled
              ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 border-gray-100 dark:border-gray-800 cursor-not-allowed'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-900 dark:text-gray-100',
          )}
        >
          <span className={classNames('truncate', !selected && 'text-gray-400')}>{selected ? selected.label : placeholder}</span>
          <ChevronDown size={18} className="text-gray-400 shrink-0" />
        </button>

        {open && !disabled && (
          <div className="absolute z-30 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">No matches</li>}
              {filtered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-gray-900 dark:text-gray-100">{o.label}</span>
                      {o.sublabel && <span className="block truncate text-xs text-gray-400">{o.sublabel}</span>}
                    </span>
                    {o.value === value && <Check size={16} className="text-blue-600 shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
