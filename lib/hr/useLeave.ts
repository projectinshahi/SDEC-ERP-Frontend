import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  LeaveRequest,
  LeaveFilters,
  LeaveSortKey,
  SortDirection,
  LeaveStatus,
  LeaveStats,
  LeaveType,
  HalfPeriod,
} from './leave.types';
import {
  fetchLeaves,
  fetchLeaveStats,
  createLeave,
  approveLeave,
  rejectLeave,
  deleteLeave,
  ApiLeaveRecord,
} from '@/lib/api/hr-leave';
import { fetchEmployees, ApiEmployee } from '@/lib/api/hr';

import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';

const ITEMS_PER_PAGE = 10;

function mapLeaveStatus(raw: string): LeaveStatus {
  switch (raw.toLowerCase()) {
    case 'pending': return 'Pending';
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'cancelled': return 'Cancelled';
    default: return 'Pending';
  }
}

function adaptLeaveRecord(r: ApiLeaveRecord): LeaveRequest {
  // Clean the category, then determine half-day from the STRUCTURED half_period
  // (new records) or the legacy " (Half Day)" suffix (old records). A legacy
  // half-day has no known session → halfPeriod stays null (do not guess).
  let leaveTypeClean = r.leave_type as LeaveType;
  let legacyHalf = false;
  if (r.leave_type && r.leave_type.includes('(Half Day)')) {
    leaveTypeClean = r.leave_type.replace(' (Half Day)', '').trim() as LeaveType;
    legacyHalf = true;
  }
  const halfPeriod: HalfPeriod | null = r.half_period ?? null;
  const isHalfDay = halfPeriod != null || legacyHalf;

  return {
    id: String(r.id),
    employeeId: r.employee_code ?? `EMP-${r.employee_id}`,
    employeeName: r.name ?? 'Unknown Employee',
    department: r.department ?? 'N/A',
    leaveType: leaveTypeClean,
    startDate: r.start_date ? r.start_date.split('T')[0] : '',
    endDate: r.end_date ? r.end_date.split('T')[0] : '',
    days: r.days ?? 0,
    reason: r.reason ?? 'No reason provided',
    status: mapLeaveStatus(r.status),
    halfPeriod,
    isHalfDay,
    appliedDate: r.created_at ? r.created_at.split('T')[0] : '',
    attachmentName: isHalfDay ? 'Half Day duration' : undefined,
  };
}

