'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BoardCard, BoardCardProps } from './BoardCard';
import { Search, Plus, AlertCircle, LayoutGrid } from 'lucide-react';
import { CreateBoardModal } from './CreateBoardModal';
import { fetchBoards as fetchBoardsApi } from '@/lib/api/kanban';
import { useRouter } from 'next/navigation';

export function BoardList() {
  const [boards, setBoards] = useState<BoardCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const loadBoards = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchBoardsApi();
      setBoards(data.map(b => ({
        id: b.id,
        name: b.name,
        projectName: b.projectName,
        taskCount: 0,
        lastUpdated: b.createdAt || new Date().toISOString(),
      })));
    } catch (err) {
      setError('Failed to load boards');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const filteredBoards = boards.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        {/* Search */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search boards or projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm shadow-sm"
          />
        </div>

        {/* Create CTA */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        >
          <Plus size={18} />
          Create Board
        </button>
      </div>

      {/* States */}
      {error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(skeleton => (
            <div key={skeleton} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 h-40 animate-pulse">
              <div className="flex justify-between mb-4">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-1/3"></div>
              </div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-8"></div>
            </div>
          ))}
        </div>
      ) : filteredBoards.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 py-16 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mb-4">
            <LayoutGrid size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">No boards found</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {searchQuery ? 'We couldn\'t find any boards matching your search.' : 'You haven\'t created any task boards yet.'}
          </p>
          {!searchQuery && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Create your first board
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="text-sm font-medium text-gray-500 mb-2">
            Showing {filteredBoards.length} board{filteredBoards.length !== 1 ? 's' : ''}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBoards.map(board => (
              <BoardCard
                key={board.id}
                id={board.id}
                name={board.name}
                projectName={board.projectName}
                taskCount={board.taskCount}
                lastUpdated={board.lastUpdated}
              />
            ))}
          </div>
        </>
      )}

      <CreateBoardModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newBoardId) => {
          loadBoards();
          router.push(`/dashboard/tasks?boardId=${newBoardId}`);
        }}
      />
    </div>
  );
}
