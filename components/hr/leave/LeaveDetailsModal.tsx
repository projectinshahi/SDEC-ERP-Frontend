'use client';

import { X } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/Card';
import { LeaveRequest } from '@/lib/hr/leave.types';

interface LeaveDetailsModalProps {
  request: LeaveRequest | null;
  onClose: () => void;
}

export function LeaveDetailsModal({ request, onClose }: LeaveDetailsModalProps) {
  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
      <Card className="w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-850">
        <CardHeader className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-850">
          <h3 className="font-bold text-gray-900 dark:text-white">Leave Application Details</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400">
            <X size={16} />
          </button>
        </CardHeader>
        <CardBody className="space-y-3.5 py-4 text-xs font-semibold text-gray-700 dark:text-gray-405">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-400">Employee:</span>
            <span>{request.employeeName} ({request.employeeId})</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-400">Leave Type:</span>
            <span>{request.leaveType}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-400">Duration:</span>
            <span>{request.startDate} to {request.endDate} ({request.days} days)</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-400">Applied On:</span>
            <span>{request.appliedDate}</span>
          </div>
          <div className="border-b pb-2">
            <span className="text-gray-400 block mb-1">Reason:</span>
            <p className="font-normal italic text-gray-600 dark:text-gray-400">"{request.reason}"</p>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-400">Status:</span>
            <span className="font-bold">{request.status}</span>
          </div>
          {request.approvedBy && (
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-400">Processed By:</span>
              <span>{request.approvedBy} on {request.approvedDate}</span>
            </div>
          )}
          {request.rejectReason && (
            <div>
              <span className="text-gray-400 block mb-1">Rejection Remarks:</span>
              <p className="font-normal text-rose-600 dark:text-rose-400 italic">"{request.rejectReason}"</p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
