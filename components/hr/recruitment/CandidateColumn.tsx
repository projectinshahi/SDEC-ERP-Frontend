'use client';

import { Candidate } from '@/lib/hr/recruitment.types';
import { CandidateCard } from './CandidateCard';

export function CandidateColumn({
  title,
  candidates,
}: {
  title: string;
  candidates: Candidate[];
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/30 rounded-2xl p-4 min-w-[280px]">
      <div className="flex justify-between mb-4">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-xs text-gray-500">
          {candidates.length}
        </span>
      </div>

      <div className="space-y-3">
        {candidates.map(candidate => (
          <CandidateCard key={candidate.id} candidate={candidate} />
        ))}
      </div>
    </div>
  );
}