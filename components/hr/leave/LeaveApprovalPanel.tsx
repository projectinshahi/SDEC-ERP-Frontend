'use client';

import { ShieldAlert, AlertTriangle, UserCheck, Check, X, Calendar } from 'lucide-react';
import { LeaveRequest } from '@/lib/hr/leave.types';
import { MOCK_LEAVE_RECORDS } from '@/lib/hr/leave.mock';
import { Card, CardHeader, CardBody } from '@/components/Card';

interface LeaveApprovalPanelProps {
  urgentRequests: LeaveRequest[];
  overlappingRequests: Record<string, string[]>;
  currentlyOnLeave: LeaveRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  userRole: 'admin' | 'staff';
}

export function LeaveApprovalPanel({
  urgentRequests,
  overlappingRequests,
  currentlyOnLeave,
  onApprove,
  onReject,
  userRole,
}: LeaveApprovalPanelProps) {
  
  const hasUrgent = urgentRequests.length > 0;
  const hasOverlapping = Object.keys(overlappingRequests).length > 0;
  const hasOnLeave = currentlyOnLeave.length > 0;

  return (
    <div className="space-y-6">
      {/* 1. Urgent Decisions (Admin Only) */}
      {userRole === 'admin' && (
        <Card className="border border-red-100/70 dark:border-red-950/20 shadow-xs">
          <CardHeader className="bg-red-50/50 dark:bg-red-950/10 px-5 py-4 border-b border-red-100/50 dark:border-red-950/20 flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-500 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-450">
              Urgent Attention Required ({urgentRequests.length})
            </h3>
          </CardHeader>
          
          <CardBody className="p-4 divide-y divide-gray-100 dark:divide-gray-800">
            {!hasUrgent ? (
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 text-center py-4">
                No urgent or emergency requests pending.
              </p>
            ) : (
              urgentRequests.map(req => (
                <div key={req.id} className="py-3 first:pt-0 last:pb-0 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                        {req.employeeName}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-0.5 uppercase">
                        {req.leaveType} • {req.days}d
                      </div>
                    </div>

                    {/* Quick Approve / Reject for Urgent Panel */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onApprove(req.id)}
                        className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-600 transition-all border border-emerald-100/30"
                        title="Approve"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => onReject(req.id)}
                        className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-600 transition-all border border-rose-100/30"
                        title="Reject"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="text-2xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-150/40 dark:border-gray-850 italic">
                    "{req.reason}"
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      )}

      {/* 2. Overlapping Conflicts (Admin Only) */}
      {userRole === 'admin' && (
        <Card className="border border-amber-100/70 dark:border-amber-950/20 shadow-xs">
          <CardHeader className="bg-amber-50/50 dark:bg-amber-950/10 px-5 py-4 border-b border-amber-100/50 dark:border-amber-950/20 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              Coverage Conflicts
            </h3>
          </CardHeader>
          
          <CardBody className="p-4 divide-y divide-gray-150/30 dark:divide-gray-800">
            {!hasOverlapping ? (
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 text-center py-4">
                No overlapping leave schedules detected.
              </p>
            ) : (
              Object.entries(overlappingRequests).map(([reqId, overlappingNames]) => {
                const requestDetail = urgentRequests.find((r: LeaveRequest) => r.id === reqId) || MOCK_LEAVE_RECORDS.find((r: LeaveRequest) => r.id === reqId);
                if (!requestDetail) return null;

                return (
                  <div key={reqId} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {requestDetail.employeeName} ({requestDetail.department})
                    </div>
                    <p className="text-2xs text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">
                      Wants <span className="text-gray-700 dark:text-white font-bold">{requestDetail.days} days ({requestDetail.startDate})</span>, but{' '}
                      <span className="text-amber-600 dark:text-amber-400 font-bold">{overlappingNames.join(', ')}</span>{' '}
                      {overlappingNames.length === 1 ? 'is' : 'are'} already approved to be away.
                    </p>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>
      )}

      {/* 3. Employees On Leave Today (Admin and Staff) */}
      <Card className="border border-gray-100 dark:border-gray-850 shadow-sm">
        <CardHeader className="px-5 py-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-850/60">
          <UserCheck size={16} className="text-teal-500 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-300">
            Out of Office Today ({currentlyOnLeave.length})
          </h3>
        </CardHeader>
        
        <CardBody className="p-4 max-h-[320px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
          {!hasOnLeave ? (
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 text-center py-4">
              All employees present today.
            </p>
          ) : (
            currentlyOnLeave.map(req => (
              <div key={req.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-900 dark:text-white leading-none">
                    {req.employeeName}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-1 uppercase font-semibold">
                    {req.department} • {req.leaveType}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 border border-teal-100/40 text-[10px] font-bold">
                  <Calendar size={10} />
                  Until {new Date(req.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
