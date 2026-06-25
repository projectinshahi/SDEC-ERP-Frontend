'use client';

import { useLeave } from '@/components/hr/leave/useLeave';
import { LeaveHeader } from '@/components/hr/leave/LeaveHeader';
import { LeaveStats } from '@/components/hr/leave/LeaveStats';
import { LeaveBalanceCard } from '@/components/hr/leave/LeaveBalanceCard';
import { LeaveFilters } from '@/components/hr/leave/LeaveFilters';
import { LeaveRequestTable } from '@/components/hr/leave/LeaveRequestTable';
import { LeaveApprovalPanel } from '@/components/hr/leave/LeaveApprovalPanel';
import { ApplyLeaveModal } from '@/components/hr/leave/ApplyLeaveModal';
import { LeaveDetailsModal } from '@/components/hr/leave/LeaveDetailsModal';

export default function LeavePage() {
  const {
    userRole, toggleRole, selectedEmployeeId, setSelectedEmployeeId, activeEmployee, balances,
    filters, handleFilterChange, sortKey, sortDir, handleSort, currentPage, setCurrentPage,
    totalPages, paginatedRecords, filteredRecords, stats, urgentRequests, overlappingRequests,
    currentlyOnLeave, isApplyModalOpen, setIsApplyModalOpen, selectedRequest, setSelectedRequest,
    handleApprove, handleReject, handleCancel, handleApplyLeave,
  } = useLeave();

  return (
    <div className="space-y-6">
      <LeaveHeader
        userRole={userRole}
        selectedEmployeeId={selectedEmployeeId}
        onRoleToggle={toggleRole}
        onEmployeeChange={setSelectedEmployeeId}
        onApplyLeaveClick={() => setIsApplyModalOpen(true)}
        onExportClick={() => alert('Exporting all leave requests as CSV... (Mock)')}
      />
      <LeaveStats stats={stats} userRole={userRole} />
      {userRole === 'staff' && (
        <LeaveBalanceCard balances={balances} employeeName={activeEmployee.name} />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <LeaveFilters filters={filters} onChange={handleFilterChange} userRole={userRole} />
          <LeaveRequestTable
            requests={paginatedRecords}
            allFilteredRequestsCount={filteredRecords.length}
            userRole={userRole}
            sortKey={sortKey}
            sortDir={sortDir}
            currentPage={currentPage}
            totalPages={totalPages}
            onSort={handleSort}
            onPageChange={setCurrentPage}
            onApprove={handleApprove}
            onReject={(id) => {
              const reason = prompt('Please enter reason for rejection:') || 'Rejected by policy';
              handleReject(id, reason);
            }}
            onCancel={handleCancel}
            onViewDetails={setSelectedRequest}
            itemsPerPage={8}
          />
        </div>
        <div className="lg:col-span-4">
          <LeaveApprovalPanel
            urgentRequests={urgentRequests}
            overlappingRequests={overlappingRequests}
            currentlyOnLeave={currentlyOnLeave}
            onApprove={handleApprove}
            onReject={(id) => {
              const reason = prompt('Please enter reason for rejection:') || 'Rejected by policy';
              handleReject(id, reason);
            }}
            userRole={userRole}
          />
        </div>
      </div>
      <ApplyLeaveModal isOpen={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} onSubmit={handleApplyLeave} />
      <LeaveDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
    </div>
  );
}
