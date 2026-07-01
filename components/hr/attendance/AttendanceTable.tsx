'use client';

import React from 'react';
import { Coffee, ArrowUpDown } from 'lucide-react';
import { Card } from '@/components/Card';
import { AttendanceRecord, AttendanceSortKey, SortDirection } from '@/lib/hr/attendance.types';
import { AttendanceRow } from './AttendanceRow';
import { AttendanceActionMenu } from './AttendanceActionMenu';
import { AttendanceEmptyState } from './AttendanceEmptyState';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  selectedIds: string[];
  sortKey: AttendanceSortKey;
  sortDir: SortDirection;
  currentPage: number;
  itemsPerPage: number;
  onSelectAll: () => void;
  onSelectRow: (id: string) => void;
  onEdit: (record: AttendanceRecord) => void;
  onRemove: (id: string) => void;
  onSort: (key: AttendanceSortKey) => void;
  onPageChange: (page: number) => void;
  onBulkRemove: () => void;
  filteredTotal: number;
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: AttendanceSortKey;
  currentKey: AttendanceSortKey;
  currentDir: SortDirection;
  onSort: (key: AttendanceSortKey) => void;
}) {
  const isActive = currentKey === sortKey;
  return (
    <th
      className="py-4 px-4 font-semibold cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1.5">
        {label}
        <ArrowUpDown
          size={12}
          className={`transition-opacity ${isActive ? 'opacity-100 text-blue-500' : 'opacity-30'}`}
        />
      </span>
    </th>
  );
}

export function AttendanceTable({
  records,
  selectedIds,
  sortKey,
  sortDir,
  currentPage,
  itemsPerPage,
  onSelectAll,
  onSelectRow,
  onEdit,
  onRemove,
  onSort,
  onPageChange,
  onBulkRemove,
  filteredTotal,
}: AttendanceTableProps) {
  const totalPages = Math.ceil(filteredTotal / itemsPerPage);
  const allPageSelected =
    records.length > 0 && records.every((r) => selectedIds.includes(r.id));
  const startEntry = (currentPage - 1) * itemsPerPage + 1;
  const endEntry = Math.min(filteredTotal, currentPage * itemsPerPage);

  return (
    <Card className="overflow-hidden flex flex-col">
      {/* ─── Desktop table ────────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-850/80 text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50/30 dark:bg-gray-900/10 uppercase tracking-widest">
              <th className="py-4 px-5 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={onSelectAll}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
              </th>
              <SortableHeader
                label="Employee"
                sortKey="name"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                label="Department"
                sortKey="department"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={onSort}
              />
              <th className="py-4 px-4 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <Coffee size={11} className="text-amber-400" />
                  Punch Timeline
                </span>
              </th>
              <SortableHeader
                label="Total Hours"
                sortKey="totalHours"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={onSort}
              />
              <SortableHeader
                label="Status"
                sortKey="status"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={onSort}
              />
              <th className="py-4 px-4 font-semibold">HR Note</th>
              <th className="py-4 px-5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {records.length === 0 ? (
              <AttendanceEmptyState />
            ) : (
              records.map((record) => (
                <AttendanceRow
                  key={record.id}
                  record={record}
                  isSelected={selectedIds.includes(record.id)}
                  onSelect={() => onSelectRow(record.id)}
                  actionMenu={
                    <AttendanceActionMenu
                      record={record}
                      onEdit={onEdit}
                      onRemove={onRemove}
                    />
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Mobile card list ─────────────────────────────────────────── */}
      <div className="md:hidden p-4 space-y-3">
        {records.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No records match your filters.</div>
        ) : (
          records.map((record) => {
            const initials = record.name
              .split(' ')
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase();
            return (
              <div
                key={record.id}
                className="rounded-2xl border border-gray-100 dark:border-gray-850 bg-gray-50/40 dark:bg-gray-800/10 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/10 flex items-center justify-center font-black text-sm text-blue-600 dark:text-blue-400">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{record.name}</p>
                      <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500">{record.employeeId}</p>
                    </div>
                  </div>
                  <AttendanceActionMenu
                    record={record}
                    onEdit={onEdit}
                    onRemove={onRemove}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 dark:border-gray-850/60 pt-3">
                  {[
                    { label: 'Dept', value: record.department },
                    { label: 'Status', value: record.status },
                    { label: 'Morning In', value: record.morningIn ?? '—' },
                    { label: 'Check Out', value: record.checkOut ?? '—' },
                    { label: 'Total Hrs', value: record.totalHours ?? '—' },
                    { label: 'Overtime', value: record.overtime ?? '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <span className="block text-gray-400 dark:text-gray-500 font-semibold text-[10px] uppercase tracking-wider mb-0.5">{label}</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── Pagination footer ────────────────────────────────────────── */}
      {filteredTotal > 0 && (
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-850/60 bg-gray-50/20 dark:bg-gray-900/10 flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Showing {startEntry}–{endEntry} of {filteredTotal} records
            </span>
            {selectedIds.length > 0 && (
              <button
                onClick={onBulkRemove}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 rounded-lg transition border border-rose-100 dark:border-rose-900/30"
              >
                Remove Selected ({selectedIds.length})
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => onPageChange(i + 1)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition ${currentPage === i + 1
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
