'use client';

import React from 'react';
import { ClipboardList, SearchX, Plus } from 'lucide-react';

type EmptyStateVariant = 'empty' | 'filtered';

interface EmptyStateProps {
  /** Which empty state to show */
  variant?: EmptyStateVariant;
  /** Column name for contextual message */
  columnTitle?: string;
  /** Callback when "Clear filters" is clicked (filtered variant) */
  onClearFilters?: () => void;
  /** Callback when "Create task" is clicked (empty variant) */
  onCreateTask?: () => void;
}

/**
 * Reusable Empty State component for Kanban columns.
 * 
 * - `empty`: Shown when a column genuinely has zero tasks.
 * - `filtered`: Shown when column filters hide all tasks.
 * 
 * Features:
 * - Accessible with role="status" and screen-reader text
 * - Fade-in animation for smooth transitions
 * - Maintains column height to prevent layout shift
 * - Drop zone remains active for drag-and-drop (handled by parent Column)
 */
export function EmptyState({
  variant = 'empty',
  columnTitle,
  onClearFilters,
  onCreateTask,
}: EmptyStateProps) {
  if (variant === 'filtered') {
    return (
      <div
        role="status"
        aria-label={`No tasks matching filters${columnTitle ? ` in ${columnTitle}` : ''}`}
        className="flex-1 flex flex-col items-center justify-center min-h-[150px] border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center my-1 select-none animate-fade-in"
      >
        {/* Icon */}
        <div className="w-11 h-11 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center mb-3">
          <SearchX size={20} className="text-amber-400 dark:text-amber-500" />
        </div>

        {/* Message */}
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          No matching tasks
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 max-w-[160px] leading-relaxed">
          Adjust or clear filters to see tasks in this stage.
        </p>

        {/* Action */}
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-md transition-all cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  // Default: empty variant
  return (
    <div
      role="status"
      aria-label={`No tasks${columnTitle ? ` in ${columnTitle}` : ''} column. Drag tasks here or create a new one.`}
      className="flex-1 flex flex-col items-center justify-center min-h-[150px] border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-800 rounded-xl p-8 text-center my-1 select-none transition-all duration-300 group animate-fade-in"
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800/80 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/20 transition-all duration-300 shadow-sm">
        <ClipboardList size={22} className="text-gray-400 dark:text-gray-500 group-hover:text-blue-400 dark:group-hover:text-blue-500 transition-colors duration-300" />
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
        No tasks in this stage
      </p>

      {/* Subtext */}
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 max-w-[180px] leading-relaxed">
        Create a new task or drag and drop existing tasks here.
      </p>

      {/* Create task action */}
      {onCreateTask && (
        <button
          onClick={onCreateTask}
          className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-white dark:hover:text-white bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-500 dark:hover:bg-blue-600 border border-blue-200 dark:border-blue-800 hover:border-blue-500 dark:hover:border-blue-600 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md group/btn"
        >
          <Plus size={13} className="transition-transform group-hover/btn:rotate-90 duration-200" />
          Create Task
        </button>
      )}
    </div>
  );
}
