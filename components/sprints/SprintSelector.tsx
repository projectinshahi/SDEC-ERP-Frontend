'use client';

import React, { useState } from 'react';
import { ChevronDown, Timer } from 'lucide-react';
import { Sprint } from '@/lib/api/kanban';
import { classNames } from '@/lib/utils';
import { Badge } from '@/components/Badge';

interface SprintSelectorProps {
  sprints: Sprint[];
  selectedSprintId: string | null;
  onSelectSprint: (id: string | null) => void;
  isLoading: boolean;
}

export function SprintSelector({ sprints, selectedSprintId, onSelectSprint, isLoading }: SprintSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedSprint = sprints.find(s => s.id === selectedSprintId);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const getSprintDateText = (sprint: Sprint) => {
    if (sprint.startDate && sprint.endDate) {
      return `${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}`;
    }
    return '';
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <Timer size={18} className="text-blue-500" />
          <div className="flex flex-col items-start text-left min-w-[120px]">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
              {isLoading ? 'Loading sprints...' : selectedSprint ? selectedSprint.name : 'All Sprints'}
            </span>
            {selectedSprint && selectedSprint.status === 'Active' && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                ACTIVE SPRINT
              </span>
            )}
          </div>
          <ChevronDown size={16} className={`text-gray-400 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && !isLoading && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="max-h-80 overflow-y-auto py-2">

              {/* All Sprints Option */}
              <button
                className={classNames(
                  "w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700",
                  selectedSprintId === null ? "bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-l-blue-500" : "border-l-2 border-l-transparent"
                )}
                onClick={() => {
                  onSelectSprint(null);
                  setIsOpen(false);
                }}
              >
                <div className="font-medium text-sm text-gray-800 dark:text-gray-200">All Sprints</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">View tasks across all sprints</div>
              </button>

              {sprints.length === 0 ? (
                <div className="px-4 py-4 text-sm text-gray-500 text-center">No sprints available.</div>
              ) : (
                sprints.map(sprint => (
                  <button
                    key={sprint.id}
                    className={classNames(
                      "w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                      selectedSprintId === sprint.id ? "bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-l-blue-500" : "border-l-2 border-l-transparent"
                    )}
                    onClick={() => {
                      onSelectSprint(sprint.id);
                      setIsOpen(false);
                    }}
                  >
                    <div>
                      <div className="font-medium text-sm text-gray-800 dark:text-gray-200">{sprint.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                        <span>{getSprintDateText(sprint)}</span>
                        {sprint.totalEstimatedPoints !== undefined && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{sprint.totalEstimatedPoints} Pts</span>
                          </>
                        )}
                        {sprint.capacity !== undefined && sprint.capacity > 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                            <span className="font-semibold text-indigo-500">{sprint.capacity} Cap</span>
                          </>
                        )}
                      </div>
                    </div>
                    {sprint.status && (
                      <Badge
                        variant={sprint.status === 'Active' ? 'success' : sprint.status === 'Completed' ? 'info' : 'default'}
                        className="text-[10px] py-0"
                      >
                        {sprint.status}
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
