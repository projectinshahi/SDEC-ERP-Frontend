'use client';

import Link from 'next/link';
import { classNames } from '@/lib/utils';

/* ── View toggle — Kanban / List / Deadlines. Plain links carrying the SAME
 *    filter query string, so switching view can never drop a filter. ───────── */
export function ViewToggle({ current, query }: { current: 'board' | 'list' | 'deadlines'; query: string }) {
  const views = [
    { key: 'board', label: 'Board', href: '/dashboard/marketing/content' },
    { key: 'list', label: 'List', href: '/dashboard/marketing/content/list' },
    { key: 'deadlines', label: 'Deadlines', href: '/dashboard/marketing/content/deadlines' },
  ] as const;
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      {views.map((v) => (
        <Link
          key={v.key}
          href={query ? `${v.href}?${query}` : v.href}
          className={classNames(
            'px-2.5 py-1.5 text-xs font-semibold transition',
            v.key === current
              ? 'bg-cyan-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
          )}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}
