'use client';

import { Candidate } from '@/lib/hr/recruitment.types';
import { Card } from '@/components/Card';

export function CandidateCard({ candidate }: { candidate: Candidate }) {
  return (
    <Card className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
            {candidate.name}
          </h4>

          <p className="text-xs text-gray-500 mt-1">
            {candidate.role}
          </p>
        </div>

        <span className="text-xs font-bold text-blue-600">
          {candidate.matchScore}%
        </span>
      </div>

      <p className="text-xs mt-3 text-gray-600">
        {candidate.experience}
      </p>

      <div className="flex gap-2 mt-3 flex-wrap">
        {candidate.skills.map(skill => (
          <span
            key={skill}
            className="px-2 py-1 rounded-full bg-gray-100 text-xs"
          >
            {skill}
          </span>
        ))}
      </div>
    </Card>
  );
}