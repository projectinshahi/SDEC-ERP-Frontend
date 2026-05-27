'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { fetchBoards as fetchBoardsApi } from '@/lib/api/kanban';

import { BoardSelector, Board } from '../../../components/boards/BoardSelector';
import { AlertCircle } from 'lucide-react';



export function TasksPageClient() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const urlBoardId = searchParams.get('boardId');

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        setIsLoading(true);
        // Using the mocked Next.js API route created earlier
        const res = await fetch('/api/boards');
        if (!res.ok) throw new Error('Failed to load boards');
        const data = await res.json();
        setBoards(data);

        // Initial setup if we have data
        const savedId = localStorage.getItem('selectedBoardId');

        if (urlBoardId && data.find((b: Board) => b.id === Number(urlBoardId))) {
          setSelectedBoardId(Number(urlBoardId));
          localStorage.setItem('selectedBoardId', urlBoardId);
        } else if (savedId && data.find((b: Board) => b.id === Number(savedId))) {
          setSelectedBoardId(Number(savedId));
        } else if (data.length > 0) {
          setSelectedBoardId(data[0].id);
        }
      } catch (err) {
        setError('Failed to load boards');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBoards();
  }, []); // Only fetch boards once on mount

  // Reactively respond to URL changes (like clicking a board from the BoardList)
  useEffect(() => {
    if (urlBoardId) {
      const id = Number(urlBoardId);
      setSelectedBoardId((currentId) => {
        if (currentId !== id) {
          localStorage.setItem('selectedBoardId', String(id));
          return id;
        }
        return currentId;
      });
    }
  }, [urlBoardId]);

  // Keep track of which boards we have already tried to fetch to avoid infinite loops
  const fetchedBoardIds = useRef<Set<number>>(new Set());

  // Re-fetch boards if a new boardId is detected that isn't in our list
  useEffect(() => {
    if (selectedBoardId && boards.length > 0) {
      const isMissing = !boards.find(b => b.id === selectedBoardId);
      const hasTried = fetchedBoardIds.current.has(selectedBoardId);

      if (isMissing && !hasTried) {
        fetchedBoardIds.current.add(selectedBoardId);

        const loadBoards = async () => {
          try {
            const data = await fetchBoardsApi();
            setBoards(data);
          } catch (err) {
            console.error('Failed to refresh boards', err);
          }
        };
        loadBoards();
      }
    }
  }, [selectedBoardId, boards]);

  const handleSelectBoard = (id: number) => {
    setSelectedBoardId(id);
    localStorage.setItem('selectedBoardId', String(id));
    router.push(`/dashboard/tasks?boardId=${id}`);
  };

  return (
    <PermissionPageGuard module="task">
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'Tasks' }]} />
      </div>

      <section className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Tasks Board</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Drag-and-drop tasks to advance workflows, search by title, and filter assignees.
          </p>
        </div>

        {/* Board Selector */}
        {!error && (
          <BoardSelector
            boards={boards}
            selectedBoardId={selectedBoardId}
            onSelectBoard={handleSelectBoard}
            isLoading={isLoading}
          />
        )}
      </section>

      {error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      ) : boards.length === 0 && !isLoading ? (
        <div className="py-12 text-center bg-white rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">No boards available</h3>
          <p className="text-gray-500 mt-2">Create your first board to get started.</p>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Create your first board
          </button>
        </div>
      ) : selectedBoardId ? (
        <div key={selectedBoardId} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <KanbanBoard boardId={selectedBoardId} />
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-gray-500 animate-pulse">Loading board data...</p>
        </div>
      )}
    </PermissionPageGuard>
  );
}
