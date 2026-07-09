'use client';

import { useRouter } from 'next/navigation';
import { Building2, Link2, FolderKanban, Trash2 } from 'lucide-react';
import type { Deal } from '@/lib/types/leadLifecycle';
import { formatINR } from '@/lib/utils/currency';

interface DealCardProps {
  deal: Deal;
  draggable: boolean;
  isDragging: boolean;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
  /** Show the delete control (gated on sales.deals.delete by the parent). */
  canDelete?: boolean;
  /** Fired when the card's delete control is clicked. */
  onDelete?: () => void;
}

/** Avatar initials + a stable colour from the owner's name. */
function avatar(name: string) {
  const initials =
    name.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-emerald-500'];
  return { initials, color: colors[Math.abs(hash) % colors.length] };
}

// Centralized INR formatter (single source of truth for the ₹ symbol + Indian
// digit grouping); change lib/utils/currency.ts to adjust currency app-wide.
const money = (n: number) => formatINR(n || 0);

/** Lightly humanize a status string: "in_progress" -> "In Progress". */
const humanizeStatus = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** A draggable deal card for the deal pipeline board. */
export function DealCard({ deal, draggable, isDragging, onDragStart, onDragEnd, canDelete, onDelete }: DealCardProps) {
  const router = useRouter();
  const ownerName = deal.owner?.name || 'Unassigned';
  const { initials, color } = avatar(ownerName);

  return (
    <div
      draggable={draggable}
      onDragStart={() => onDragStart(deal.id)}
      onDragEnd={onDragEnd}
      onClick={() => router.push(`/dashboard/sales/deals/${deal.id}`)}
      className={`group rounded-lg shadow-sm p-4 transition-all duration-200 cursor-pointer hover:shadow-md border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600 ${
        isDragging ? 'opacity-40 scale-[0.97] border-dashed border-2 border-blue-400' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-snug group-hover:text-blue-600 transition-colors break-words">
          {deal.title}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{money(deal.amount)}</span>
          {canDelete && onDelete && (
            <button
              type="button"
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded-md text-gray-300 hover:text-rose-600 hover:bg-rose-50 dark:text-gray-600 dark:hover:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
              aria-label={`Delete deal ${deal.title}`}
              title="Delete deal"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {deal.customer?.company && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1 break-words">
          <Building2 size={12} className="shrink-0" />
          {deal.customer.company}
        </p>
      )}

      {deal.linkedProject && (
        <div className="mt-2">
          <span
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            title={`Linked project: ${deal.linkedProject.name}`}
          >
            <FolderKanban size={11} className="shrink-0" />
            Project: {humanizeStatus(deal.linkedProject.status)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        {deal.leadId ? (
          <span className="text-[10px] text-gray-400 flex items-center gap-1" title="Converted from a lead">
            <Link2 size={11} /> from lead
          </span>
        ) : <span />}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">{ownerName}</span>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${color}`}>
            {initials}
          </div>
        </div>
      </div>
    </div>
  );
}
