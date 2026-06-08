'use client';

import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { classNames } from '@/lib/utils';

interface ViewToggleProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-200/40 dark:border-gray-700/30">
      <button
        onClick={() => onViewModeChange('grid')}
        className={classNames(
          'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer select-none duration-200',
          viewMode === 'grid'
            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
        )}
        aria-label="Grid View"
        title="Grid View"
      >
        <LayoutGrid size={15} />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        onClick={() => onViewModeChange('list')}
        className={classNames(
          'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer select-none duration-200',
          viewMode === 'list'
            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
        )}
        aria-label="List View"
        title="List View"
      >
        <List size={15} />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}
