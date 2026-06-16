'use client';

import { Search, X } from 'lucide-react';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { Button } from '@/components/Button';
import type { AssignableUser } from '@/lib/types/lead';
import type { PipelineFilters as PipelineFiltersType, DealStageConfig } from '@/lib/types/salesExecution';

interface PipelineFiltersProps {
  filters: PipelineFiltersType;
  onChange: (f: PipelineFiltersType) => void;
  onClear: () => void;
  stages: DealStageConfig[];
  owners: AssignableUser[];
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'stalled', label: 'Stalled' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'healthy', label: 'Healthy' },
];

/** Number of filter keys that hold a meaningful (non-empty, non-"all") value. */
function countActive(filters: PipelineFiltersType): number {
  return Object.values(filters).filter(
    (v) => v !== undefined && v !== null && String(v).trim() !== '' && v !== 'all',
  ).length;
}

/**
 * SE-020.1 — Advanced pipeline filter bar.
 *
 * Every control merges its change into the current filter set and calls
 * `onChange` immediately; the page debounces the actual network fetch.
 */
export function PipelineFilters({ filters, onChange, onClear, stages, owners }: PipelineFiltersProps) {
  const set = (patch: Partial<PipelineFiltersType>) => onChange({ ...filters, ...patch });

  const stageOptions = [
    { value: 'all', label: 'All stages' },
    ...stages.map((s) => ({ value: s.name, label: s.name })),
  ];

  const ownerOptions = [
    { value: 'all', label: 'All owners' },
    ...owners.map((o) => ({ value: String(o.id), label: o.name })),
  ];

  const activeCount = countActive(filters);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Search + header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search deals by title, company, owner..."
            value={filters.search ?? ''}
            onChange={(e) => set({ search: e.target.value })}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/30 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
              {activeCount} active {activeCount === 1 ? 'filter' : 'filters'}
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={onClear} disabled={activeCount === 0}>
            <X className="mr-1.5 h-4 w-4" />
            Clear filters
          </Button>
        </div>
      </div>

      {/* Filter grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
        <SelectField
          id="pf-stage"
          label="Deal Stage"
          value={filters.stage ?? 'all'}
          onChange={(v) => set({ stage: v })}
          options={stageOptions}
        />
        <SelectField
          id="pf-owner"
          label="Deal Owner"
          value={filters.ownerId !== undefined && filters.ownerId !== '' ? String(filters.ownerId) : 'all'}
          onChange={(v) => set({ ownerId: v })}
          options={ownerOptions}
        />
        <SelectField
          id="pf-status"
          label="Status"
          value={filters.status && filters.status !== '' ? String(filters.status) : 'all'}
          onChange={(v) => set({ status: v })}
          options={STATUS_OPTIONS}
        />
        <InputField
          id="pf-close-month"
          label="Close Month"
          type="month"
          value={filters.closeMonth ?? ''}
          onChange={(v) => set({ closeMonth: v })}
        />

        <InputField
          id="pf-value-min"
          label="Value Min"
          type="number"
          placeholder="0"
          value={filters.valueMin !== undefined ? String(filters.valueMin) : ''}
          onChange={(v) => set({ valueMin: v })}
        />
        <InputField
          id="pf-value-max"
          label="Value Max"
          type="number"
          placeholder="Any"
          value={filters.valueMax !== undefined ? String(filters.valueMax) : ''}
          onChange={(v) => set({ valueMax: v })}
        />
        <InputField
          id="pf-prob-min"
          label="Probability Min %"
          type="number"
          placeholder="0"
          value={filters.probabilityMin !== undefined ? String(filters.probabilityMin) : ''}
          onChange={(v) => set({ probabilityMin: v })}
        />
        <InputField
          id="pf-prob-max"
          label="Probability Max %"
          type="number"
          placeholder="100"
          value={filters.probabilityMax !== undefined ? String(filters.probabilityMax) : ''}
          onChange={(v) => set({ probabilityMax: v })}
        />

        <InputField
          id="pf-source"
          label="Deal Source"
          placeholder="e.g. Referral"
          value={filters.source ?? ''}
          onChange={(v) => set({ source: v })}
        />
        <InputField
          id="pf-company"
          label="Company"
          placeholder="Customer company"
          value={filters.company ?? ''}
          onChange={(v) => set({ company: v })}
        />
      </div>
    </div>
  );
}
