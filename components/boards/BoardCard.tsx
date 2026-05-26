'use client';

import React from 'react';
import { Calendar, CheckSquare, ChevronRight, FolderKanban } from 'lucide-react';
import Link from 'next/link';

export interface BoardCardProps {
  id: number;
  name: string;
  projectName: string;
  taskCount?: number;
  lastUpdated?: string;
}

export function BoardCard({ id, name, projectName, taskCount, lastUpdated }: BoardCardProps) {
  // Format the date if it exists
  const formattedDate = lastUpdated 
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(lastUpdated))
    : undefined;

  return (
    <Link href={`/dashboard/tasks?boardId=${id}`} className="block group">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-5 transition-all duration-200 h-full flex flex-col hover:-translate-y-0.5 cursor-pointer">
        
        {/* Header: Project Name & Status */}
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
            {projectName}
          </span>
          <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
        </div>

        {/* Board Title */}
        <div className="flex items-start gap-3 mb-4 flex-1">
          <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-500 dark:text-gray-400 shrink-0">
            <FolderKanban size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
              {name}
            </h3>
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          {taskCount !== undefined && (
            <div className="flex items-center gap-1.5" title="Total Tasks">
              <CheckSquare size={14} />
              <span className="font-medium">{taskCount}</span>
            </div>
          )}
          
          {formattedDate && (
            <div className="flex items-center gap-1.5" title="Last Updated">
              <Calendar size={14} />
              <span>{formattedDate}</span>
            </div>
          )}
        </div>

      </div>
    </Link>
  );
}
