'use client';

import React, { useState } from 'react';
import { Search, Download, ChevronDown, FileText, TableProperties, Sheet } from 'lucide-react';

interface PayrollFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  selectedMonth: string;
  setSelectedMonth: (val: string) => void;
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
  availableMonths: string[];
  onExportCsv: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export function PayrollFilters({
  search,
  setSearch,
  selectedMonth,
  setSelectedMonth,
  selectedStatus,
  setSelectedStatus,
  availableMonths,
  onExportCsv,
  onExportExcel,
  onExportPdf,
}: PayrollFiltersProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4.5 bg-gray-50/50 dark:bg-gray-800/10 border border-gray-150 dark:border-gray-800 rounded-2xl">
      
      {/* Filters Left Side */}
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee name or code..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 text-xs font-semibold text-gray-800 dark:text-gray-150 outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition"
          />
        </div>

        {/* Month Filter */}
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 text-xs font-bold text-gray-750 dark:text-gray-200 outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 cursor-pointer transition"
        >
          <option value="All">All Months</option>
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 text-xs font-bold text-gray-750 dark:text-gray-200 outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 cursor-pointer transition"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
        </select>
      </div>

      {/* Export Actions Menu Right Side */}
      <div className="relative shrink-0">
        <button
          onClick={() => setIsExportOpen(!isExportOpen)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-850 dark:hover:bg-gray-800 text-xs font-bold text-gray-750 dark:text-gray-200 transition"
        >
          <Download size={14} />
          <span>Export Reports</span>
          <ChevronDown size={12} className={`transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`} />
        </button>

        {isExportOpen && (
          <>
            {/* Backdrop cover click handler */}
            <div className="fixed inset-0 z-10" onClick={() => setIsExportOpen(false)} />
            <div className="absolute right-0 mt-2 z-20 w-44 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-xl shadow-lg p-1.5 space-y-1">
              {/* Excel */}
              <button
                onClick={() => {
                  onExportExcel();
                  setIsExportOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <Sheet size={13.5} className="text-emerald-600 dark:text-emerald-400" />
                <span>Export Excel</span>
              </button>

              {/* PDF */}
              <button
                onClick={() => {
                  onExportPdf();
                  setIsExportOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <FileText size={13.5} className="text-rose-600 dark:text-rose-400" />
                <span>Export PDF</span>
              </button>

              {/* CSV */}
              <button
                onClick={() => {
                  onExportCsv();
                  setIsExportOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <TableProperties size={13.5} className="text-blue-600 dark:text-blue-400" />
                <span>Export CSV</span>
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
