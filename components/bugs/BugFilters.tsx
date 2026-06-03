'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, X, ChevronDown, CalendarDays, SlidersHorizontal, ArrowUpDown
} from 'lucide-react';
import type { BugQueryParams } from '@/lib/api/bugs';
import type { UserDbResponse } from '@/lib/api/users';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ActiveFilters {
  search: string;
  status: string;
  priority: string;
  severity: string;
  assignee: string;
  startDate: string;
  endDate: string;
  sortBy: BugQueryParams['sortBy'];
  sortOrder: BugQueryParams['sortOrder'];
}

interface BugFiltersProps {
  filters: ActiveFilters;
  users: UserDbResponse[];
  totalResults: number;
  filteredResults: number;
  onChange: (updated: Partial<ActiveFilters>) => void;
  onClearAll: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'reopened', label: 'Reopened' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const SORT_BY_OPTIONS: { value: BugQueryParams['sortBy']; label: string }[] = [
  { value: 'createdAt', label: 'Created Date' },
  { value: 'updatedAt', label: 'Updated Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'title', label: 'Bug Title' },
];

// ── Sub-component: Simple Select Dropdown ─────────────────────────────────────
function FilterSelect({
  value,
  options,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder ?? 'Select';
  const isActive = value !== '';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative" id={id}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap ${
          isActive
            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <span>{selectedLabel}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-indigo-50 hover:text-indigo-700 ${
                value === opt.value
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function BugFilters({
  filters,
  users,
  totalResults,
  filteredResults,
  onChange,
  onClearAll,
}: BugFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const [dateError, setDateError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external search changes (e.g. URL restore)
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ search: value });
    }, 300);
  }, [onChange]);

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const today = new Date().toISOString().split('T')[0];

    if (value > today) {
      setDateError('Future dates are not allowed.');
      return;
    }

    const nextStart = field === 'startDate' ? value : filters.startDate;
    const nextEnd   = field === 'endDate'   ? value : filters.endDate;

    if (nextStart && nextEnd && nextEnd < nextStart) {
      setDateError('"To" date cannot be before "From" date.');
      return;
    }

    setDateError(null);
    onChange({ [field]: value });
  };

  // Compute active filter chips for the summary row
  const activeChips: { key: keyof ActiveFilters; label: string }[] = [];
  if (filters.search)   activeChips.push({ key: 'search',    label: `Search: "${filters.search}"` });
  if (filters.status)   activeChips.push({ key: 'status',    label: `Status: ${STATUS_OPTIONS.find(o => o.value === filters.status)?.label ?? filters.status}` });
  if (filters.priority) activeChips.push({ key: 'priority',  label: `Priority: ${PRIORITY_OPTIONS.find(o => o.value === filters.priority)?.label ?? filters.priority}` });
  if (filters.severity) activeChips.push({ key: 'severity',  label: `Severity: ${SEVERITY_OPTIONS.find(o => o.value === filters.severity)?.label ?? filters.severity}` });
  if (filters.assignee) activeChips.push({ key: 'assignee',  label: `Assignee: ${filters.assignee}` });
  if (filters.startDate) activeChips.push({ key: 'startDate', label: `From: ${filters.startDate}` });
  if (filters.endDate)   activeChips.push({ key: 'endDate',   label: `To: ${filters.endDate}` });

  const hasActiveFilters = activeChips.length > 0;

  // User options for assignee dropdown
  const userOptions = [
    { value: '', label: 'All Assignees' },
    ...users.map((u) => ({ value: u.name, label: u.name })),
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <SlidersHorizontal size={16} className="text-indigo-500" />
        <span className="text-sm font-semibold text-gray-700">Filters & Search</span>
        <div className="ml-auto text-xs text-gray-400 font-medium">
          {hasActiveFilters ? (
            <span className="text-indigo-600 font-semibold">
              Showing {filteredResults} of {totalResults} bugs
            </span>
          ) : (
            <span>{totalResults} total bugs</span>
          )}
        </div>
      </div>

      {/* ── Row 1: Search ────────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            id="bug-search-input"
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search bugs by title, ID, assignee, or description..."
            className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 focus:bg-white transition-all"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Row 2: Filter Dropdowns ───────────────────────────────────────────── */}
      <div className="px-5 pb-3 flex flex-wrap gap-2 items-center">
        <FilterSelect
          id="filter-status"
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(v) => onChange({ status: v })}
          placeholder="All Statuses"
        />
        <FilterSelect
          id="filter-priority"
          value={filters.priority}
          options={PRIORITY_OPTIONS}
          onChange={(v) => onChange({ priority: v })}
          placeholder="All Priorities"
        />
        <FilterSelect
          id="filter-severity"
          value={filters.severity}
          options={SEVERITY_OPTIONS}
          onChange={(v) => onChange({ severity: v })}
          placeholder="All Severities"
        />
        <FilterSelect
          id="filter-assignee"
          value={filters.assignee}
          options={userOptions}
          onChange={(v) => onChange({ assignee: v })}
          placeholder="All Assignees"
        />

        {/* Date Range */}
        <div className="flex items-center gap-2 ml-1">
          <CalendarDays size={15} className="text-gray-400 shrink-0" />
          <div className="flex items-center gap-1.5">
            <input
              id="filter-start-date"
              type="date"
              value={filters.startDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
              title="From date"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              id="filter-end-date"
              type="date"
              value={filters.endDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
              title="To date"
            />
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 ml-auto">
          <ArrowUpDown size={14} className="text-gray-400" />
          <FilterSelect
            id="sort-by"
            value={filters.sortBy ?? 'createdAt'}
            options={SORT_BY_OPTIONS as { value: string; label: string }[]}
            onChange={(v) => onChange({ sortBy: v as BugQueryParams['sortBy'] })}
          />
          <button
            id="sort-order-toggle"
            type="button"
            onClick={() => onChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
            className={`px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all ${
              filters.sortOrder === 'asc'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
            title={`Currently: ${filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            {filters.sortOrder === 'asc' ? '↑ ASC' : '↓ DESC'}
          </button>
        </div>
      </div>

      {/* ── Date Error ───────────────────────────────────────────────────────── */}
      {dateError && (
        <div className="px-5 pb-2 text-xs text-rose-600 font-medium flex items-center gap-1">
          <X size={12} /> {dateError}
        </div>
      )}

      {/* ── Active Filter Chips ──────────────────────────────────────────────── */}
      {hasActiveFilters && (
        <div className="px-5 pb-4 pt-1 flex flex-wrap gap-2 items-center border-t border-gray-100 mt-1">
          <span className="text-xs text-gray-400 font-medium mr-1">Active:</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full px-3 py-1 text-xs font-semibold"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => {
                  if (chip.key === 'search') { setSearchInput(''); }
                  onChange({ [chip.key]: '' });
                }}
                className="ml-0.5 hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                title={`Remove ${chip.key} filter`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <button
            id="clear-all-filters"
            type="button"
            onClick={() => { setSearchInput(''); setDateError(null); onClearAll(); }}
            className="ml-auto text-xs text-gray-500 hover:text-rose-600 font-semibold hover:underline transition-colors"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
