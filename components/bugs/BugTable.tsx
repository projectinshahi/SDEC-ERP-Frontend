'use client';

import { ArrowUp, ArrowDown, ArrowUpDown, Edit, Trash2, Bug } from 'lucide-react';
import type { Bug as BugType } from '@/lib/api/bugs';
import type { BugQueryParams } from '@/lib/api/bugs';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { classNames } from '@/lib/utils';

interface BugTableProps {
  bugs: BugType[];
  isLoading?: boolean;
  sortBy?: BugQueryParams['sortBy'];
  sortOrder?: BugQueryParams['sortOrder'];
  onSort?: (field: BugQueryParams['sortBy']) => void;
  onEdit: (bug: BugType) => void;
  onDelete: (bugId: number) => void;
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
}

const SORTABLE_COLUMNS: { key: BugQueryParams['sortBy']; label: string }[] = [
  { key: 'title',     label: 'Bug' },
  { key: 'status',    label: 'Status' },
  { key: 'priority',  label: 'Priority' },
  { key: 'createdAt', label: 'Created' },
];

function getStatusConfig(statusStr: string) {
  const s = String(statusStr).toLowerCase();
  switch (s) {
    case 'open':        return { label: 'Open',        className: 'bg-blue-50 text-blue-700 border-blue-100' };
    case 'in_progress': return { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-100' };
    case 'resolved':    return { label: 'Resolved',    className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
    case 'closed':      return { label: 'Closed',      className: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'reopened':    return { label: 'Reopened',    className: 'bg-purple-50 text-purple-700 border-purple-100' };
    default:            return { label: statusStr,     className: 'bg-gray-50 text-gray-700 border-gray-100' };
  }
}

function getPriorityConfig(priorityStr: string) {
  const p = String(priorityStr).toLowerCase();
  switch (p) {
    case 'critical': return { label: 'Critical', className: 'text-rose-600 bg-rose-50 border-rose-100' };
    case 'high':     return { label: 'High',     className: 'text-orange-600 bg-orange-50 border-orange-100' };
    case 'medium':   return { label: 'Medium',   className: 'text-blue-600 bg-blue-50 border-blue-100' };
    case 'low':      return { label: 'Low',      className: 'text-slate-600 bg-slate-50 border-slate-100' };
    default:         return { label: priorityStr, className: 'text-gray-600 bg-gray-50 border-gray-100' };
  }
}

// ── Loading Skeleton ───────────────────────────────────────────────────────────
function BugTableSkeleton() {
  return (
    <div className="w-full bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {['Bug', 'Status', 'Priority', 'Assigned To', 'Created', 'Actions'].map((h) => (
                <th key={h} className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-48 mb-1" /><div className="h-3 bg-slate-100 rounded w-20" /></td>
                <td className="py-4 px-6"><div className="h-5 bg-slate-200 rounded-full w-16" /></td>
                <td className="py-4 px-6"><div className="h-5 bg-slate-200 rounded-full w-14" /></td>
                <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-12 ml-auto" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BugTable({
  bugs,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  onResetFilters,
  hasActiveFilters,
}: BugTableProps) {
  if (isLoading) return <BugTableSkeleton />;

  if (bugs.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-400 mb-1">
          <Bug size={28} />
        </div>
        <p className="text-gray-800 font-bold text-base">
          {hasActiveFilters ? 'No bugs found' : 'No bugs reported yet'}
        </p>
        <p className="text-gray-400 text-sm max-w-xs">
          {hasActiveFilters
            ? 'Try changing your search or filter criteria.'
            : 'Click "Report Bug" to add the first bug.'}
        </p>
        {hasActiveFilters && onResetFilters && (
          <button
            id="reset-filters-btn"
            type="button"
            onClick={onResetFilters}
            className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            Reset Filters
          </button>
        )}
      </div>
    );
  }

  const SortIcon = ({ field }: { field: BugQueryParams['sortBy'] }) => {
    if (sortBy !== field) return <ArrowUpDown size={13} className="text-slate-300 group-hover:text-slate-500" />;
    return sortOrder === 'asc'
      ? <ArrowUp size={13} className="text-indigo-500" />
      : <ArrowDown size={13} className="text-indigo-500" />;
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {SORTABLE_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider"
                >
                  <button
                    type="button"
                    onClick={() => onSort?.(col.key)}
                    className="flex items-center gap-1.5 group hover:text-indigo-600 transition-colors"
                  >
                    {col.label}
                    <SortIcon field={col.key} />
                  </button>
                </th>
              ))}
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Assigned To
              </th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {bugs.map((bug) => {
              const statusConfig   = getStatusConfig(bug.status);
              const priorityConfig = getPriorityConfig(bug.priority);
              return (
                <tr key={bug.id} className="hover:bg-slate-50/50 transition-colors duration-150 group">
                  {/* Bug Name + Severity */}
                  <td className="py-4 px-6 max-w-xs">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono text-slate-400 mt-0.5 shrink-0">#{bug.id}</span>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2" title={bug.title}>
                          {bug.title}
                        </p>
                        {bug.severity && (
                          <p className="text-[11px] text-slate-400 mt-0.5">Severity: <span className="font-medium text-slate-500">{bug.severity}</span></p>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* Status */}
                  <td className="py-4 px-6">
                    <span className={classNames('border font-bold px-2.5 py-0.5 rounded-full text-[11px] shadow-sm uppercase tracking-wide', statusConfig.className)}>
                      {statusConfig.label}
                    </span>
                  </td>
                  {/* Priority */}
                  <td className="py-4 px-6">
                    <span className={classNames('border font-bold px-2.5 py-0.5 rounded-full text-[11px] shadow-sm uppercase tracking-wide', priorityConfig.className)}>
                      {priorityConfig.label}
                    </span>
                  </td>
                  {/* Created Date */}
                  <td className="py-4 px-6 text-slate-500 text-xs font-medium whitespace-nowrap">
                    {new Date(bug.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  {/* Assigned To */}
                  <td className="py-4 px-6 text-slate-600 text-sm font-medium">
                    {bug.assignedTo || <span className="text-slate-300 italic text-xs">Unassigned</span>}
                  </td>
                  {/* Actions */}
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <PermissionGuard require="bugs.update">
                        <button
                          onClick={() => onEdit(bug)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                          title="Edit bug"
                        >
                          <Edit size={15} />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard require="bugs.delete">
                        <button
                          onClick={() => onDelete(bug.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          title="Delete bug"
                        >
                          <Trash2 size={15} />
                        </button>
                      </PermissionGuard>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
