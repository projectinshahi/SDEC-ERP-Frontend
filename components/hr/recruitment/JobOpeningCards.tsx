'use client';

import { Card } from '@/components/Card';
import { JOB_OPENINGS } from '@/lib/hr/recruitment.mock';

export function JobOpeningCards() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {JOB_OPENINGS.map((job) => (
        <Card key={job.id} className="p-5 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {job.title}
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                {job.department}
              </p>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                job.status === 'Open'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300'
              }`}
            >
              {job.status}
            </span>
          </div>

          <div className="mt-5 flex justify-between text-sm">
            <span className="text-gray-500">
              Applicants: {job.applicants}
            </span>

            <span className="text-gray-500">
              Deadline: {job.deadline}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}