'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CalendarClock, Check, X, ChevronRight, PackageOpen, Loader2 } from 'lucide-react';
import { fetchLeaves, approveLeave, rejectLeave, type ApiLeaveRecord } from '@/lib/api/hr-leave';

export function PendingLeaveRequests() {
  const [leaves, setLeaves] = useState<ApiLeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);

  const loadPendingLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchLeaves();
      // Filter for raw status 'pending' (from backend)
      const pendingOnly = data.filter((item) => item.status === 'pending');
      setLeaves(pendingOnly);
    } catch (err) {
      console.error('[PendingLeaveRequests] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingLeaves();
  }, [loadPendingLeaves]);

  const handleApprove = async (id: number) => {
    setActioningId(id);
    try {
      await approveLeave(id);
      await loadPendingLeaves();
    } catch (err) {
      console.error('[PendingLeaveRequests] approve error:', err);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: number) => {
    setActioningId(id);
    try {
      await rejectLeave(id);
      await loadPendingLeaves();
    } catch (err) {
      console.error('[PendingLeaveRequests] reject error:', err);
    } finally {
      setActioningId(null);
    }
  };

  const formatDateRange = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
      if (startStr === endStr) {
        return s.toLocaleDateString('en-US', formatOptions);
      }
      return `${s.toLocaleDateString('en-US', formatOptions)} - ${e.toLocaleDateString('en-US', formatOptions)}`;
    } catch {
      return `${startStr} to ${endStr}`;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-850 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center text-teal-650 dark:text-teal-400">
              <CalendarClock size={14} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Pending Leaves</h2>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-9">Requests requiring HR response</p>
        </div>
        {leaves.length > 0 && (
          <span className="inline-flex items-center text-[10px] font-bold text-teal-655 bg-teal-50 dark:bg-teal-950/30 px-2.5 py-1 rounded-full border border-teal-100 dark:border-teal-900/40">
            {leaves.length} New
          </span>
        )}
      </div>

      {/* Body List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-hide">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-150/40 dark:bg-gray-800" />
            ))}
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <PackageOpen size={28} className="text-gray-300 dark:text-gray-700" />
            <div>
              <p className="text-sm font-semibold text-gray-400 dark:text-gray-600">All clear — no pending leaves</p>
              <p className="text-[11px] text-gray-300 dark:text-gray-700 mt-1">Ready for the day</p>
            </div>
          </div>
        ) : (
          leaves.map((leave) => {
            const isActioning = actioningId === leave.id;
            const empName = leave.name ?? 'Employee';
            const initials = getInitials(empName);

            return (
              <div
                key={leave.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/40 dark:bg-gray-800/10"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-650/10 border border-teal-500/10 flex items-center justify-center text-xs font-bold text-teal-600 dark:text-teal-400 shrink-0">
                  {initials}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-bold text-gray-900 dark:text-white truncate">{empName}</p>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {leave.days} {leave.days === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {leave.leave_type} · <span className="font-medium text-gray-400">{formatDateRange(leave.start_date, leave.end_date)}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-1.5 ml-1">
                  {isActioning ? (
                    <Loader2 size={14} className="animate-spin text-gray-400" />
                  ) : (
                    <>
                      <button
                        onClick={() => handleApprove(leave.id)}
                        className="p-1 text-emerald-600 hover:text-white hover:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg border border-emerald-500/10 transition-colors"
                        title="Approve"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => handleReject(leave.id)}
                        className="p-1 text-rose-600 hover:text-white hover:bg-rose-500 dark:hover:bg-rose-600 rounded-lg border border-rose-500/10 transition-colors"
                        title="Reject"
                      >
                        <X size={13} />
                      </button>
                    </>
                  )}
                  <Link href="/dashboard/hr/leave" className="p-1 text-gray-400 hover:text-gray-650 hover:bg-gray-100 rounded-lg transition-colors">
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
