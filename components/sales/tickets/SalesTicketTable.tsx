'use client';

import { Eye, Edit, Trash2, CalendarDays, Link2 } from 'lucide-react';
import type { SalesTicket } from '@/lib/api/salesTickets';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { Badge } from '@/components/Badge';
import { formatStatusLabel } from '@/lib/utils';

interface SalesTicketTableProps {
  tickets: SalesTicket[];
  onEdit: (ticket: SalesTicket) => void;
  onDelete: (ticketId: number) => void;
  onView: (ticket: SalesTicket) => void;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

// Same shared <Badge> component + variants used across Meetings/Bugs/Blockers/Tickets.
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default',
  reopened: 'danger',
};

const PRIORITY_VARIANT: Record<string, BadgeVariant> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'success',
};

/** Resolve the linked entity label for a sales ticket (lead → deal → customer). */
function linkedLabel(ticket: SalesTicket): { label: string; kind: string } | null {
  if (ticket.lead?.title) return { label: ticket.lead.title, kind: 'Lead' };
  if (ticket.deal?.title) return { label: ticket.deal.title, kind: 'Deal' };
  if (ticket.customer?.name) return { label: ticket.customer.name, kind: 'Customer' };
  return null;
}

/**
 * Sales Tickets table — mirrors the Development TicketTable styling exactly
 * (header, row height, cell padding, hover, badges, avatar, action icons) with
 * an extra "Linked" column for the lead/deal/customer linkage, and sales.tickets.*
 * permission keys. Loading & empty states are handled by the parent.
 */
export function SalesTicketTable({ tickets, onEdit, onDelete, onView }: SalesTicketTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            {['Ticket', 'Priority', 'Status', 'Assigned To', 'Linked', 'Created', 'Actions'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tickets.map((ticket) => {
            const linked = linkedLabel(ticket);
            return (
              <tr
                key={ticket.id}
                className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                onClick={() => onView(ticket)}
              >
                {/* Ticket title + id */}
                <td className="px-4 py-3.5">
                  <p
                    className="font-semibold text-blue-600 group-hover:underline transition-colors line-clamp-1"
                    title={ticket.title}
                  >
                    {ticket.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">#{ticket.id}</p>
                </td>

                {/* Priority */}
                <td className="px-4 py-3.5">
                  <Badge variant={PRIORITY_VARIANT[String(ticket.priority).toLowerCase()] ?? 'default'}>
                    {formatStatusLabel(ticket.priority)}
                  </Badge>
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  <Badge variant={STATUS_VARIANT[String(ticket.status).toLowerCase()] ?? 'default'}>
                    {formatStatusLabel(ticket.status)}
                  </Badge>
                </td>

                {/* Assigned To — avatar + name */}
                <td className="px-4 py-3.5">
                  {ticket.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(ticket.assignee.name ?? 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{ticket.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Unassigned</span>
                  )}
                </td>

                {/* Linked — lead / deal / customer */}
                <td className="px-4 py-3.5">
                  {linked ? (
                    <div className="flex items-center gap-1.5 max-w-[180px]" title={`${linked.kind}: ${linked.label}`}>
                      <Link2 size={13} className="text-gray-400 flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-700 truncate">{linked.label}</span>
                      <span className="text-[10px] uppercase tracking-wide text-gray-400 flex-shrink-0">{linked.kind}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>

                {/* Created */}
                <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays size={13} className="text-gray-400" />
                    {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onView(ticket)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all"
                      title="View"
                      aria-label="View ticket"
                    >
                      <Eye size={14} />
                    </button>
                    <PermissionGuard require="sales.tickets.edit">
                      <button
                        type="button"
                        onClick={() => onEdit(ticket)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 transition-all"
                        title="Edit"
                        aria-label="Edit ticket"
                      >
                        <Edit size={14} />
                      </button>
                    </PermissionGuard>
                    <PermissionGuard require="sales.tickets.delete">
                      <button
                        type="button"
                        onClick={() => onDelete(ticket.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all"
                        title="Delete"
                        aria-label="Delete ticket"
                      >
                        <Trash2 size={14} />
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
  );
}
