'use client';

import { CandidatePipeline } from '@/components/hr/recruitment/CandidatePipeline';
import { RecruitmentStats } from '@/components/hr/recruitment/RecruitmentStats';
import { JobOpeningCards } from '@/components/hr/recruitment/JobOpeningCards';

export default function RecruitmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Recruitment Pipeline
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track applicants and hiring progress
        </p>
      </div>

      <RecruitmentStats />

      <JobOpeningCards />

      <CandidatePipeline />
    </div>
  );
}