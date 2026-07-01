'use client';

import React from 'react';
import { Candidate, CandidateStage } from '@/lib/hr/recruitment.types';
import { CandidateCard } from './CandidateCard';
import { Inbox } from 'lucide-react';

interface CandidateColumnProps {
  title: string;
  candidates: Candidate[];
  onView: (candidate: Candidate) => void;
  onEdit: (candidate: Candidate) => void;
  onDelete: (id: string) => void;
  onStageChange: (id: string, stage: CandidateStage) => void;
}

const BADGE_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  Applied: { dot: 'bg-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/50', text: 'text-slate-700 dark:text-slate-300' },
  Screening: { dot: 'bg-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/20', text: 'text-indigo-700 dark:text-indigo-300' },
  Interview: { dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300' },
  Offer: { dot: 'bg-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/20', text: 'text-sky-700 dark:text-sky-300' },
  Hired: { dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300' },
  Rejected: { dot: 'bg-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-700 dark:text-rose-300' },
};

export function CandidateColumn({
  title,
  candidates,
  onView,
  onEdit,
  onDelete,
  onStageChange,
}: CandidateColumnProps) {
  const color = BADGE_COLORS[title] || BADGE_COLORS.Applied;

  return (
    <div className="bg-slate-50/50 dark:bg-gray-800/10 rounded-2xl p-4.5 min-w-[310px] w-[310px] border border-gray-100/60 dark:border-gray-850/40 flex flex-col max-h-[80vh] shrink-0">
      
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 shrink-0 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${color.dot}`} />
          <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">{title}</h3>
        </div>
        <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${color.bg} ${color.text} border border-transparent`}>
          {candidates.length}
        </span>
      </div>

      {/* Cards container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1 scrollbar-thin">
        {candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-gray-200 dark:border-gray-850 rounded-xl bg-white/50 dark:bg-gray-900/10">
            <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-700 stroke-[1.5]" />
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-550 mt-2">No candidates</p>
          </div>
        ) : (
          candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onStageChange={onStageChange}
            />
          ))
        )}
      </div>

    </div>
  );
}