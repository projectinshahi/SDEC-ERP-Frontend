'use client';

import { Search } from 'lucide-react';

interface CandidateFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  stage: string;
  setStage: (value: string) => void;
}

export function CandidateFilters({
  search,
  setSearch,
  stage,
  setStage,
}: CandidateFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search candidate..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Stage Filter */}
      <select
        value={stage}
        onChange={(e) => setStage(e.target.value)}
        className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <option value="All">All Stages</option>
        <option value="Applied">Applied</option>
        <option value="Screening">Screening</option>
        <option value="Interview">Interview</option>
        <option value="Offer">Offer</option>
        <option value="Hired">Hired</option>
        <option value="Rejected">Rejected</option>
      </select>
    </div>
  );
}