// ─────────────────────────────────────────────────────────────────────────────
// HR Leave Module — Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export type LeaveType = 'Casual Leave' | 'Sick Leave' | 'Paid Leave' | 'Emergency Leave';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: LeaveType;
  startDate: string; // "2026-06-25"
  endDate: string;   // "2026-06-27"
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedDate: string; // "2026-06-20"
  attachmentName?: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectReason?: string;
  isUrgent?: boolean; // For approval panel
}

export interface LeaveBalance {
  leaveType: LeaveType;
  allocated: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface LeaveStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  employeesOnLeaveToday: number;
  approvalRate: number; // percentage, e.g., 92.5
}

export interface LeaveFilters {
  search: string;
  department: string;
  leaveType: string;
  status: string;
  startDate: string;
  endDate: string;
}

export type LeaveSortKey = 'employeeName' | 'department' | 'leaveType' | 'days' | 'status' | 'startDate';
export type SortDirection = 'asc' | 'desc';
