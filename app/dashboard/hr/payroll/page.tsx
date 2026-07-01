'use client';

import React from 'react';
import { Loader2, AlertCircle, Wallet, Plus } from 'lucide-react';
import { usePayroll } from '@/lib/hr/usePayroll';
import { PayrollTable } from '@/components/hr/payroll/PayrollTable';
import { PayrollStats } from '@/components/hr/payroll/PayrollStats';
import { PayrollFilters } from '@/components/hr/payroll/PayrollFilters';
import { GeneratePayrollModal } from '@/components/hr/payroll/GeneratePayrollModal';
import { PayslipPreviewModal } from '@/components/hr/payroll/PayslipPreviewModal';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/hr/payrollHelper';

export default function PayrollPage() {
  const state = usePayroll();

  return (
    <PermissionPageGuard require="hr.view">
      <div className="space-y-6">
        
        {/* Page Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap pb-2 border-b border-gray-150 dark:border-gray-850">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300 mb-3 border border-blue-100 dark:border-blue-900/30">
              <Wallet size={12} />
              Payroll Management
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-905 dark:text-white">
              Employee Payroll
            </h1>
            <p className="text-sm text-gray-500 mt-1.5">
              Manage salary generation, deductions, and payment records.
            </p>
          </div>

          <button
            onClick={state.handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-850 text-white text-xs font-bold transition shadow-sm shadow-blue-500/20"
          >
            <Plus size={15} />
            <span>Generate Payroll</span>
          </button>
        </div>

        {/* Analytics Widgets */}
        {!state.isLoading && !state.error && (
          <PayrollStats stats={state.stats} />
        )}

        {/* Filters */}
        {!state.isLoading && !state.error && (
          <PayrollFilters
            search={state.search}
            setSearch={state.setSearch}
            selectedMonth={state.filterMonth}
            setSelectedMonth={state.setFilterMonth}
            selectedStatus={state.filterStatus}
            setSelectedStatus={state.setFilterStatus}
            availableMonths={state.availableMonths}
            onExportCsv={() => exportToCsv(state.filteredRecords)}
            onExportExcel={() => exportToExcel(state.filteredRecords)}
            onExportPdf={() => exportToPdf(state.filteredRecords)}
          />
        )}

        {/* Loader Screen */}
        {state.isLoading ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
            <span className="text-xs font-semibold text-gray-500">Loading payroll entries…</span>
          </div>
        ) : state.error ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 mb-4">
              <AlertCircle size={22} />
            </div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Failed to load payroll</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">{state.error}</p>
            <button
              onClick={state.refresh}
              className="mt-4 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-sm"
            >
              Retry
            </button>
          </div>
        ) : (
          /* Core Data Table */
          <PayrollTable
            records={state.filteredRecords}
            onEdit={state.handleOpenEdit}
            onDelete={state.handleDeletePayroll}
            onMarkPaid={(id) => state.handleChangeStatus(id, 'Paid')}
            onViewPayslip={state.handleOpenPayslip}
          />
        )}

        {/* Form Generation Modal */}
        <GeneratePayrollModal
          isOpen={state.isModalOpen}
          onClose={state.handleCloseModal}
          employees={state.employees}
          activeRecord={state.activeRecord}
          onSave={state.handleSavePayroll}
        />

        {/* Payslip View Modal */}
        <PayslipPreviewModal
          isOpen={state.isPayslipOpen}
          onClose={state.handleClosePayslip}
          record={state.selectedPayslip}
        />

      </div>
    </PermissionPageGuard>
  );
}
