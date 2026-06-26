'use client';

/**
 * SE-028.1 — Team-wise task rollup for the Manager Team Task view.
 *
 * Shown when the Team filter is "All Teams": one row PER TEAM aggregating every
 * member's tasks (total / completed / pending / overdue / blocked) plus a
 * completion-% bar. Mirrors MemberBreakdownTable's layout exactly — only the
 * leading column (team + member count) and the title differ. Selecting a
 * specific team swaps this for the per-member MemberBreakdownTable.
 */

import { Users, AlertTriangle, Ban } from 'lucide-react';
import { Card } from '@/components/Card';
import { classNames } from '@/lib/utils';
import type { TeamBreakdownRow } from '@/lib/types/salesExecution';

interface TeamBreakdownTableProps {
  teams: TeamBreakdownRow[];
}

function completionTone(pct: number): string {
  if (pct >= 75) return 'bg-emerald-500';
  if (pct >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function TeamBreakdownTable({ teams }: TeamBreakdownTableProps) {
  const sorted = [...teams].sort((a, b) => b.completionRate - a.completionRate);

  return (
    <Card variant="outlined" className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
        <Users size={16} className="text-gray-400" />
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          Team Breakdown
        </h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {sorted.length}
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <th className="px-5 py-3">Team</th>
              <th className="px-3 py-3 text-center">Total</th>
              <th className="px-3 py-3 text-center">Completed</th>
              <th className="px-3 py-3 text-center">Pending</th>
              <th className="px-3 py-3 text-center">Overdue</th>
              <th className="px-3 py-3 text-center">Blocked</th>
              <th className="px-5 py-3">Completion</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const flagged = t.overdue > 0 || t.blocked > 0;
              const pct = Math.max(0, Math.min(100, Math.round(t.completionRate)));
              return (
                <tr
                  key={t.teamId}
                  className={classNames(
                    'border-b border-gray-100 transition-colors last:border-0 dark:border-gray-800',
                    flagged
                      ? 'bg-rose-50/40 dark:bg-rose-950/10'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                  )}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                        {t.teamName.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
                          {t.teamName}
                        </p>
                        <p className="truncate text-xs text-gray-400">
                          {t.memberCount} member{t.memberCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-gray-700 dark:text-gray-200">
                    {t.total}
                  </td>
                  <td className="px-3 py-3 text-center text-emerald-600 dark:text-emerald-400">
                    {t.completed}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-600 dark:text-gray-300">
                    {t.pending}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={classNames(
                        'font-semibold',
                        t.overdue > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-gray-400'
                      )}
                    >
                      {t.overdue}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={classNames(
                        'font-semibold',
                        t.blocked > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-400'
                      )}
                    >
                      {t.blocked}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className={classNames('h-full rounded-full transition-all', completionTone(pct))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {pct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800">
        {sorted.map((t) => {
          const flagged = t.overdue > 0 || t.blocked > 0;
          const pct = Math.max(0, Math.min(100, Math.round(t.completionRate)));
          return (
            <div
              key={t.teamId}
              className={classNames('px-4 py-3.5', flagged && 'bg-rose-50/40 dark:bg-rose-950/10')}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                  {t.teamName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{t.teamName}</p>
                  <p className="truncate text-xs text-gray-400">
                    {t.memberCount} member{t.memberCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{pct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={classNames('h-full rounded-full transition-all', completionTone(pct))}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span>Total {t.total}</span>
                <span className="text-emerald-600 dark:text-emerald-400">Done {t.completed}</span>
                <span>Pending {t.pending}</span>
                {t.overdue > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                    <AlertTriangle size={11} /> {t.overdue} overdue
                  </span>
                )}
                {t.blocked > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                    <Ban size={11} /> {t.blocked} blocked
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
