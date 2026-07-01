'use client';

import { useState, useMemo } from 'react';
import { LeaveHeader } from '@/components/hr/leave/LeaveHeader';
import { LeaveStats } from '@/components/hr/leave/LeaveStats';
import { LeaveFilters } from '@/components/hr/leave/LeaveFilters';
import { LeaveRequestTable } from '@/components/hr/leave/LeaveRequestTable';
import { ApplyLeaveModal } from '@/components/hr/leave/ApplyLeaveModal';
import { LeaveDetailsModal } from '@/components/hr/leave/LeaveDetailsModal';
import { useLeave } from '@/lib/hr/useLeave';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function HRLeavePage() {
  const { user } = useAuth();
  const { hasAnyPermission } = usePermissions();
  
  const isSelfService = useMemo(() => {
    return hasAnyPermission(['hr.leave.self']) && !hasAnyPermission(['hr.view', 'hr.dashboard.view']);
  }, [hasAnyPermission]);

  const [userRoleState, setUserRoleState] = useState<'admin' | 'staff'>('admin');
  const userRole = isSelfService ? 'staff' : userRoleState;
  const [selectedStaffEmployeeId, setSelectedStaffEmployeeId] = useState('');

  const {
    requests,
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
  } = useLeave();

  const handleRoleToggle = () => {
    setUserRoleState((prev) => (prev === 'admin' ? 'staff' : 'admin'));
  };

  const currentEmployee = useMemo(() => {
    return employees.find((e) => e.email?.toLowerCase() === user?.email?.toLowerCase());
  }, [employees, user]);

  const currentEmployeeId = currentEmployee?.id;

  // Filter requests based on selected employee if in staff view mode
  const displayedRequests = userRole === 'staff'
    ? paginated.filter((r) => r.employeeId === selectedStaffEmployeeId || selectedStaffEmployeeId === '')
    : paginated;

  const displayedCount = userRole === 'staff'
    ? filtered.filter((r) => r.employeeId === selectedStaffEmployeeId || selectedStaffEmployeeId === '').length
    : filtered.length;

  const handleExport = () => {
    // Basic csv mock download
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Employee,Department,Leave Type,Start Date,End Date,Days,Status,Reason"]
        .concat(requests.map(r => `"${r.employeeName}","${r.department}","${r.leaveType}","${r.startDate}","${r.endDate}",${r.days},"${r.status}","${r.reason.replace(/"/g, '""')}"`))
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leave_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <LeaveHeader
        userRole={userRole}
        selectedEmployeeId={selectedStaffEmployeeId}
        onRoleToggle={handleRoleToggle}
        onEmployeeChange={setSelectedStaffEmployeeId}
        onApplyLeaveClick={() => setIsApplyModalOpen(true)}
        onExportClick={handleExport}
        employees={employees}
        isSelfService={isSelfService}
      />

      {/* Error state alert */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-450 text-sm font-semibold p-4 rounded-2xl flex items-center justify-between">
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <LeaveStats stats={stats} userRole={userRole} />

      {/* Filters */}
      <LeaveFilters
        filters={filters}
        onChange={handleFilterChange}
        userRole={userRole}
      />

      {/* Table List Card */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 p-12 text-center text-sm font-semibold text-gray-500 rounded-2xl animate-pulse">
          Loading leave requests...
        </div>
      ) : (
        <LeaveRequestTable
          requests={displayedRequests}
          allFilteredRequestsCount={displayedCount}
          userRole={userRole}
          sortKey={sortKey}
          sortDir={sortDir}
          currentPage={currentPage}
          totalPages={totalPages}
          onSort={handleSort}
          onPageChange={setCurrentPage}
          onApprove={handleApproveLeave}
          onReject={handleRejectLeave}
          onCancel={() => {}}
          onViewDetails={setSelectedRequest}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      )}

      {/* Request Leave Modal */}
      <ApplyLeaveModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        employees={employees}
        isSelfService={isSelfService}
        currentEmployeeId={currentEmployeeId}
        isSaving={isSaving}
        onSubmit={handleApplyLeaveSubmit}
      />

      {/* Leave Details Modal */}
      <LeaveDetailsModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  );
}
