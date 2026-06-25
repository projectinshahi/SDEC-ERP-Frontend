'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api/api-client';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Users, Loader2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { classNames } from '@/lib/utils';

/**
 * Developer Point Distribution — per project member, the assigned / completed /
 * remaining story points and completion %, from LIVE project task data
 * (/projects/:id/sprint-analytics → developerDistribution). Sortable by the
 * numeric columns; full table on desktop, stacked cards on mobile; totals row.
 */

interface DevRow {
  id: number;
  name: string;
  role: string;
  assignedPoints: number;
  completedPoints: number;
  remainingPoints: number;
  completionRate: number;
}

type SortKey = 'assignedPoints' | 'completedPoints' | 'remainingPoints' | 'completionRate';

const AVATAR_TONES = [
  'bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700', 'bg-fuchsia-100 text-fuchsia-700',
];
const avatarTone = (id: number) => AVATAR_TONES[Math.abs(id) % AVATAR_TONES.length];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

const barColor = (pct: number) =>
  pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';

function CompletionBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div
          className={classNames('h-1.5 rounded-full transition-all', barColor(pct))}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums w-12 text-right">
        {pct}%
      </span>
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown size={12} className="opacity-40" />;
  return dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
}

function HeadButton({
  sortKey, label, currentKey, dir, onSort,
}: {
  sortKey: SortKey;
  label: string;
  currentKey: SortKey;
  dir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={classNames(
        'inline-flex items-center gap-1 font-semibold uppercase tracking-wider transition-colors hover:text-indigo-600 dark:hover:text-indigo-400',
        active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400',
      )}
    >
      {label}
      <SortIcon active={active} dir={dir} />
    </button>
  );
}

export function DeveloperPointDistribution({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<DevRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('assignedPoints');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await apiClient.get<{ developerDistribution?: DevRow[] }>(`/projects/${projectId}/sprint-analytics`);
        if (alive) setRows(Array.isArray(res.data?.developerDistribution) ? res.data.developerDistribution : []);
      } catch (err) {
        console.error('Failed to load developer distribution', err);
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [projectId]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === 'asc' ? diff : -diff;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const totals = useMemo(
    () => rows.reduce(
      (acc, r) => ({
        assigned: acc.assigned + r.assignedPoints,
        completed: acc.completed + r.completedPoints,
        remaining: acc.remaining + r.remainingPoints,
      }),
      { assigned: 0, completed: 0, remaining: 0 },
    ),
    [rows],
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <Card variant="outlined" className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm w-full overflow-hidden">
      <CardHeader className="border-b border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-indigo-500" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Developer Point Distribution</h3>
        </div>
        {!loading && rows.length > 0 && (
          <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
            {rows.length} {rows.length === 1 ? 'Developer' : 'Developers'}
          </span>
        )}
      </CardHeader>

      {loading ? (
        <CardBody className="p-10 flex justify-center">
          <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
        </CardBody>
      ) : error ? (
        <CardBody className="p-10 text-center text-sm text-slate-400">Failed to load developer distribution.</CardBody>
      ) : rows.length === 0 ? (
        <CardBody className="p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
            <Users size={22} className="text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No developer assignments yet</p>
          <p className="text-xs text-slate-400 mt-1">Points will appear here once tasks are assigned to project members.</p>
        </CardBody>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[720px] text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-[11px] border-b border-slate-100 dark:border-slate-700/60">
                  <th className="p-4 pl-5 font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Developer</th>
                  <th className="p-4 text-center"><HeadButton sortKey="assignedPoints" label="Assigned" currentKey={sortKey} dir={sortDir} onSort={toggleSort} /></th>
                  <th className="p-4 text-center"><HeadButton sortKey="completedPoints" label="Completed" currentKey={sortKey} dir={sortDir} onSort={toggleSort} /></th>
                  <th className="p-4 text-center"><HeadButton sortKey="remainingPoints" label="Remaining" currentKey={sortKey} dir={sortDir} onSort={toggleSort} /></th>
                  <th className="p-4"><HeadButton sortKey="completionRate" label="Completion %" currentKey={sortKey} dir={sortDir} onSort={toggleSort} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {sorted.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 pl-5">
                      <div className="flex items-center gap-3">
                        <div className={classNames('flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold shrink-0', avatarTone(r.id))}>
                          {initials(r.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{r.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{r.assignedPoints}</td>
                    <td className="p-4 text-center font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{r.completedPoints}</td>
                    <td className="p-4 text-center font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{r.remainingPoints}</td>
                    <td className="p-4"><CompletionBar pct={r.completionRate} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/40 font-bold">
                  <td className="p-4 pl-5 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</td>
                  <td className="p-4 text-center text-slate-800 dark:text-slate-200 tabular-nums">{totals.assigned}</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 tabular-nums">{totals.completed}</td>
                  <td className="p-4 text-center text-amber-600 dark:text-amber-400 tabular-nums">{totals.remaining}</td>
                  <td className="p-4 text-xs font-semibold text-slate-400">
                    {totals.assigned > 0 ? Math.round((totals.completed / totals.assigned) * 1000) / 10 : 0}% overall
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {sorted.map((r) => (
              <div key={r.id} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={classNames('flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold shrink-0', avatarTone(r.id))}>
                    {initials(r.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{r.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.role}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-base font-bold text-slate-800 dark:text-slate-200 tabular-nums">{r.assignedPoints}</p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Assigned</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10">
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{r.completedPoints}</p>
                    <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mt-0.5">Completed</p>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10">
                    <p className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">{r.remainingPoints}</p>
                    <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mt-0.5">Remaining</p>
                  </div>
                </div>
                <CompletionBar pct={r.completionRate} />
              </div>
            ))}
            {/* Mobile totals */}
            <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Totals</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-base font-bold text-slate-800 dark:text-slate-200 tabular-nums">{totals.assigned}</p><p className="text-[10px] font-semibold text-slate-500 uppercase">Assigned</p></div>
                <div><p className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{totals.completed}</p><p className="text-[10px] font-semibold text-emerald-500 uppercase">Completed</p></div>
                <div><p className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">{totals.remaining}</p><p className="text-[10px] font-semibold text-amber-500 uppercase">Remaining</p></div>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
