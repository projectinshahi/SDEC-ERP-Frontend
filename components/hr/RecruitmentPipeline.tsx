'use client';

import { Card } from '@/components/Card';
import { MOCK_RECRUITMENT_PIPELINE } from '@/lib/hr/mockData';

export function RecruitmentPipeline() {
  const maxCount = Math.max(
    ...MOCK_RECRUITMENT_PIPELINE.map((item) => item.count)
  );

  const totalCandidates = MOCK_RECRUITMENT_PIPELINE.reduce(
    (sum, item) => sum + item.count,
    0
  );

  return (
    <Card className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-full shadow-sm">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Recruitment Pipeline
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Active candidates by hiring stage
        </p>
      </div>

      <div className="p-6 flex flex-col h-full">
        {/* Top KPI */}
        <div className="mb-6 rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/20 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400">
            Total Candidates
          </p>
          <p className="text-3xl font-black text-gray-900 dark:text-white mt-1 tabular-nums">
            {totalCandidates}
          </p>
        </div>

        {/* Pipeline Stages */}
        <div className="space-y-5">
          {MOCK_RECRUITMENT_PIPELINE.map((item) => {
            const percentage =
              maxCount > 0 ? (item.count / maxCount) * 100 : 0;

            return (
              <div key={item.stage}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {item.stage}
                  </span>

                  <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                    {item.count}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="relative w-full h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 shadow-sm ${item.color}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Percentage */}
                <div className="mt-1 text-right">
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    {Math.round(percentage)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}