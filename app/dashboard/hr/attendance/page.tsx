'use client';

import React, { useState } from 'react';
import { Loader2, X, CalendarDays, BarChart3 } from 'lucide-react';
import { AttendanceHeader } from '@/components/hr/attendance/AttendanceHeader';
import { AttendanceStatsRow } from '@/components/hr/attendance/AttendanceStats';
import { AttendanceFiltersBar } from '@/components/hr/attendance/AttendanceFilters';
import { AttendanceTable } from '@/components/hr/attendance/AttendanceTable';
import { BreakTimeCard } from '@/components/hr/attendance/BreakTimeCard';
import { AttendanceEntryModal } from '@/components/hr/attendance/AttendanceEntryModal';
import { AttendanceAnalyticsTab } from '@/components/hr/attendance/analytics/AttendanceAnalyticsTab';
import { AttendanceRecord } from '@/lib/hr/attendance.types';
import { useAttendance } from '@/lib/hr/useAttendance';

type AttendanceTab = 'daily' | 'analytics';

const tabButtonClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition ${
    active
      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
  }`;

export default function AttendancePage() {
  const {
    records, rawRecords, stats, employees,
    isLoading, error,
    isSaving, saveError, successMsg, handleFormSave,
    selectedDate, setSelectedDate,
    selectedIds,
    sortKey, sortDir, currentPage, setCurrentPage,
    filters, handleFilterChange, handleSort,
    filtered, paginated, ITEMS_PER_PAGE,
    toggleSelectRow, toggleSelectAll, handleRemove, handleBulkRemove,
    /* modal */
    isEntryModalOpen, editRecord, entryPreset, openEntryModal, openEditModal, closeEntryModal,
    refresh,
  } = useAttendance();

  const [tab, setTab] = useState<AttendanceTab>('daily');

  /* ── Edit handler — real rows open the record for editing; a virtual (no record yet)
     row opens a NEW entry preset to that employee + selected date, so the form applies
     the configured defaults exactly like the header "Attendance Entry" button. (It used
     to pass a dummy all-null record, which the form treated as an edit → empty fields.) */
  const handleEdit = (record: AttendanceRecord) => {
    if (record.id.startsWith('virtual-')) {
      const empId = Number(record.id.replace('virtual-', ''));
      if (employees.some(e => e.id === empId)) openEntryModal({ employeeId: empId, date: selectedDate });
      return;
    }

    const raw = rawRecords.find(r => String(r.id) === record.id) ?? null;
    if (raw) {
      openEditModal(raw);
    } else {
      openEntryModal();
    }
  };

  /* ── CSV Export handler for selectedDate ────────────────────────────────── */
  const handleExport = () => {
    if (records.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = [
      'Employee Code',
      'Name',
      'Department',
      'Designation',
      'Date',
      'Morning In',
      'Lunch Out',
      'Lunch In',
      'Check Out',
      'Total Hours',
      'Status',
      'HR Note'
    ];

    const csvRows = [
      headers.join(','),
      ...records.map(r => [
        `"${r.employeeId.replace(/"/g, '""')}"`,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.department.replace(/"/g, '""')}"`,
        `"${r.role.replace(/"/g, '""')}"`,
        `"${r.date}"`,
        `"${(r.morningIn || '').replace(/"/g, '""')}"`,
        `"${(r.lunchOut || '').replace(/"/g, '""')}"`,
        `"${(r.lunchIn || '').replace(/"/g, '""')}"`,
        `"${(r.checkOut || '').replace(/"/g, '""')}"`,
        `"${(r.totalHours || '').replace(/"/g, '""')}"`,
        `"${r.status}"`,
        `"${(r.note || '').replace(/"/g, '""')}"`
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_export_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ── Daily tab body — keeps the original loading / error gates & layout unchanged ─ */
  let dailyBody: React.ReactNode;
  if (isLoading) {
    dailyBody = (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  } else if (error) {
    dailyBody = (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 mb-4">
          <X size={22} />
        </div>
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Failed to load attendance</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">{error}</p>
        <button
          onClick={refresh}
          className="mt-4 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition"
        >
          Retry
        </button>
      </div>
    );
  } else {
    dailyBody = (
      <div className="space-y-7">
        {/* Header — full width, contains "Attendance Entry" button */}
        <AttendanceHeader
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onOpenEntry={() => openEntryModal()}
          onExport={handleExport}
        />

        <AttendanceStatsRow stats={stats} />

        {/* Full-width content — no sidebar grid */}
        <div className="space-y-5">
          <AttendanceFiltersBar
            filters={filters}
            onChange={handleFilterChange}
            totalResults={records.length}
            filteredResults={filtered.length}
          />

          <AttendanceTable
            records={paginated}
            selectedIds={selectedIds}
            sortKey={sortKey}
            sortDir={sortDir}
            currentPage={currentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            filteredTotal={filtered.length}
            onSelectAll={() => toggleSelectAll(paginated.map(r => r.id))}
            onSelectRow={toggleSelectRow}
            onEdit={handleEdit}
            onRemove={handleRemove}
            onSort={handleSort}
            onPageChange={setCurrentPage}
            onBulkRemove={handleBulkRemove}
          />

          <BreakTimeCard records={records} />
        </div>

        {/* Modal — rendered at page root level, outside the table */}
        <AttendanceEntryModal
          isOpen={isEntryModalOpen}
          onClose={closeEntryModal}
          employees={employees}
          allRecords={rawRecords}
          editRecord={editRecord}
          preset={entryPreset}
          isSaving={isSaving}
          saveError={saveError}
          successMsg={successMsg}
          onSave={handleFormSave}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex w-fit items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800/60">
        <button className={tabButtonClass(tab === 'daily')} onClick={() => setTab('daily')}>
          <CalendarDays size={15} /> Daily Attendance
        </button>
        <button className={tabButtonClass(tab === 'analytics')} onClick={() => setTab('analytics')}>
          <BarChart3 size={15} /> Analytics
        </button>
      </div>

      {tab === 'daily' ? dailyBody : <AttendanceAnalyticsTab employees={employees} />}
    </div>
  );
}
