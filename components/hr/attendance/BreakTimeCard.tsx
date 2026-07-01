'use client';

import React from 'react';
import { Coffee, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/Card';
import { AttendanceRecord } from '@/lib/hr/attendance.types';

interface BreakTimeCardProps {
  records: AttendanceRecord[];
}

export function BreakTimeCard({ records }: BreakTimeCardProps) {
  // Derive employees who are currently on lunch break
  // i.e., lunchOut is recorded but lunchIn is null
  const onBreak = records.filter(
    (r) => r.lunchOut !== null && r.lunchIn === null && r.status !== 'Absent' && r.status !== 'On Leave'
  );

  // Employees who have completed both punch stages (lunchIn filled)
  const completedBreak = records.filter(
    (r) => r.lunchOut !== null && r.lunchIn !== null
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center justify-center">
            <Coffee size={16} className="text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Break Status</h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
              Lunch punch-out tracking
            </p>
          </div>
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Summary row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/20 p-3 text-center">
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">{onBreak.length}</p>
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 mt-0.5">On Break</p>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 p-3 text-center">
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{completedBreak.length}</p>
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mt-0.5">Returned</p>
          </div>
        </div>

        {/* Currently on break list */}
        {onBreak.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3 font-medium">
            No employees currently on break.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Currently on break
            </p>
            <div className="space-y-2">
              {onBreak.slice(0, 5).map((r) => {
                const initials = r.name
                  .split(' ')
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase();
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50/60 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-850/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30 flex items-center justify-center text-[11px] font-black text-amber-700 dark:text-amber-300 shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-none">{r.name}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">{r.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                      <span>{r.lunchOut}</span>
                      <ArrowRight size={10} />
                    </div>
                  </div>
                );
              })}
              {onBreak.length > 5 && (
                <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 font-medium pt-1">
                  +{onBreak.length - 5} more on break
                </p>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
