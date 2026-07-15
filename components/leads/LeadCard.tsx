'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, User, Trash2 } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { formatLeadSource, leadSourceVariant } from '@/lib/data/leadSources';
import { LeadHealthBadge } from './LeadHealthBadge';
import type { Lead } from '@/lib/types/lead';

interface LeadCardProps {
  lead: Lead;
  draggable: boolean;
  isDragging: boolean;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
  /** Show the delete control (gated on sales.leads.delete by the parent). */
  canDelete?: boolean;
  /** Fired when the card's delete control is clicked. */
  onDelete?: () => void;
}

/** Stable avatar initials + colour from a name. */
function avatar(name: string) {
  const initials =
    name.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-emerald-500'];
  return { initials, color: colors[Math.abs(hash) % colors.length] };
}

/**
 * Pipeline lead card. Shows lead name, company, owner, source and score.
 * Uses native HTML5 drag-and-drop (matching the Task board) and navigates to
 * the lead detail page on click.
 */
export function LeadCard({ lead, draggable, isDragging, onDragStart, onDragEnd, canDelete, onDelete }: LeadCardProps) {
  const router = useRouter();
  const ownerName = lead.owner?.name || 'Unassigned';
  const { initials, color } = avatar(ownerName);

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        onDragStart(lead.id);
        e.dataTransfer.setData('text/plain', String(lead.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={onDragEnd}
      onClick={() => router.push(`/dashboard/sales/leads/${lead.id}`)}
      className={`group rounded-lg shadow-sm p-4 transition-all duration-200 border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${isDragging ? 'opacity-40 scale-[0.97] border-dashed border-2 border-blue-400' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-snug group-hover:text-blue-600 transition-colors break-words">
          {lead.title}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          {canDelete && onDelete && (
            <button
              type="button"
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded-md text-gray-300 hover:text-rose-600 hover:bg-rose-50 dark:text-gray-600 dark:hover:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
              aria-label={`Delete lead ${lead.title}`}
              title="Delete lead"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {lead.customer?.company && (
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-2 break-words">
          <Building2 size={12} className="shrink-0" />
          {lead.customer.company}
        </p>
      )}

      {/* Lead temperature indicator */}
      <div className="mb-3">
        <LeadHealthBadge temperature={lead.temperature} showLabel />
      </div>

      <div className="flex items-center justify-between gap-2 mt-auto">
        <Badge variant={leadSourceVariant(lead.source)}>{formatLeadSource(lead.source)}</Badge>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 min-w-0">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${color}`} title={ownerName}>
            {initials}
          </div>
          <span className="truncate max-w-[90px] flex items-center gap-1">
            <User size={10} className="shrink-0" />
            {ownerName}
          </span>
        </div>
      </div>
    </div>
  );
}
