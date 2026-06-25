'use client';

import { useMemo, useState } from 'react';
import { CANDIDATES } from '@/lib/hr/recruitment.mock';
import { CandidateColumn } from './CandidateColumn';
import { CandidateFilters } from './CandidateFilters';

const stages = [
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Hired',
  'Rejected',
];

export function CandidatePipeline() {
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('All');

  const filteredCandidates = useMemo(() => {
    return CANDIDATES.filter((candidate) => {
      const matchesSearch =
        candidate.name.toLowerCase().includes(search.toLowerCase()) ||
        candidate.role.toLowerCase().includes(search.toLowerCase());

      const matchesStage =
        selectedStage === 'All' ||
        candidate.stage === selectedStage;

      return matchesSearch && matchesStage;
    });
  }, [search, selectedStage]);

  return (
    <div className="space-y-5">
      <CandidateFilters
        search={search}
        setSearch={setSearch}
        stage={selectedStage}
        setStage={setSelectedStage}
      />

      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-4 min-w-max pb-2">
          {stages.map((stage) => (
            <CandidateColumn
              key={stage}
              title={stage}
              candidates={filteredCandidates.filter(
                (candidate) => candidate.stage === stage
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}