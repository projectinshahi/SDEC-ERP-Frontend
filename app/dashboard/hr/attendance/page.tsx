'use client';

import React from 'react';
import { AttendanceHeader }     from '@/components/hr/attendance/AttendanceHeader';
import { AttendanceStatsRow }   from '@/components/hr/attendance/AttendanceStats';
import { AttendanceFiltersBar } from '@/components/hr/attendance/AttendanceFilters';
import { AttendanceTable }      from '@/components/hr/attendance/AttendanceTable';
import { BreakTimeCard }        from '@/components/hr/attendance/BreakTimeCard';
import { useAttendance }        from '@/lib/hr/useAttendance';

export default function AttendancePage() {
  const {
    records, stats, selectedDate, setSelectedDate,
    selectedIds, activeDropdown, setActiveDropdown,
    sortKey, sortDir, currentPage, setCurrentPage,
    filters, handleFilterChange, handleSort,
    filtered, paginated, ITEMS_PER_PAGE,
    toggleSelectRow, toggleSelectAll, handleRemove, handleBulkRemove,
  } = useAttendance();

  return (
    <div className="space-y-7">
      <AttendanceHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      <AttendanceStatsRow stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
        {/* Main content column */}
        <div className="space-y-5 min-w-0">
          <AttendanceFiltersBar
            filters={filters}
            onChange={handleFilterChange}
            totalResults={records.length}
            filteredResults={filtered.length}
          />
          <AttendanceTable
            records={paginated}
            selectedIds={selectedIds}
            activeDropdownId={activeDropdown}
            sortKey={sortKey}
            sortDir={sortDir}
            currentPage={currentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            filteredTotal={filtered.length}
            onSelectAll={() => toggleSelectAll(paginated.map(r => r.id))}
            onSelectRow={toggleSelectRow}
            onDropdownToggle={id => setActiveDropdown(prev => prev === id ? null : id)}
            onDropdownClose={() => setActiveDropdown(null)}
            onView={() => {}}
            onEdit={() => {}}
            onNote={() => {}}
            onRemove={handleRemove}
            onSort={handleSort}
            onPageChange={setCurrentPage}
            onBulkRemove={handleBulkRemove}
          />
        </div>

        {/* Sidebar column */}
        <div className="space-y-5">
          <BreakTimeCard records={records} />
        </div>
      </div>
    </div>
  );
}
