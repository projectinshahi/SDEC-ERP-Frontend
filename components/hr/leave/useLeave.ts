'use client';

import { useState, useMemo } from 'react';
import { LeaveRequest, LeaveFilters, LeaveSortKey, SortDirection, LeaveBalance } from '@/lib/hr/leave.types';
import { MOCK_LEAVE_RECORDS, getEmployeeBalances, computeLeaveStats, TODAY, MOCK_EMPLOYEES } from '@/lib/hr/leave.mock';

const ITEMS_PER_PAGE = 8;

export function useLeave() {
  // Toggle between 'admin' (HR Admin) and 'staff' (Staff Employee View)
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('admin');
  
  // Active staff employee for the Staff View
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('EMP-2026-003'); // Dimah Al-Sabah
  
  
  const [records, setRecords] = useState<LeaveRequest[]>(MOCK_LEAVE_RECORDS);
  const [filters, setFilters] = useState<LeaveFilters>({
    search: '',
    department: 'All',
    leaveType: 'All',
    status: 'All',
    startDate: '',
    endDate: '',
  });
  
  const [sortKey, setSortKey] = useState<LeaveSortKey>('startDate');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  // Active staff details
  const activeEmployee = useMemo(() => {
    return MOCK_EMPLOYEES.find(e => e.id === selectedEmployeeId) || MOCK_EMPLOYEES[2];
  }, [selectedEmployeeId]);

  // Active staff leave balances
  const balances = useMemo<LeaveBalance[]>(() => {
    return getEmployeeBalances(selectedEmployeeId);
  }, [selectedEmployeeId]);

  const handleFilterChange = (next: Partial<LeaveFilters>) => {
    setFilters(prev => ({ ...prev, ...next }));
    setCurrentPage(1);
  };

  const handleSort = (key: LeaveSortKey) => {
    setSortDir(prev => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'));
    setSortKey(key);
  };

  const handleApprove = (id: string) => {
    setRecords(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              status: 'Approved',
              approvedBy: 'Hiba Fathima (HR Admin)',
              approvedDate: TODAY,
            }
          : r
      )
    );
    // Update local balances if necessary or show notification
  };

  const handleReject = (id: string, reason: string) => {
    setRecords(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              status: 'Rejected',
              approvedBy: 'Hiba Fathima (HR Admin)',
              approvedDate: TODAY,
              rejectReason: reason,
            }
          : r
      )
    );
  };

  const handleCancel = (id: string) => {
    setRecords(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              status: 'Cancelled',
            }
          : r
      )
    );
  };

  const handleApplyLeave = (data: { leaveType: string; startDate: string; endDate: string; reason: string; attachmentName?: string }) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newRequest: LeaveRequest = {
      id: `LV-2026-${String(records.length + 1).padStart(3, '0')}`,
      employeeId: userRole === 'staff' ? activeEmployee.id : 'EMP-2026-006', // Hiba Fathima if admin applying
      employeeName: userRole === 'staff' ? activeEmployee.name : 'Hiba Fathima',
      department: userRole === 'staff' ? activeEmployee.department : 'HR',
      leaveType: data.leaveType as any,
      startDate: data.startDate,
      endDate: data.endDate,
      days,
      reason: data.reason,
      status: 'Pending',
      appliedDate: TODAY,
      attachmentName: data.attachmentName,
    };

    setRecords(prev => [newRequest, ...prev]);
    setIsApplyModalOpen(false);
  };

  const toggleRole = () => {
    setUserRole(prev => (prev === 'admin' ? 'staff' : 'admin'));
    setCurrentPage(1);
    // Clear filters when role switches
    setFilters({
      search: '',
      department: 'All',
      leaveType: 'All',
      status: 'All',
      startDate: '',
      endDate: '',
    });
  };

  // Filter & Sort requests based on active user role and filter states
  const filteredRecords = useMemo(() => {
    return records
      .filter(r => {
        // In staff view, only see own leaves
        if (userRole === 'staff' && r.employeeId !== selectedEmployeeId) {
          return false;
        }

        // Apply filters
        const matchesSearch =
          !filters.search ||
          r.employeeName.toLowerCase().includes(filters.search.toLowerCase()) ||
          r.employeeId.toLowerCase().includes(filters.search.toLowerCase()) ||
          r.reason.toLowerCase().includes(filters.search.toLowerCase());

        const matchesDept = filters.department === 'All' || r.department === filters.department;
        const matchesType = filters.leaveType === 'All' || r.leaveType === filters.leaveType;
        const matchesStatus = filters.status === 'All' || r.status === filters.status;

        let matchesDate = true;
        if (filters.startDate) {
          matchesDate = matchesDate && r.startDate >= filters.startDate;
        }
        if (filters.endDate) {
          matchesDate = matchesDate && r.endDate <= filters.endDate;
        }

        return matchesSearch && matchesDept && matchesType && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        let va = a[sortKey] || '';
        let vb = b[sortKey] || '';

        if (typeof va === 'string' && typeof vb === 'string') {
          return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        }
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortDir === 'asc' ? va - vb : vb - va;
        }
        return 0;
      });
  }, [records, userRole, selectedEmployeeId, filters, sortKey, sortDir]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE) || 1;

  // Dynamic statistics
  const stats = useMemo(() => computeLeaveStats(records, TODAY), [records]);

  // Urgent requests for HR
  const urgentRequests = useMemo(() => {
    return records.filter(r => r.status === 'Pending' && (r.isUrgent || r.leaveType === 'Emergency Leave'));
  }, [records]);

  // Overlapping requests (simplified: any other approved request on overlapping dates)
  const overlappingRequests = useMemo(() => {
    // Just find active requests during similar dates for overlap detection
    const approved = records.filter(r => r.status === 'Approved');
    const overlaps: Record<string, string[]> = {};
    
    records.filter(r => r.status === 'Pending').forEach(pending => {
      const pStart = new Date(pending.startDate);
      const pEnd = new Date(pending.endDate);
      
      const names = approved
        .filter(app => {
          if (app.employeeId === pending.employeeId) return false;
          const aStart = new Date(app.startDate);
          const aEnd = new Date(app.endDate);
          return pStart <= aEnd && aStart <= pEnd;
        })
        .map(app => app.employeeName);
        
      if (names.length > 0) {
        overlaps[pending.id] = Array.from(new Set(names));
      }
    });
    return overlaps;
  }, [records]);

  // Currently on leave (approved and within today's range)
  const currentlyOnLeave = useMemo(() => {
    return records.filter(r => {
      if (r.status !== 'Approved') return false;
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      const current = new Date(TODAY);
      return current >= start && current <= end;
    });
  }, [records]);

  return {
    userRole,
    setUserRole,
    toggleRole,
    selectedEmployeeId,
    setSelectedEmployeeId,
    activeEmployee,
    balances,
    records,
    filters,
    handleFilterChange,
    sortKey,
    sortDir,
    handleSort,
    currentPage,
    setCurrentPage,
    totalPages,
    filteredRecords,
    paginatedRecords,
    stats,
    urgentRequests,
    overlappingRequests,
    currentlyOnLeave,
    isApplyModalOpen,
    setIsApplyModalOpen,
    selectedRequest,
    setSelectedRequest,
    handleApprove,
    handleReject,
    handleCancel,
    handleApplyLeave,
    MOCK_EMPLOYEES,
  };
}
