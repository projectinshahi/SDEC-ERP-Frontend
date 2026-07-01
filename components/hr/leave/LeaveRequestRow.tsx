'use client';

import { Check, X, Eye, Trash2, Paperclip } from 'lucide-react';
import { LeaveRequest } from '@/lib/hr/leave.types';
import { LeaveStatusBadge } from './LeaveStatusBadge';

interface LeaveRequestRowProps {
  request: LeaveRequest;
  userRole: 'admin' | 'staff';
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  onViewDetails: (request: LeaveRequest) => void;
}

export function LeaveRequestRow({
  request,
  userRole,
  onApprove,
  onReject,
  onCancel,
  onViewDetails,
}: LeaveRequestRowProps) {
  
  // Format Date Range: "24 Jun - 26 Jun 2026"
  const formatDateRange = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      
      const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
      if (startStr === endStr) {
        return s.toLocaleDateString('en-US', formatOptions);
      }
      
      const startParts = s.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const endParts = e.toLocaleDateString('en-US', formatOptions);
      return `${startParts} - ${endParts}`;
    } catch (err) {
      return `${startStr} to ${endStr}`;
    }
  };

  // Avatar Initials Creator
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Generate color palette based on name hash
  const getAvatarColor = (name: string) => {
    const colors = [
      'from-teal-500/10 to-teal-600/10 text-teal-600 border-teal-500/10',
      'from-blue-500/10 to-blue-600/10 text-blue-600 border-blue-500/10',
      'from-indigo-500/10 to-blue-600/10 text-indigo-600 border-indigo-500/10',
      'from-blue-500/10 to-blue-600/10 text-blue-600 border-blue-500/10',
      'from-amber-500/10 to-amber-600/10 text-amber-600 border-amber-500/10',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-all border-b border-gray-100 dark:border-gray-850/60 last:border-b-0 group">
      {/* Employee */}
      <td className="px-6 py-4.5 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(
              request.employeeName
            )} border flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs`}
          >
            {getInitials(request.employeeName)}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white leading-none">
              {request.employeeName}
            </div>
            <div className="text-2xs font-semibold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider">
              {request.employeeId}
            </div>
          </div>
        </div>
      </td>

      {/* Department */}
      <td className="px-6 py-4.5 whitespace-nowrap">
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
          {request.department}
        </span>
      </td>

      {/* Leave Type */}
      <td className="px-6 py-4.5 whitespace-nowrap">
        <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          {request.leaveType}
        </span>
      </td>

      {/* Date Range */}
      <td className="px-6 py-4.5 whitespace-nowrap">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {formatDateRange(request.startDate, request.endDate)}
        </span>
      </td>

      {/* Days */}
      <td className="px-6 py-4.5 whitespace-nowrap">
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {request.days} <span className="text-2xs font-semibold text-gray-400 dark:text-gray-500">days</span>
        </span>
      </td>

      {/* Reason */}
      <td className="px-6 py-4.5 max-w-xs truncate">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate block" title={request.reason}>
            {request.reason}
          </span>
          {request.attachmentName && (
            <span className="shrink-0 text-teal-500 dark:text-teal-400" title={`Attachment: ${request.attachmentName}`}>
              <Paperclip size={12} />
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4.5 whitespace-nowrap">
        <LeaveStatusBadge status={request.status} />
      </td>

      {/* Actions */}
      <td className="px-6 py-4.5 whitespace-nowrap text-right text-xs">
        <div className="flex items-center justify-end gap-2">
          {/* View Details always available */}
          <button
            onClick={() => onViewDetails(request)}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
            title="View Details"
          >
            <Eye size={15} />
          </button>

          {/* Admin Specific Actions */}
          {userRole === 'admin' && request.status === 'Pending' && (
            <>
              <button
                onClick={() => onApprove(request.id)}
                className="p-1.5 text-emerald-600 hover:text-white hover:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg border border-emerald-500/10 hover:border-emerald-500 transition-all"
                title="Approve Leave"
              >
                <Check size={15} />
              </button>
              <button
                onClick={() => onReject(request.id)}
                className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-500 dark:hover:bg-rose-600 rounded-lg border border-rose-500/10 hover:border-rose-500 transition-all"
                title="Reject Leave"
              >
                <X size={15} />
              </button>
            </>
          )}

          {/* Staff Specific Actions */}
          {userRole === 'staff' && request.status === 'Pending' && (
            <button
              onClick={() => onCancel(request.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-bold text-rose-600 hover:text-white hover:bg-rose-500 dark:hover:bg-rose-600 rounded-lg border border-rose-500/10 hover:border-rose-500 transition-all"
              title="Cancel Request"
            >
              <Trash2 size={12} />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
