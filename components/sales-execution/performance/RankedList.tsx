'use client';

/**
 * Small ranked leaderboard list used by both dashboards for Top/Bottom
 * performer & team highlight cards. Each row shows rank, name, an optional
 * sub-line and an attainment % badge.
 */

import { AttainmentBadge, AttainmentBar } from './perfShared';

export interface RankedEntry {
  id: number;
  name: string;
  sub?: string | null;
  pct: number;
}

const RANK_TONE = ['bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-gray-200 text-gray-700 dark:bg-gray-700/60 dark:text-gray-200',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'];

export function RankedList({ entries, emptyText }: { entries: RankedEntry[]; emptyText: string }) {
  if (!entries.length) {
    return <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">{emptyText}</p>;
  }
  return (
    <ol className="space-y-3">
      {entries.map((e, i) => (
        <li key={e.id} className="flex items-center gap-3">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${
              RANK_TONE[i] ?? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{e.name}</p>
              <AttainmentBadge pct={e.pct} />
            </div>
            {e.sub ? <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">{e.sub}</p> : null}
            <AttainmentBar pct={e.pct} className="mt-1.5" />
          </div>
        </li>
      ))}
    </ol>
  );
}
