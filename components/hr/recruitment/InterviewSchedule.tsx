'use client';

import { Card } from '@/components/Card';
import { CalendarDays, Clock } from 'lucide-react';

const interviews = [
  {
    id: 1,
    candidate: 'Rahul',
    role: 'MERN Developer',
    time: '10:30 AM',
    day: 'Today',
  },
  {
    id: 2,
    candidate: 'Arjun',
    role: 'UI Designer',
    time: '02:00 PM',
    day: 'Today',
  },
  {
    id: 3,
    candidate: 'Sneha',
    role: 'HR Executive',
    time: '04:30 PM',
    day: 'Tomorrow',
  },
];

export function InterviewSchedule() {
  return (
    <Card className="p-6 rounded-2xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 flex items-center justify-center">
          <CalendarDays size={18} />
        </div>

        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Interview Schedule
          </h2>
          <p className="text-xs text-gray-500">
            Upcoming interviews
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {interviews.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-850"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                  {item.candidate}
                </h4>

                <p className="text-xs text-gray-500 mt-1">
                  {item.role}
                </p>
              </div>

              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.day === 'Today'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {item.day}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
              <Clock size={13} />
              {item.time}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}