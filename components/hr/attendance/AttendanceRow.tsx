'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { AttendanceRecord } from '@/lib/hr/attendance.types';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';

// ── Internal punch time cell ─────────────────────────────────────────────────

function PunchCell({ time, label }: { time: string | null; label: string }) {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {label}
      </span>
      {time ? (
        <span className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
          {time}
        </span>
      ) : (
        <span className="text-xs font-mono font-medium text-gray-300 dark:text-gray-600">—</span>
      )}
    </div>
  );
}

// ── Row component ─────────────────────────────────────────────────────────────

interface AttendanceRowProps {
  record: AttendanceRecord;
  isSelected: boolean;
  onSelect: () => void;
  actionMenu: React.ReactNode;
}

export function AttendanceRow({ record, isSelected, onSelect, actionMenu }: AttendanceRowProps) {
  const initials = record.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <tr
      className={`hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors ${
        isSelected ? 'bg-violet-50/30 dark:bg-violet-950/10' : ''
      }`}
    >
      {/* Checkbox */}
      <td className="py-4 px-5 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500 h-4 w-4"
        />
      </td>

      {/* Employee */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-600/10 border border-violet-500/10 flex items-center justify-center font-black text-sm text-violet-600 dark:text-violet-400 shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">
              {record.name}
            </p>
            <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-0.5">
              {record.employeeId}
            </p>
          </div>
        </div>
      </td>

      {/* Department + Role */}
      <td className="py-4 px-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{record.department}</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">{record.role}</p>
      </td>

      {/* 4-stage punch time grid */}
      <td className="py-4 px-4">
        <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 min-w-[220px]">
          <PunchCell time={record.morningIn} label="Morning In" />
          <PunchCell time={record.lunchOut} label="Lunch Out" />
          <PunchCell time={record.lunchIn} label="Lunch In" />
          <PunchCell time={record.checkOut} label="Check Out" />
        </div>
      </td>

      {/* Total Hours + Overtime */}
      <td className="py-4 px-4 whitespace-nowrap">
        {record.totalHours ? (
          <>
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-violet-500 dark:text-violet-400 shrink-0" />
              <span className="text-sm font-bold font-mono text-gray-800 dark:text-gray-100 tabular-nums">
                {record.totalHours}
              </span>
            </div>
            {record.overtime && (
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 pl-[18px]">
                +{record.overtime} OT
              </p>
            )}
          </>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600 font-mono">—</span>
        )}
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <AttendanceStatusBadge status={record.status} />
      </td>

      {/* HR Note */}
      <td className="py-4 px-4 max-w-[160px]">
        {record.note ? (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed line-clamp-2">
            {record.note}
          </p>
        ) : (
          <span className="text-gray-200 dark:text-gray-700 text-xs">—</span>
        )}
      </td>

      {/* Action menu */}
      <td className="py-4 px-5 text-right">{actionMenu}</td>
    </tr>
  );
}
