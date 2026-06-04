'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { fetchSprintsForBoard, Sprint } from '@/lib/api/kanban';
import { fetchProjectBoards } from '@/lib/api/projects';
import { useProject } from '@/lib/context/ProjectContext';

import { SprintSelector } from '../../../components/sprints/SprintSelector';
import { Board } from '../../../components/boards/BoardSelector';
import { AlertCircle, FolderDot } from 'lucide-react';



export function TasksPageClient() {
  const { activeProject } = useProject();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [isSprintsLoading, setIsSprintsLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const urlBoardId = searchParams.get('boardId');

  useEffect(() => {
    const loadBoards = async () => {
      if (!activeProject) {
        setBoards([]);
        setSelectedBoardId(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await fetchProjectBoards(activeProject.id);
        setBoards(data);

        // Auto-select logic
        if (data.length > 0) {
          // If we have an ID from URL and it's in this project's boards, use it
          if (urlBoardId && data.find((b: Board) => b.id === Number(urlBoardId))) {
            setSelectedBoardId(Number(urlBoardId));
          } else {
            // Otherwise, just pick the first board of this project
            setSelectedBoardId(data[0].id);
          }
        } else {
          setSelectedBoardId(null);
        }
      } catch (err) {
        setError('Failed to load boards');
      } finally {
        setIsLoading(false);
      }
    };
    loadBoards();
  }, [activeProject, urlBoardId]);

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
          if (!activeProject) return;
          try {
            const data = await fetchProjectBoards(activeProject.id);
            setBoards(data);
          } catch (err) {
            console.error('Failed to refresh boards', err);
          }
        };
        loadBoards();
      }
    }
  }, [selectedBoardId, boards]);

  const handleSelectSprint = (id: string | null) => {
    setSelectedSprintId(id);
  };

  // Fetch sprints when selected board changes
  useEffect(() => {
    if (selectedBoardId) {
      const loadSprints = async () => {
        try {
          setIsSprintsLoading(true);
          const data = await fetchSprintsForBoard(selectedBoardId);
          setSprints(data);
          
          // Optionally auto-select active sprint
          const activeSprint = data.find(s => s.status === 'Active');
          if (activeSprint) {
            setSelectedSprintId(activeSprint.id);
          } else {
            setSelectedSprintId(null); // Default to all tasks
          }
        } catch (err) {
          console.error('Failed to load sprints', err);
        } finally {
          setIsSprintsLoading(false);
        }
      };
      loadSprints();
    }
  }, [selectedBoardId]);

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

      </section>

      {!activeProject ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-gray-200">
          <FolderDot size={48} className="text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">No Active Project</h2>
          <p className="text-gray-500 mt-2">Please select a project from the top navigation bar to view its tasks.</p>
        </div>
      ) : error ? (
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
        <div key={`${selectedBoardId}-${selectedSprintId}`} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <KanbanBoard 
            boardId={selectedBoardId} 
            sprintId={selectedSprintId} 
            headerActions={
              <SprintSelector
                sprints={sprints}
                selectedSprintId={selectedSprintId}
                onSelectSprint={handleSelectSprint}
                isLoading={isSprintsLoading || isLoading}
              />
            }
          />
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-gray-500 animate-pulse">Loading board data...</p>
        </div>
      )}
    </PermissionPageGuard>
  );
}
