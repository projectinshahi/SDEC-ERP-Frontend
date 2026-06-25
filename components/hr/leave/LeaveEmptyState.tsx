'use client';

import { CalendarX } from 'lucide-react';
import { Card, CardBody } from '@/components/Card';

interface LeaveEmptyStateProps {
  userRole: 'admin' | 'staff';
}

export function LeaveEmptyState({ userRole }: LeaveEmptyStateProps) {
  return (
    <Card className="border border-gray-150 dark:border-gray-800 shadow-xs">
      <CardBody className="py-16 px-4 flex flex-col items-center justify-center text-center">
        {/* Visual Graphic Wrapper */}
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-5 shadow-xs">
          <CalendarX size={28} />
        </div>

        {/* Message block */}
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          No Leave Requests Found
        </h3>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
          {userRole === 'admin' 
            ? 'We couldn\'t find any records matching your filter parameters. Try clearing some filters or searching for another term.'
            : 'You haven\'t submitted any leave applications matching these criteria yet. Click "Apply Leave" to submit a new request.'}
        </p>
      </CardBody>
    </Card>
  );
}
