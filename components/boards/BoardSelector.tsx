'use client';

import React, { useState } from 'react';
import { ChevronDown, FolderKanban, Plus } from 'lucide-react';
import { usePermissions } from '@/lib/hooks/usePermissions';

export interface Board {
  id: number;
  name: string;
  projectName: string;
}

interface BoardSelectorProps {
  boards: Board[];
  selectedBoardId: number | null;
  onSelectBoard: (id: number) => void;
  isLoading: boolean;
}

export function BoardSelector({ boards, selectedBoardId, onSelectBoard, isLoading }: BoardSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { hasPermission } = usePermissions();

  const selectedBoard = boards.find(b => b.id === selectedBoardId);

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <FolderKanban size={18} className="text-blue-500" />
          <div className="flex flex-col items-start text-left">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
              {isLoading ? 'Loading boards...' : selectedBoard ? selectedBoard.name : 'Select a board'}
            </span>
            {selectedBoard && (
              <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                {selectedBoard.projectName}
              </span>
            )}
          </div>
          <ChevronDown size={16} className={`text-gray-400 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {hasPermission('task.board.create') && (
          <button className="flex items-center justify-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-sm" title="Create Board">
            <Plus size={20} />
          </button>
        )}
      </div>

      {isOpen && !isLoading && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="max-h-60 overflow-y-auto py-2">
              {boards.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">No boards available.</div>
              ) : (
                boards.map(board => (
                  <button
                    key={board.id}
                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedBoardId === board.id ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
                    onClick={() => {
                      onSelectBoard(board.id);
                      setIsOpen(false);
                    }}
                  >
                    <div className="font-medium text-sm text-gray-800 dark:text-gray-200">{board.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{board.projectName}</div>
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
