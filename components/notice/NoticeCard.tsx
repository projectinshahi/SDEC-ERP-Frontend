'use client';

import {
  Pin, Star, Clock, CalendarDays, Tag, Paperclip,
  Megaphone, Users, ShieldCheck, Settings, Cpu, DollarSign, AlertTriangle, Wrench, PartyPopper,
} from 'lucide-react';
import { Badge, type BadgeVariant } from '@/components/Badge';
import { classNames } from '@/lib/utils';
import type { Notice } from '@/lib/api/notices';

/**
 * Notice card + its badges. Reuses the existing Badge component for priority; the
 * category badge uses inline style (colour is a DB hex value the 5-variant Badge
 * enum can't express) and resolves the stored lucide icon NAME via CATEGORY_ICONS.
 */

// Lucide name (stored on notice_categories.icon) → component. Falls back to Tag.
const CATEGORY_ICONS: Record<string, typeof Tag> = {
  Megaphone, Users, ShieldCheck, CalendarDays, Settings, Cpu, DollarSign, AlertTriangle, Wrench, PartyPopper,
};

const PRIORITY_VARIANTS: Record<string, BadgeVariant> = {
  critical: 'danger', high: 'warning', medium: 'info', low: 'default',
};
const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
};

function fmtDate(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
function initials(name?: string | null): string {
  return (name || '?').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export function CategoryBadge({ category }: { category: Notice['category'] }) {
  if (!category) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
        <Tag className="h-3 w-3" /> Uncategorized
      </span>
    );
  }
  const Icon = (category.icon && CATEGORY_ICONS[category.icon]) || Tag;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      // 8-digit hex = colour + ~10% alpha tint for the background.
      style={{ backgroundColor: `${category.color}1a`, color: category.color }}
    >
      <Icon className="h-3 w-3" /> {category.name}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge variant={PRIORITY_VARIANTS[priority] ?? 'default'}>{PRIORITY_LABELS[priority] ?? priority}</Badge>;
}

export function NoticeCard({ notice, onOpen }: { notice: Notice; onOpen?: (n: Notice) => void }) {
  const bucket = notice.expiringBucket;
  // Priority of the left accent: unread (rose) > important (amber) > pinned (indigo).
  const accent = notice.unread
    ? 'border-l-4 border-l-rose-500'
    : notice.isImportant
      ? 'border-l-4 border-l-amber-400'
      : notice.isPinned
        ? 'border-l-4 border-l-indigo-400'
        : 'border-l-4 border-l-transparent';

  return (
    <button
      type="button"
      onClick={() => onOpen?.(notice)}
      className={classNames(
        'w-full rounded-xl border border-gray-200 bg-white p-3.5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md',
        accent,
        notice.unread && 'bg-rose-50/30',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          {notice.unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" title="Unread" />}
          {notice.isPinned && <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 -rotate-45 text-indigo-500" aria-label="Pinned" />}
          <span className={classNames('truncate text-sm text-gray-800', notice.unread ? 'font-bold' : 'font-semibold')}>
            {notice.title}
          </span>
        </span>
        {notice.unread && (
          <span className="shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">Unread</span>
        )}
      </div>

      <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-gray-500">{notice.body}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <CategoryBadge category={notice.category} />
        <PriorityBadge priority={notice.priority} />
        {notice.isImportant && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
            <Star className="h-2.5 w-2.5" /> Important
          </span>
        )}
        {notice.attachments?.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
            <Paperclip className="h-2.5 w-2.5" /> {notice.attachments.length}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-700">
            {initials(notice.publishedBy?.name)}
          </span>
          {notice.publishedBy?.name || 'Unknown'}
        </span>
        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {fmtDate(notice.publishedAt)}</span>
        {notice.expiresAt && (
          <span
            className={classNames(
              'inline-flex items-center gap-1',
              bucket === 'today' ? 'font-semibold text-rose-600' : bucket === 'tomorrow' ? 'font-semibold text-amber-600' : 'text-gray-500',
            )}
          >
            <Clock className="h-3 w-3" /> Expires {fmtDate(notice.expiresAt)}
            {bucket === 'today' ? ' · Today' : bucket === 'tomorrow' ? ' · Tomorrow' : ''}
          </span>
        )}
      </div>
    </button>
  );
}
