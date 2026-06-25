'use client';

import Link from 'next/link';
import { User2, Clock, ArrowRight } from 'lucide-react';
import { Card } from '@/components/Card';
import { MOCK_INTERVIEWS } from '@/lib/hr/mockData';

export function UpcomingInterviews() {
  return (
    <Card className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-full shadow-sm">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Upcoming Interviews
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Scheduled for today & tomorrow
            </p>
          </div>

          <Link
            href="/dashboard/hr/recruitment"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-blue-300 hover:text-blue-600 transition"
          >
            View All
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 flex-1 overflow-y-auto scrollbar-hide max-h-[320px]">
        {MOCK_INTERVIEWS.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            No scheduled interviews
          </div>
        ) : (
          MOCK_INTERVIEWS.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/20 p-4 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shrink-0 shadow-sm">
                  <User2 size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {item.candidateName}
                  </p>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {item.role}
                  </p>

                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300">
                    <Clock size={12} />
                    {item.dateTime}
                  </div>
                </div>

                <ArrowRight
                  size={16}
                  className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}