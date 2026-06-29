'use client';

import React from 'react';
import { useRecruitment } from '@/lib/hr/useRecruitment';
import { CandidateColumn } from './CandidateColumn';
import { CandidateFilters } from './CandidateFilters';
import { CandidateEntryModal } from './CandidateEntryModal';
import { CandidateDetailModal } from './CandidateDetailModal';
import { UserPlus, Inbox } from 'lucide-react';
import { CandidateStage } from '@/lib/hr/recruitment.types';

const STAGES: CandidateStage[] = [
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Hired',
  'Rejected',
];

interface CandidatePipelineProps {
  state: ReturnType<typeof useRecruitment>;
}

export function CandidatePipeline({ state }: CandidatePipelineProps) {
  const {
    filteredCandidates,
    search,
    setSearch,
    selectedStage,
    setSelectedStage,
    isModalOpen,
    activeCandidate,
    isDetailOpen,
    detailCandidate,
    handleStageChange,
    handleSaveCandidate,
    handleDeleteCandidate,
    handleOpenAdd,
    handleOpenEdit,
    handleCloseModal,
    handleOpenDetail,
    handleCloseDetail,
  } = state;

  return (
    <div className="space-y-5">
      {/* Header Panel with Title & Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-sm font-bold text-gray-850 dark:text-gray-200">Hiring Pipeline</h2>
          <p className="text-[11px] text-gray-400 dark:text-gray-550 font-medium">Manage and transition candidate stages</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:bg-violet-850 text-white text-xs font-bold transition shadow-sm shadow-violet-500/20"
        >
          <UserPlus size={15} />
          <span>Add Candidate</span>
        </button>
      </div>

      <CandidateFilters
        search={search}
        setSearch={setSearch}
        stage={selectedStage}
        setStage={setSelectedStage}
      />

      {filteredCandidates.length === 0 && search ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900/10">
          <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-700 stroke-[1.5]" />
          <h3 className="text-sm font-bold text-gray-805 dark:text-gray-200 mt-3">No matching candidates</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try relaxing your search keywords or filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin pb-4">
          <div className="flex gap-4.5 min-w-max pb-2">
            {STAGES.map((stage) => (
              <CandidateColumn
                key={stage}
                title={stage}
                candidates={filteredCandidates.filter(
                  (candidate) => candidate.stage === stage
                )}
                onView={handleOpenDetail}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteCandidate}
                onStageChange={handleStageChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Entry / Edit Modal Form */}
      <CandidateEntryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        candidate={activeCandidate}
        onSave={handleSaveCandidate}
      />

      {/* Details View Modal */}
      <CandidateDetailModal
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        candidate={detailCandidate}
      />
    </div>
  );
}