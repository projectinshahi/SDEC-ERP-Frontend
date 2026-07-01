'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { HR_DOCUMENT_TYPES } from '@/lib/hr/documents.types';

interface DocumentsFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  selectedType: string;
  setSelectedType: (val: string) => void;
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
}

export function DocumentsFilters({
  search,
  setSearch,
  selectedType,
  setSelectedType,
  selectedStatus,
  setSelectedStatus,
}: DocumentsFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4.5 bg-gray-50/50 dark:bg-gray-800/10 border border-gray-150 dark:border-gray-800 rounded-2xl">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee name, code, or designation..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 text-xs font-semibold text-gray-800 dark:text-gray-150 outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 transition"
          />
        </div>

        {/* Document Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 text-xs font-bold text-gray-750 dark:text-gray-250 outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 cursor-pointer transition"
        >
          <option value="All">All Document Types</option>
          {HR_DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Verification Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-855 text-xs font-bold text-gray-750 dark:text-gray-250 outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 cursor-pointer transition"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Verified">Verified</option>
          <option value="Rejected">Rejected</option>
          <option value="Expired">Expired</option>
        </select>
      </div>
    </div>
  );
}