export function useLeave() {
  const [rawRequests, setRawRequests] = useState<ApiLeaveRecord[]>([]);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form saving states
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals / Drawer toggles
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  // UI state
  const [sortKey, setSortKey] = useState<LeaveSortKey>('startDate');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<LeaveFilters>({
    search: '',
    department: 'All',
    leaveType: 'All',
    status: 'All',
    startDate: '',
    endDate: '',
  });

  const { isLoading: authLoading, isAuthenticated, user } = useAuth();
  const { hasAnyPermission } = usePermissions();
  // Staff-only (self-service) = has "View Staff Leave" but NOT "View HR Admin
  // Leave". Drives whether the employee directory is fetched (admins need it).
  const isSelfService = useMemo(() => {
    return hasAnyPermission(['hr.leave.self']) && !hasAnyPermission(['hr.leave.view']);
  }, [hasAnyPermission]);

  const loadLeaveData = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    try {
      setIsLoading(true);
      setError(null);
      const [leaves, emps] = await Promise.all([
        fetchLeaves(),
        isSelfService ? Promise.resolve([]) : fetchEmployees(),
      ]);
      setRawRequests(leaves);
      setEmployees(emps);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load leave records');
    } finally {
      setIsLoading(false);
    }
  }, [isSelfService, authLoading, isAuthenticated]);

  useEffect(() => {
    loadLeaveData();
  }, [loadLeaveData]);

  const requests = useMemo(() => rawRequests.map(adaptLeaveRecord), [rawRequests]);

  // Compute stats on-the-fly
  const stats: LeaveStats = useMemo(() => {
    const totalRequests = requests.length;
    const pendingRequests = requests.filter((r) => r.status === 'Pending').length;
    const approvedRequests = requests.filter((r) => r.status === 'Approved').length;
    const rejectedRequests = requests.filter((r) => r.status === 'Rejected').length;
    
    // Employees on leave today (today falls inside startDate & endDate, and status is Approved)
    const todayStr = new Date().toISOString().split('T')[0];
    const employeesOnLeaveToday = requests.filter((r) => {
      if (r.status !== 'Approved') return false;
      return r.startDate <= todayStr && todayStr <= r.endDate;
    }).length;

    const totalResolved = approvedRequests + rejectedRequests;
    const approvalRate = totalResolved > 0 ? Math.round((approvedRequests / totalResolved) * 100) : 0;

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      employeesOnLeaveToday,
      approvalRate,
    };
  }, [requests]);

  const { toast } = useToast();

  const handleApplyLeaveSubmit = async (data: {
    employeeId: number;
    leaveType: string;
    startDate: string;
    endDate: string;
    halfDay: boolean;
    halfPeriod?: HalfPeriod | null;
    reason: string;
  }) => {
    setIsSaving(true);
    setSaveError(null);
    // NEW model: keep leave_type as the clean category and carry the half-day
    // session in the structured half_period field (no more " (Half Day)" suffix).
    const payload = {
      employee_id: data.employeeId,
      leave_type: data.leaveType,
      start_date: data.startDate,
      end_date: data.endDate,
      reason: data.reason,
      half_period: data.halfDay ? (data.halfPeriod ?? null) : null,
    };

    try {
      await createLeave(payload);
      setSuccessMsg('Leave request submitted successfully');
      toast('Leave request submitted successfully', 'success');
      await loadLeaveData();
      setIsApplyModalOpen(false);
    } catch (err: any) {
      console.error(err);
      const status = err?.response?.status;
      let errMsg = err?.response?.data?.message || err?.message || 'Failed to submit leave request';
      if (status === 403) {
        errMsg = "You don't have permission to submit leave request";
      } else if (status === 500) {
        errMsg = "Server error. Please try again";
      }
      setSaveError(errMsg);
      toast(errMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveLeave = async (id: string) => {
    try {
      setError(null);
      await approveLeave(Number(id));
      await loadLeaveData();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to approve leave request');
    }
  };

  const handleRejectLeave = async (id: string) => {
    try {
      setError(null);
      await rejectLeave(Number(id));
      await loadLeaveData();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to reject leave request');
    }
  };

  // Delete (Approved/Rejected) or Cancel (own Pending) a leave request.
  // Optimistically drops it from the list (stats are derived, so they recompute
  // instantly), then reconciles with the server; reverts the list on failure.
  const handleDeleteLeave = async (id: string) => {
    const previous = rawRequests;
    setRawRequests((prev) => prev.filter((r) => String(r.id) !== id));
    try {
      setError(null);
      await deleteLeave(Number(id));
      toast('Leave request deleted', 'success');
      await loadLeaveData();
    } catch (err: any) {
      setRawRequests(previous);
      const status = err?.response?.status;
      let msg = err?.response?.data?.message || err?.message || 'Failed to delete leave request';
      if (status === 403) msg = "You don't have permission to delete this leave request";
      setError(msg);
      toast(msg, 'error');
    }
  };

  const handleFilterChange = (next: Partial<LeaveFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setCurrentPage(1);
  };

  const handleSort = (key: LeaveSortKey) => {
    setSortDir((prev) => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'));
    setSortKey(key);
  };

  const filtered = useMemo(() => {
    return requests
      .filter((r) => {
        const q = filters.search.toLowerCase();
        const matchesSearch =
          !q ||
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeId.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q);

        const matchesDept = filters.department === 'All' || r.department === filters.department;
        const matchesType = filters.leaveType === 'All' || r.leaveType === filters.leaveType;
        const matchesStatus = filters.status === 'All' || r.status === filters.status;

        // Date range filters
        const matchesStartDate = !filters.startDate || r.startDate >= filters.startDate;
        const matchesEndDate = !filters.endDate || r.endDate <= filters.endDate;

        return matchesSearch && matchesDept && matchesType && matchesStatus && matchesStartDate && matchesEndDate;
      })
      .sort((a, b) => {
        let va = (a[sortKey] ?? '') as string | number;
        let vb = (b[sortKey] ?? '') as string | number;

        if (typeof va === 'string' && typeof vb === 'string') {
          return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        }
        return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
      });
  }, [requests, filters, sortKey, sortDir]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  return {
    requests,
    rawRequests,
    employees,
    stats,
    isLoading,
    error,
    isSaving,
    saveError,
    successMsg,
    isApplyModalOpen,
    setIsApplyModalOpen,
    selectedRequest,
    setSelectedRequest,
    sortKey,
    sortDir,
    currentPage,
    setCurrentPage,
    filters,
    handleFilterChange,
    handleSort,
    filtered,
    paginated,
    totalPages,
    ITEMS_PER_PAGE,
    handleApplyLeaveSubmit,
    handleApproveLeave,
    handleRejectLeave,
    handleDeleteLeave,
    refresh: loadLeaveData,
  };
}
