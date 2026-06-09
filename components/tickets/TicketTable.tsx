'use client';

import { ArrowUp, ArrowDown, ArrowUpDown, Edit, Trash2, Ticket } from 'lucide-react';
import type { Ticket as TicketType } from '../../lib/api/tickets';
import type { TicketQueryParams } from '../../lib/api/tickets';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { classNames } from '@/lib/utils';

interface TicketTableProps {
  tickets: TicketType[];
  isLoading?: boolean;
  sortBy?: TicketQueryParams['sortBy'];
  sortOrder?: TicketQueryParams['sortOrder'];
  onSort?: (field: TicketQueryParams['sortBy']) => void;
  onEdit: (ticket: TicketType) => void;
  onDelete: (ticketId: number) => void;
  onView: (ticket: TicketType) => void;
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
  onStatusChange?: (ticketId: number, newStatus: string) => void;
}

const SORTABLE_COLUMNS: { key: TicketQueryParams['sortBy']; label: string }[] = [
  { key: 'title', label: 'Ticket' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'createdAt', label: 'Created' },
];

function getStatusConfig(statusStr: string) {
  const s = String(statusStr).toLowerCase();
  switch (s) {
    case 'open': return { label: 'Open', className: 'bg-blue-50 text-blue-700 border-blue-100' };
    case 'in_progress': return { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-100' };
    case 'resolved': return { label: 'Resolved', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
    case 'closed': return { label: 'Closed', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'reopened': return { label: 'Reopened', className: 'bg-purple-50 text-purple-700 border-purple-100' };
    default: return { label: statusStr, className: 'bg-gray-50 text-gray-700 border-gray-100' };
  }
}

function getPriorityConfig(priorityStr: string) {
  const p = String(priorityStr).toLowerCase();
  switch (p) {
    case 'critical': return { label: 'Critical', className: 'text-rose-600 bg-rose-50 border-rose-100' };
    case 'high': return { label: 'High', className: 'text-orange-600 bg-orange-50 border-orange-100' };
    case 'medium': return { label: 'Medium', className: 'text-blue-600 bg-blue-50 border-blue-100' };
    case 'low': return { label: 'Low', className: 'text-slate-600 bg-slate-50 border-slate-100' };
    default: return { label: priorityStr, className: 'text-gray-600 bg-gray-50 border-gray-100' };
  }
}

// ── Loading Skeleton ───────────────────────────────────────────────────────────
function TicketTableSkeleton() {
  return (
    <div className="w-full bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {['Ticket', 'Status', 'Priority', 'Assigned To', 'Created', 'Actions'].map((h) => (
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

export function TicketTable({
  tickets,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  onView,
  onResetFilters,
  hasActiveFilters,
  onStatusChange,
}: TicketTableProps) {
  if (isLoading) return <TicketTableSkeleton />;

  if (tickets.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-400 mb-1">
          <Ticket size={28} />
        </div>
        <p className="text-gray-800 font-bold text-base">
          {hasActiveFilters ? 'No tickets found' : 'No tickets reported yet'}
        </p>
        <p className="text-gray-400 text-sm max-w-xs">
          {hasActiveFilters
            ? 'Try changing your search or filter criteria.'
            : 'Click "Report Ticket" to add the first ticket.'}
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

  const SortIcon = ({ field }: { field: TicketQueryParams['sortBy'] }) => {
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
            {tickets.map((ticket) => {
              const statusConfig = getStatusConfig(ticket.status);
              const priorityConfig = getPriorityConfig(ticket.priority);
              return (
                <tr
                  key={ticket.id}
                  className="hover:bg-slate-50/50 transition-colors duration-150 group cursor-pointer"
                  onClick={() => onView(ticket)}
                >
                  {/* Ticket Name + Severity */}
                  <td className="py-4 px-6 max-w-xs">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono text-slate-400 mt-0.5 shrink-0">#{ticket.id}</span>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2" title={ticket.title}>
                          {ticket.title}
                        </p>
                        {ticket.priority && (
                          <p className="text-[11px] text-slate-400 mt-0.5">Severity: <span className="font-medium text-slate-500">{ticket.priority}</span></p>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* Status */}
                  <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                    <select
                      className={classNames(
                        'border font-bold pl-2.5 pr-6 py-0.5 rounded-full text-[11px] shadow-sm uppercase tracking-wide cursor-pointer appearance-none outline-none bg-no-repeat transition-colors',
                        statusConfig.className
                      )}
                      style={{
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                        backgroundSize: '1em',
                        backgroundPosition: 'right 0.35rem center',
                      }}
                      value={ticket.status}
                      onChange={(e) => onStatusChange?.(ticket.id, e.target.value)}
                      disabled={!onStatusChange}
                    >
                      <option value="open" className="text-slate-800 bg-white font-medium capitalize">Open</option>
                      <option value="in_progress" className="text-slate-800 bg-white font-medium capitalize">In Progress</option>
                      <option value="resolved" className="text-slate-800 bg-white font-medium capitalize">Resolved</option>
                      <option value="closed" className="text-slate-800 bg-white font-medium capitalize">Closed</option>
                      <option value="reopened" className="text-slate-800 bg-white font-medium capitalize">Reopened</option>
                    </select>
                  </td>
                  {/* Priority */}
                  <td className="py-4 px-6">
                    <span className={classNames('border font-bold px-2.5 py-0.5 rounded-full text-[11px] shadow-sm uppercase tracking-wide', priorityConfig.className)}>
                      {priorityConfig.label}
                    </span>
                  </td>
                  {/* Created Date */}
                  <td className="py-4 px-6 text-slate-500 text-xs font-medium whitespace-nowrap">
                    {new Date(ticket.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  {/* Assigned To */}
                  <td className="py-4 px-6 text-slate-600 text-sm font-medium">
                    {ticket.assignee?.name || <span className="text-slate-300 italic text-xs">Unassigned</span>}
                  </td>
                  {/* Actions */}
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <PermissionGuard require="tickets.update">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(ticket); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                          title="Edit ticket"
                        >
                          <Edit size={15} />
                        </button>
                      </PermissionGuard>
                      <PermissionGuard require="tickets.delete">
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(ticket.id); }}
                          className="p-1.5 text-red-500 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          title="Delete ticket"
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




