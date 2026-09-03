'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, User, Trash2, Clock } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { formatLeadSource, leadSourceVariant } from '@/lib/data/leadSources';
import { formatINR } from '@/lib/utils/currency';
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
  /** Ordered stage list — powers the touch-friendly "move" dropdown on mobile. */
  stages?: { name: string }[];
  /** Whether the user may move this opportunity between stages (sales.leads.edit). */
  canMove?: boolean;
  /** Move this opportunity to another stage (reuses the board's onMove → moveLeadStage). */
  onMoveStage?: (stageName: string) => void;
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

/** Compact "time ago" for the card's last-updated line. */
function timeAgo(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30); if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

/**
 * Pipeline lead card. Shows lead name, company, owner, source and score.
 * Uses native HTML5 drag-and-drop (matching the Task board) and navigates to
 * the lead detail page on click.
 */
export function LeadCard({ lead, draggable, isDragging, onDragStart, onDragEnd, canDelete, onDelete, stages, canMove, onMoveStage }: LeadCardProps) {
  const router = useRouter();
  const ownerName = lead.owner?.name || 'Unassigned';
  const { initials, color } = avatar(ownerName);
  const priority = (lead.priority || '').toLowerCase();
  const hasValue = lead.leadValue != null && lead.leadValue > 0;

  return (
    <div
      draggable={draggable}
      data-lead-id={lead.id}
      onDragStart={(e) => {
        onDragStart(lead.id);
        e.dataTransfer.setData('text/plain', String(lead.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={onDragEnd}
      onClick={() => router.push(`/dashboard/sales/pipeline/${lead.id}`)}
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

      {/* Opportunity value + priority (compact, only when present) */}
      {(hasValue || priority) && (
        <div className="flex items-center justify-between gap-2 mb-2">
          {hasValue ? (
            <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{formatINR(lead.leadValue as number)}</span>
          ) : (
            <span />
          )}
          {priority && (
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.low}`}>
              {priority}
            </span>
          )}
        </div>
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

      {lead.updatedAt && (
        <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <Clock size={10} className="shrink-0" /> Updated {timeAgo(lead.updatedAt)}
        </p>
      )}

      {/* Touch-friendly stage move (mobile only) — native HTML5 drag doesn't fire on touch. */}
      {canMove && onMoveStage && stages && stages.length > 0 && (
        <div className="sm:hidden mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <select
            aria-label="Move to stage"
            value={lead.stage || ''}
            draggable={false}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              const v = e.target.value;
              if (v && v !== lead.stage) onMoveStage(v);
            }}
            className="w-full text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-gray-700 dark:text-gray-300"
          >
            {stages.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
