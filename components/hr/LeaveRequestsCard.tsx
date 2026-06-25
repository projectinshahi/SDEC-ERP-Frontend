'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, ArrowRight, CalendarDays } from 'lucide-react';
import { Card } from '@/components/Card';
import { MOCK_LEAVE_REQUESTS, LeaveRequest } from '@/lib/hr/mockData';

export function LeaveRequestsCard() {
  const [requests, setRequests] = useState<LeaveRequest[]>(MOCK_LEAVE_REQUESTS);
  const [actions, setActions] = useState<Record<string, 'approved' | 'rejected'>>({});

  const handleAction = (id: string, decision: 'approved' | 'rejected') => {
    setActions((prev) => ({ ...prev, [id]: decision }));
    setTimeout(() => {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }, 1000);
  };

  return (
    <Card className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-full flex flex-col shadow-sm">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Leave Requests
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Pending approvals
            </p>
          </div>

          <Link
            href="/dashboard/hr/leave"
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold hover:border-blue-300 hover:text-blue-600 transition"
          >
            View All
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 scrollbar-hide">
        {requests.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-400">
            No pending leave requests
          </div>
        ) : (
          requests.map((req) => {
            const isApproved = actions[req.id] === 'approved';
            const isHandled = req.id in actions;

            return (
              <div
                key={req.id}
                className="p-5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex gap-4">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-sm text-gray-700 dark:text-gray-200 shadow-sm shrink-0">
                    {req.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {req.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {req.role}
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          req.leaveType === 'Sick Leave'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300'
                        }`}
                      >
                        {req.leaveType}
                      </span>
                    </div>

                    {/* Date info */}
                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={12} />
                        {req.dateRange}
                      </span>

                      <span className="text-gray-300 dark:text-gray-700">•</span>

                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {req.days} {req.days === 1 ? 'day' : 'days'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex justify-end">
                      {isHandled ? (
                        <span
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300'
                          }`}
                        >
                          {isApproved ? 'Approved' : 'Rejected'}
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(req.id, 'approved')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                          >
                            <Check size={14} />
                            Approve
                          </button>

                          <button
                            onClick={() => handleAction(req.id, 'rejected')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-xs font-semibold"
                          >
                            <X size={14} />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40">
        <Link
          href="/dashboard/hr/leave"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 hover:text-blue-600 font-semibold text-sm transition"
        >
          <span>View All Leave Requests</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </Card>
  );
}