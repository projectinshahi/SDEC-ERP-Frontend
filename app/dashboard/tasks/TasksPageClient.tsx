'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { fetchSprintsForBoard, Sprint } from '@/lib/api/kanban';
import { fetchProjectBoards } from '@/lib/api/projects';
import { useProject } from '@/lib/context/ProjectContext';

import { BoardAnalytics } from '@/components/boards/BoardAnalytics';
import { SprintSelector } from '../../../components/sprints/SprintSelector';
import { Board } from '../../../components/boards/BoardSelector';
import { AlertCircle, FolderDot, LayoutDashboard, BarChart3, Settings, Edit2, Trash2 } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { updateBoardApi, deleteBoardApi } from '@/lib/api/kanban';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';



export function TasksPageClient() {
  const { activeProject } = useProject();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [isSprintsLoading, setIsSprintsLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'board' | 'analytics'>('board');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Dialog State
  const [dialogInput, setDialogInput] = useState('');
  const [dialogInputError, setDialogInputError] = useState('');
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: 'input' | 'confirm';
    title: string;
    message?: string;
    placeholder?: string;
    confirmText?: string;
    confirmVariant?: 'primary' | 'danger';
    onConfirm: (val?: string) => void;
  }>({
    isOpen: false,
    type: 'confirm',
    title: '',
    onConfirm: () => { },
  });

  const closeDialog = () => {
    setDialog((prev) => ({ ...prev, isOpen: false }));
    setDialogInput('');
    setDialogInputError('');
  };

  const { hasPermission, isSuperAdmin } = usePermissions();
  const isAdmin = isSuperAdmin || hasPermission('task.board.edit');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Handle board rename
  const handleRenameBoard = () => {
    if (!selectedBoardId) return;
    const currentBoard = boards.find(b => b.id === selectedBoardId);
    if (!currentBoard) return;

    setDialogInput(currentBoard.name);
    setDialogInputError('');
    setDialog({
      isOpen: true,
      type: 'input',
      title: 'Rename Board',
      placeholder: 'Enter new board name...',
      confirmText: 'Rename',
      confirmVariant: 'primary',
      onConfirm: async (newName?: string) => {
        if (newName && newName.trim() !== '' && newName !== currentBoard.name) {
          try {
            const updated = await updateBoardApi(selectedBoardId, { name: newName.trim() });
            setBoards(prev => prev.map(b => b.id === selectedBoardId ? { ...b, name: updated.name } : b));
          } catch (err) {
            console.error('Failed to rename board', err);
            // Could add toast here
          }
        }
        closeDialog();
      }
    });
    setIsSettingsOpen(false);
  };

  // Handle board delete
  const handleDeleteBoard = () => {
    if (!selectedBoardId) return;
    
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Delete Board',
      message: 'Are you sure you want to permanently delete this board? All columns and tasks will be lost.',
      confirmText: 'Delete Board',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          await deleteBoardApi(selectedBoardId);
          setBoards(prev => prev.filter(b => b.id !== selectedBoardId));
          setSelectedBoardId(null);
          router.push('/dashboard/tasks');
        } catch (err) {
          console.error('Failed to delete board', err);
        }
        closeDialog();
      }
    });
    setIsSettingsOpen(false);
  };

  return (
    <PermissionPageGuard module="task">
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'Tasks' }]} />
      </div>

      <section className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700/60 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-tight flex items-center gap-2">
            Tasks Board
            {isAdmin && selectedBoardId && (
              <div className="relative inline-block ml-2" ref={settingsMenuRef}>
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors"
                  title="Board Settings"
                >
                  <Settings size={20} />
                </button>
                {isSettingsOpen && (
                  <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <div className="py-1 flex flex-col">
                      <button
                        onClick={handleRenameBoard}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <Edit2 size={14} className="text-gray-500" />
                        Rename Board
                      </button>
                      <button
                        onClick={handleDeleteBoard}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                      >
                        <Trash2 size={14} className="text-red-500" />
                        Delete Board
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Drag-and-drop tasks to advance workflows, search by title, and filter assignees.
          </p>
        </div>

        {/* Tab Toggle */}
        {selectedBoardId && (
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('board')}
              className={classNames(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors',
                activeTab === 'board' 
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              <LayoutDashboard size={16} />
              Board
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={classNames(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors',
                activeTab === 'analytics' 
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              <BarChart3 size={16} />
              Analytics
            </button>
          </div>
        )}
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
          {activeTab === 'board' ? (
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
          ) : (
            <BoardAnalytics 
              boardId={selectedBoardId} 
              sprintId={selectedSprintId} 
              sprints={sprints} 
            />
          )}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-gray-500 animate-pulse">Loading board data...</p>
        </div>
      )}

      {/* Dialog Modal */}
      <Modal
        isOpen={dialog.isOpen}
        onClose={closeDialog}
        title={dialog.title}
        size="sm"
      >
        <div className="space-y-4">
          {dialog.type === 'confirm' ? (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {dialog.message}
              </p>
              <div className="flex gap-3 pt-5 border-t border-gray-100 dark:border-gray-800 mt-6">
                <Button variant="secondary" onClick={closeDialog} fullWidth>
                  Cancel
                </Button>
                <Button
                  variant={dialog.confirmVariant === 'danger' ? 'danger' : 'primary'}
                  onClick={() => dialog.onConfirm()}
                  fullWidth
                >
                  {dialog.confirmText || 'Confirm'}
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!dialogInput.trim()) {
                  setDialogInputError('This field is required');
                  return;
                }
                dialog.onConfirm(dialogInput.trim());
              }}
              className="space-y-4"
            >
              <div>
                <input
                  type="text"
                  value={dialogInput}
                  onChange={(e) => {
                    setDialogInput(e.target.value);
                    if (e.target.value.trim()) setDialogInputError('');
                  }}
                  placeholder={dialog.placeholder}
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-gray-200 transition-all"
                  autoFocus
                />
                {dialogInputError && (
                  <p className="text-red-500 text-xs mt-1 font-medium">{dialogInputError}</p>
                )}
              </div>
              <div className="flex gap-3 pt-5 border-t border-gray-100 dark:border-gray-800 mt-2">
                <Button type="button" variant="secondary" onClick={closeDialog} fullWidth>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                >
                  {dialog.confirmText || 'Save'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </PermissionPageGuard>
  );
}
