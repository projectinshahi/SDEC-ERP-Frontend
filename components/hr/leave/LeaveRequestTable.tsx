'use client';

import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { LeaveRequest, LeaveSortKey, SortDirection } from '@/lib/hr/leave.types';
import { LeaveRequestRow } from './LeaveRequestRow';
import { LeaveEmptyState } from './LeaveEmptyState';
import { Card } from '@/components/Card';

interface LeaveRequestTableProps {
  requests: LeaveRequest[];
  allFilteredRequestsCount: number;
  userRole: 'admin' | 'staff';
  sortKey: LeaveSortKey;
  sortDir: SortDirection;
  currentPage: number;
  totalPages: number;
  onSort: (key: LeaveSortKey) => void;
  onPageChange: (page: number) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  onViewDetails: (request: LeaveRequest) => void;
  itemsPerPage: number;
}

export function LeaveRequestTable({
  requests,
  allFilteredRequestsCount,
  userRole,
  sortKey,
  sortDir,
  currentPage,
  totalPages,
  onSort,
  onPageChange,
  onApprove,
  onReject,
  onCancel,
  onDelete,
  canDelete,
  onViewDetails,
  itemsPerPage,
}: LeaveRequestTableProps) {
  
  if (requests.length === 0) {
    return <LeaveEmptyState userRole={userRole} />;
  }

  const renderHeader = (label: string, key?: LeaveSortKey) => {
    if (!key) {
      return (
        <th className="px-4 py-3 text-left text-2xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {label}
        </th>
      );
    }

    const isActive = sortKey === key;
    return (
      <th 
        className="px-4 py-3 text-left text-2xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        onClick={() => onSort(key)}
      >
        <div className="flex items-center gap-1.5 select-none">
          <span>{label}</span>
          <ArrowUpDown 
            size={12} 
            className={`transition-colors shrink-0 ${
              isActive 
                ? 'text-teal-500 dark:text-teal-400' 
                : 'text-gray-300 dark:text-gray-600'
            }`} 
          />
        </div>
      </th>
    );
  };

  // Pagination bounds calculation
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, allFilteredRequestsCount);

  return (
    <Card className="border border-gray-100 dark:border-gray-850 shadow-sm overflow-hidden">
      {/* Desktop Responsive Table */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/70 dark:bg-gray-900/50 border-b border-gray-150 dark:border-gray-850">
              {renderHeader('Employee', 'employeeName')}
              {renderHeader('Department', 'department')}
              {renderHeader('Leave Type', 'leaveType')}
              {renderHeader('Date Range', 'startDate')}
              {renderHeader('Days', 'days')}
              {renderHeader('Reason')}
              {renderHeader('Status', 'status')}
              <th className="px-4 py-3 text-right text-2xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 bg-white dark:bg-gray-900">
            {requests.map((req) => (
              <LeaveRequestRow
                key={req.id}
                request={req}
                userRole={userRole}
                onApprove={onApprove}
                onReject={onReject}
                onCancel={onCancel}
                onDelete={onDelete}
                canDelete={canDelete}
                onViewDetails={onViewDetails}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout Fallback */}
      <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
        {requests.map((req) => {
          const initials = req.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={req.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/25 flex items-center justify-center text-xs font-bold text-teal-600 dark:text-teal-400">
                    {initials}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-none">
                      {req.employeeName}
                    </h4>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block uppercase">
                      {req.employeeId} • {req.department}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                  {req.days} days
                </span>
              </div>

              <div className="flex items-center justify-between text-2xs font-medium text-gray-500 dark:text-gray-400 border-t border-b border-gray-50 dark:border-gray-850 py-2">
                <div>
                  <span className="text-gray-400">Type:</span> {req.leaveType}
                </div>
                <div>
                  <span className="text-gray-400">Dates:</span> {req.startDate} to {req.endDate}
                </div>
              </div>

              <div className="text-2xs text-gray-650 dark:text-gray-405 italic">
                "{req.reason}"
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="inline-flex items-center gap-2 text-2xs font-semibold px-2.5 py-0.5 rounded-full border bg-gray-50 dark:bg-gray-800 border-gray-150 dark:border-gray-850 text-gray-600 dark:text-gray-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    req.status === 'Approved' ? 'bg-emerald-500' :
                    req.status === 'Pending' ? 'bg-amber-500' :
                    req.status === 'Rejected' ? 'bg-rose-500' : 'bg-gray-400'
                  }`} />
                  {req.status}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onViewDetails(req)}
                    className="px-2.5 py-1 text-2xs font-bold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 transition-all border border-gray-200 dark:border-gray-700"
                  >
                    View
                  </button>
                  
                  {userRole === 'admin' && req.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => onApprove(req.id)}
                        className="px-2.5 py-1 text-2xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-sm transition-all"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onReject(req.id)}
                        className="px-2.5 py-1 text-2xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg shadow-sm transition-all"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {userRole === 'staff' && req.status === 'Pending' && (
                    <button
                      onClick={() => onCancel(req.id)}
                      className="px-2.5 py-1 text-2xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg shadow-sm transition-all"
                    >
                      Cancel
                    </button>
                  )}

                  {canDelete && (req.status === 'Approved' || req.status === 'Rejected') && (
                    <button
                      onClick={() => onDelete(req.id)}
                      className="px-2.5 py-1 text-2xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg shadow-sm transition-all"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-850/80 flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Showing <span className="text-gray-800 dark:text-gray-200 font-bold">{startItem}</span> to{' '}
          <span className="text-gray-800 dark:text-gray-200 font-bold">{endItem}</span> of{' '}
          <span className="text-gray-800 dark:text-gray-200 font-bold">{allFilteredRequestsCount}</span> requests
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 border border-gray-200 dark:border-gray-850 text-gray-500 dark:text-gray-450 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="flex items-center gap-1 text-xs">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isCurrent = currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-7.5 h-7.5 font-bold rounded-lg transition-all ${
                    isCurrent
                      ? 'bg-teal-600 dark:bg-teal-500 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 border border-gray-200 dark:border-gray-850 text-gray-500 dark:text-gray-450 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
}
