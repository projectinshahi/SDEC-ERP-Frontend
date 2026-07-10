'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/Card';
import { fetchEmployeeReport, type AnalyticsBaseFilters } from '@/lib/api/hrAnalytics';
import type { EmployeeReportResponse } from '@/lib/hr/attendanceAnalytics.types';

const PAGE_SIZE = 10;

const COLUMNS: { key: string; label: string; num?: boolean }[] = [
  { key: 'name', label: 'Employee' },
  { key: 'department', label: 'Department' },
  { key: 'workingDays', label: 'Working', num: true },
  { key: 'present', label: 'Present', num: true },
  { key: 'absent', label: 'Absent', num: true },
  { key: 'late', label: 'Late', num: true },
  { key: 'halfDay', label: 'Half Day', num: true },
  { key: 'fullDayLeave', label: 'Full Leave', num: true },
  { key: 'attendancePct', label: 'Attend %', num: true },
  { key: 'absenteeismPct', label: 'Absent %', num: true },
  { key: 'punctualityPct', label: 'Punctual %', num: true },
  { key: 'lopDays', label: 'LOP*', num: true },
  { key: 'payableDays', label: 'Payable*', num: true },
];

export function EmployeeReportTable({
  filters,
  onRowClick,
  onQueryChange,
}: {
  filters: AnalyticsBaseFilters;
  onRowClick?: (employeeId: number) => void;
  onQueryChange?: (q: { sort: string; order: 'asc' | 'desc'; search: string }) => void;
}) {
  const [data, setData] = useState<EmployeeReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('attendancePct');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Debounce the search box.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Reset to page 1 when the shared filters change.
  useEffect(() => {
    setPage(1);
  }, [filters.from, filters.to, filters.department, filters.employeeId]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetchEmployeeReport({
        ...filters,
        page,
        pageSize: PAGE_SIZE,
        sort,
        order,
        search: search || undefined,
      });
      setData(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load employee report');
    } finally {
      setLoading(false);
    }
  }, [filters, page, sort, order, search]);

  useEffect(() => {
    load();
  }, [load]);

  // Publish the live query state (sort/order + committed search) so the parent's
  // export bar mirrors exactly what the table is showing.
  useEffect(() => {
    onQueryChange?.({ sort, order, search });
  }, [sort, order, search, onQueryChange]);

  const toggleSort = (key: string) => {
    if (sort === key) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(key);
      setOrder(key === 'name' || key === 'department' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const rows = data?.rows ?? [];
  const totals = data?.totals;
  const pg = data?.pagination;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800/60">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Employee Attendance Report</h3>
          <p className="text-[11px] text-gray-400">*LOP / Payable — Estimated for Payroll Reference</p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name or code…"
            className="w-56 rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/70 text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={`whitespace-nowrap px-3 py-2.5 font-semibold ${c.num ? 'text-right' : 'text-left'} ${c.key === 'name' ? 'sticky left-0 z-10 bg-gray-50/70 dark:bg-gray-900/40' : ''}`}
                >
                  <button
                    onClick={() => toggleSort(c.key)}
                    className={`inline-flex items-center gap-1 hover:text-gray-800 dark:hover:text-gray-200 ${c.num ? 'flex-row-reverse' : ''}`}
                  >
                    {c.label}
                    {sort === c.key ? (
                      order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="opacity-40" />
                    )}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2.5 text-center font-semibold">Flag</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="py-16 text-center text-gray-400">
                  <Loader2 className="inline h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="py-16 text-center text-rose-500">
                  {err}
                  <button onClick={load} className="ml-2 underline">Retry</button>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="py-16 text-center text-gray-400">
                  No employees match these filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.employeeId}
                  onClick={() => onRowClick?.(r.employeeId)}
                  title={onRowClick ? 'View attendance details' : undefined}
                  className={`border-t border-gray-100 dark:border-gray-800/60 ${
                    onRowClick
                      ? 'cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20'
                      : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/30'
                  }`}
                >
                  <td className="sticky left-0 z-10 bg-white px-3 py-2.5 dark:bg-gray-900">
                    <div className="whitespace-nowrap font-semibold text-gray-800 dark:text-gray-100">{r.name}</div>
                    <div className="text-[11px] text-gray-400">{r.employeeCode}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-gray-600 dark:text-gray-300">
                    {r.department}
                    <div className="text-[11px] text-gray-400">{r.designation}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.workingDays}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{r.present}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-rose-600 dark:text-rose-400">{r.absent}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-amber-600 dark:text-amber-400">{r.late}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.halfDay}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.fullDayLeave}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{r.attendancePct}%</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.absenteeismPct}%</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.punctualityPct}%</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{r.lopDays}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{r.payableDays}</td>
                  <td className="px-3 py-2.5 text-center">
                    {r.perfectAttendance ? (
                      <ShieldCheck size={15} className="inline text-emerald-500" aria-label="Perfect attendance" />
                    ) : r.atRisk ? (
                      <AlertTriangle size={15} className="inline text-rose-500" aria-label="At risk" />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {totals && rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50/70 font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-100">
                <td className="sticky left-0 bg-gray-50/70 px-3 py-2.5 dark:bg-gray-900/40">Totals ({totals.employees})</td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-right tabular-nums">{totals.workingDays}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{totals.present}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{totals.absent}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{totals.late}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{totals.halfDay}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{totals.fullDayLeave}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{totals.attendancePct}%</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{totals.absenteeismPct}%</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{totals.punctualityPct}%</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{totals.lopDays}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{totals.payableDays}</td>
                <td className="px-3 py-2.5" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {pg && pg.total > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-xs dark:border-gray-800/60">
          <span className="text-gray-500">
            Showing {(pg.page - 1) * pg.pageSize + 1}–{Math.min(pg.page * pg.pageSize, pg.total)} of {pg.total}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={pg.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Prev
            </button>
            <span className="text-gray-500">Page {pg.page} / {pg.totalPages}</span>
            <button
              disabled={pg.page >= pg.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
