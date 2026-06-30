'use client';

import { Zap, Clock, Radio } from 'lucide-react';
import type { ActivityFeedItem } from '@/lib/api/hrDashboard';

interface HRActivityFeedProps {
  items?: ActivityFeedItem[];
  loading?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  hire:        'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
  document:    'bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400',
  payroll:     'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
  performance: 'bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400',
  general:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

/** Format ISO timestamp to a human-readable relative time */
function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (isNaN(then)) return iso;
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function HRActivityFeed({ items, loading = false }: HRActivityFeedProps) {
  const feed = items ?? [];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Zap size={14} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">HR Activity Feed</h2>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-9">Live HR actions timeline</p>
        </div>
        {feed.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <Radio size={28} className="text-gray-300 dark:text-gray-700" />
            <div>
              <p className="text-sm font-semibold text-gray-400 dark:text-gray-600">No recent activity</p>
              <p className="text-[11px] text-gray-300 dark:text-gray-700 mt-1">HR actions will appear here in real time</p>
            </div>
          </div>
        ) : (
          feed.map((item) => {
            const colorClass = TYPE_COLORS[item.type] ?? TYPE_COLORS.general;
            const initial = item.actor.charAt(0).toUpperCase();
            return (
              <div key={`${item.type}-${item.id}`} className="flex gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 ${colorClass}`}>
                  {initial}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">
                    <span className="text-gray-900 dark:text-white font-bold">{item.actor}</span>
                    {' '}
                    <span className="font-medium text-gray-600 dark:text-gray-400">{item.action}</span>
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={10} className="text-gray-400 shrink-0" />
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {formatRelative(item.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
