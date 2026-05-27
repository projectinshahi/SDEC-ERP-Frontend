'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw, Layers, CheckCircle, Clock, AlertTriangle, UserCheck, Trash2, X } from 'lucide-react';
import { Column } from './Column';
import { CreateTaskModal, Task, TaskFormData } from './CreateTaskModal';
import { TaskDetailsModal } from './TaskDetailsModal';
import { Card, CardBody } from '@/components/Card';
import { Button } from '@/components/Button';
import { fetchUsers, UserDbResponse } from '@/lib/api/users';
import { Modal } from '@/components/Modal';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  fetchKanbanColumns,
  createKanbanColumn,
  updateKanbanColumn,
  deleteKanbanColumn,
  fetchKanbanTasks,
  createKanbanTask,
  updateKanbanTask,
  deleteKanbanTask,
  moveKanbanTask,
  resetKanbanBoardDb,
  BoardColumn
} from '@/lib/api/kanban';

// Initial realistic mock tasks mapping perfectly to ERP workflow
const INITIAL_TASKS: Task[] = [];

const INITIAL_COLUMNS: BoardColumn[] = [];

/**
 * KanbanBoard orchestrator - Manages main state and operations of the tasks and dynamic columns.
 */
export function KanbanBoard({ boardId }: { boardId?: number | null }) {
  const [columns, setColumns] = useState<BoardColumn[]>(INITIAL_COLUMNS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [users, setUsers] = useState<UserDbResponse[]>([]);
  const [mounted, setMounted] = useState(false);
  const { hasPermission } = usePermissions();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  // Drag and drop tracking
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ taskId: string; position: 'before' | 'after' } | null>(null);

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<string>('todo');

  // Custom interactive dialog states
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

  const openConfirmDialog = (
    title: string,
    message: string,
    confirmText: string,
    confirmVariant: 'primary' | 'danger',
    onConfirm: () => void
  ) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      confirmText,
      confirmVariant,
      onConfirm: () => {
        onConfirm();
        closeDialog();
      },
    });
  };

  const openInputDialog = (
    title: string,
    defaultValue: string,
    placeholder: string,
    confirmText: string,
    onConfirm: (val: string) => void
  ) => {
    setDialogInput(defaultValue);
    setDialogInputError('');
    setDialog({
      isOpen: true,
      type: 'input',
      title,
      placeholder,
      confirmText,
      confirmVariant: 'primary',
      onConfirm: (val) => {
        onConfirm(val || '');
        closeDialog();
      },
    });
  };

  const closeDialog = () => {
    setDialog((prev) => ({ ...prev, isOpen: false }));
    setDialogInput('');
    setDialogInputError('');
  };

  // Load configuration from database on mount (avoid Next.js hydration issues)
  useEffect(() => {
    const init = async () => {
      try {
        const cols = await fetchKanbanColumns(boardId ?? undefined);
        const tsk = await fetchKanbanTasks(boardId ?? undefined);
        const usrs = await fetchUsers();
        setColumns(cols);
        setTasks(tsk);
        setUsers(usrs);
      } catch (error) {
        console.error('Failed to load Kanban board from PostgreSQL database:', error);
      } finally {
        setMounted(true);
      }
    };
    init();
  }, [boardId]);

  // Get active assignee list from the database
  const availableAssignees = useMemo(() => {
    return Array.from(new Set(users.map((user) => user.name)));
  }, [users]);

  // Compute metrics for board stats header
  const metrics = useMemo(() => {
    const total = tasks.length;
    // The last column represents the completed/done state in a dynamic board
    const lastColId = columns[columns.length - 1]?.id;
    const completed = lastColId ? tasks.filter((t) => t.status === lastColId).length : 0;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pct };
  }, [tasks, columns]);

  // Drag-and-drop placement reordering algorithm
  const handleMoveTask = async (taskId: string, targetStatus: string, targetIndex?: number) => {
    const taskToMove = tasks.find((t) => t.id === taskId);
    if (!taskToMove) return;

    // 1. Remove task from current array state
    const remainingTasks = tasks.filter((t) => t.id !== taskId);

    // 2. Formulate updated task with new status
    const updatedTask: Task = { ...taskToMove, status: targetStatus };

    let nextTasks: Task[];
    let targetColTaskIds: string[] = [];

    // 3. Re-insert task based on targets
    if (typeof targetIndex === 'number') {
      const targetColTasks = remainingTasks.filter((t) => t.status === targetStatus);
      const otherColTasks = remainingTasks.filter((t) => t.status !== targetStatus);

      targetColTasks.splice(targetIndex, 0, updatedTask);
      nextTasks = [...otherColTasks, ...targetColTasks];
      targetColTaskIds = targetColTasks.map(t => t.id);
    } else {
      nextTasks = [...remainingTasks, updatedTask];
      targetColTaskIds = nextTasks.filter(t => t.status === targetStatus).map(t => t.id);
    }

    setTasks(nextTasks);
    setDraggedTaskId(null);
    setDropIndicator(null);

    try {
      await moveKanbanTask(taskId, targetStatus, targetColTaskIds);
    } catch (err) {
      console.error('Failed to move task in database:', err);
    }
  };

  // Dynamic Column actions
  const handleAddColumn = async (name: string) => {
    const id = name.toLowerCase().trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

    const newCol: BoardColumn = { id, label: name, order: columns.length + 1, boardId: boardId ?? undefined };
    const newCols = [...columns, newCol];
    setColumns(newCols);

    try {
      await createKanbanColumn(newCol);
    } catch (err) {
      console.error('Failed to create column in database:', err);
    }
  };

  const handleRenameColumn = async (columnId: string, newName: string) => {
    const newCols = columns.map((col) => (col.id === columnId ? { ...col, label: newName } : col));
    setColumns(newCols);

    try {
      await updateKanbanColumn(columnId, { label: newName });
    } catch (err) {
      console.error('Failed to rename column in database:', err);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    const newCols = columns.filter((col) => col.id !== columnId);
    setColumns(newCols);

    const newTasks = tasks.filter((task) => task.status !== columnId);
    setTasks(newTasks);

    try {
      await deleteKanbanColumn(columnId);
    } catch (err) {
      console.error('Failed to delete column from database:', err);
    }
  };

  // Open modal in creation mode
  const handleCreateTaskOpen = (status: string = columns[0]?.id || '') => {
    setEditingTask(null);
    setDefaultStatus(status);
    setIsModalOpen(true);
  };

  // Open modal in edit mode
  const handleEditTaskOpen = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  // Delete task with visual confirmation
  const handleDeleteTask = (id: string) => {
    openConfirmDialog(
      'Delete Task',
      'Are you sure you want to permanently delete this task? This action cannot be undone.',
      'Delete Task',
      'danger',
      async () => {
        setTasks(tasks.filter((t) => t.id !== id));
        try {
          await deleteKanbanTask(id);
        } catch (err) {
          console.error('Failed to delete task from database:', err);
        }
      }
    );
  };

  // Process Add/Edit form submission
  const handleFormSubmit = async (data: TaskFormData) => {
    if (editingTask) {
      // Update
      const updated = tasks.map((t) => (t.id === editingTask.id ? { ...t, ...data } : t));
      setTasks(updated);

      try {
        await updateKanbanTask(editingTask.id, data);
      } catch (err) {
        console.error('Failed to update task in database:', err);
      }
    } else {
      // Add
      const newTask: Task = {
        id: `task-${Date.now()}`,
        ...data,
      };
      setTasks([...tasks, newTask]);

      try {
        await createKanbanTask({ ...newTask, boardId: boardId ?? undefined });
      } catch (err) {
        console.error('Failed to create task in database:', err);
      }
    }
  };

  // Reset board back to initial state
  const handleResetBoard = () => {
    openConfirmDialog(
      'Reset Board',
      'Are you sure you want to reset all tasks and columns? This will restore initial custom status sections and task cards in database.',
      'Reset Board',
      'danger',
      async () => {
        try {
          await resetKanbanBoardDb();
          const cols = await fetchKanbanColumns(boardId ?? undefined);
          const tsk = await fetchKanbanTasks(boardId ?? undefined);
          setColumns(cols);
          setTasks(tsk);

          setSearchQuery('');
          setFilterPriority('all');
          setFilterAssignee('all');
        } catch (err) {
          console.error('Failed to reset Kanban board in database:', err);
        }
      }
    );
  };

  // Reset only search filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterPriority('all');
    setFilterAssignee('all');
  };

  // Filter tasks based on Search terms, Priority, and Assignee selections
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchPriority = filterPriority === 'all' || task.priority === filterPriority;

      const matchAssignee = filterAssignee === 'all' || task.assignee === filterAssignee;

      return matchSearch && matchPriority && matchAssignee;
    });
  }, [tasks, searchQuery, filterPriority, filterAssignee]);

  const hasActiveFilters = searchQuery !== '' || filterPriority !== 'all' || filterAssignee !== 'all';

  // Prevent initial SSR rendering hydration drift
  if (!mounted) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 text-sm animate-pulse">Loading ERP Kanban Board...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* Total stats */}
        <Card variant="outlined" className="bg-white dark:bg-gray-800">
          <CardBody className="flex items-center gap-4 p-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-lg">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Tasks</p>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{metrics.total}</h3>
            </div>
          </CardBody>
        </Card>

        {/* Dynamic Column Stats */}
        {columns.map((col, idx) => {
          const count = tasks.filter((t) => t.status === col.id).length;

          const iconThemes = [
            'bg-gray-100 dark:bg-gray-800 text-gray-500',
            'bg-amber-50 dark:bg-amber-950/20 text-amber-500',
            'bg-blue-50 dark:bg-blue-950/20 text-blue-600',
            'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500',
            'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500',
            'bg-rose-50 dark:bg-rose-950/20 text-rose-500',
            'bg-violet-50 dark:bg-violet-950/20 text-violet-500',
            'bg-cyan-50 dark:bg-cyan-950/20 text-cyan-500',
          ];
          const currentTheme = iconThemes[idx % iconThemes.length];

          return (
            <Card key={col.id} variant="outlined" className="bg-white dark:bg-gray-800 transition-all duration-300">
              <CardBody className="flex items-center gap-4 p-4">
                <div className={`p-3 rounded-lg ${currentTheme}`}>
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider truncate max-w-[120px]" title={col.label}>
                    {col.label}
                  </p>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{count}</h3>
                </div>
              </CardBody>
            </Card>
          );
        })}

        {/* Completed Stats Card with dynamic progress */}
        {columns.length > 0 && (
          <Card variant="outlined" className="bg-emerald-50/20 dark:bg-emerald-950/5 border-emerald-100 dark:border-emerald-900/50">
            <CardBody className="flex flex-col justify-center p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 font-semibold text-xs uppercase tracking-wider">
                  <CheckCircle size={14} />
                  <span>Completion</span>
                </div>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{metrics.pct}%</span>
              </div>
              {/* Completion Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.pct}%` }}
                />
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* 2. Search, Filters and Toolbar Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/80 shadow-sm">
        {/* Left Side: Search & Filter inputs */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search box */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              aria-label="Search tasks"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-gray-200 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 p-0.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Priority */}
          <div className="flex items-center gap-1.5 min-w-[130px]">
            <Filter size={14} className={`hidden sm:block transition-colors ${filterPriority !== 'all' ? 'text-blue-500' : 'text-gray-400'}`} />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer dark:text-gray-200 transition-all ${filterPriority !== 'all'
                  ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-200 dark:ring-blue-800'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'
                }`}
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          {/* Filter Assignee */}
          <div className="flex items-center gap-1.5 min-w-[150px]">
            <UserCheck size={14} className={`hidden sm:block transition-colors ${filterAssignee !== 'all' ? 'text-blue-500' : 'text-gray-400'}`} />
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer dark:text-gray-200 transition-all ${filterAssignee !== 'all'
                  ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-200 dark:ring-blue-800'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'
                }`}
            >
              <option value="all">All Assignees</option>
              {availableAssignees.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button - always visible, disabled when no filters */}
          <button
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
            className={`text-xs font-semibold px-3 py-1.5 rounded-md select-none transition-all duration-200 ${hasActiveFilters
                ? 'text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer'
                : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
          >
            Reset
          </button>

          {/* Filtered Count Badge */}
          {hasActiveFilters && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-full animate-in">
              <Filter size={11} />
              {filteredTasks.length} of {tasks.length} tasks
            </span>
          )}
        </div>

        {/* Right Side: Actions (New Task & Reset Board) */}
        <div className="flex items-center gap-2 shrink-0">
          {hasPermission('task.board.delete') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetBoard}
              className="flex items-center gap-2 px-3.5 cursor-pointer"
              title="Reset Board and columns data"
            >
              <RefreshCw size={15} />
              <span className="hidden sm:inline">Reset Board</span>
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={() => handleCreateTaskOpen(columns[0]?.id || '')}
            disabled={columns.length === 0}
            className="flex items-center gap-2 shadow-sm shadow-blue-500/10 cursor-pointer"
          >
            <Plus size={16} />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* 2b. Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 animate-in">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Active filters:</span>
          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-full transition-all">
              <Search size={11} />
              &ldquo;{searchQuery.length > 20 ? searchQuery.slice(0, 20) + '…' : searchQuery}&rdquo;
              <button onClick={() => setSearchQuery('')} className="ml-0.5 hover:bg-violet-200 dark:hover:bg-violet-800 rounded-full p-0.5 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}
          {filterPriority !== 'all' && (
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium border px-2.5 py-1 rounded-full transition-all ${filterPriority === 'high' ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' :
                filterPriority === 'medium' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                  'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
              }`}>
              <AlertTriangle size={11} />
              {filterPriority.charAt(0).toUpperCase() + filterPriority.slice(1)} Priority
              <button onClick={() => setFilterPriority('all')} className="ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}
          {filterAssignee !== 'all' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 px-2.5 py-1 rounded-full transition-all">
              <UserCheck size={11} />
              {filterAssignee}
              <button onClick={() => setFilterAssignee('all')} className="ml-0.5 hover:bg-cyan-200 dark:hover:bg-cyan-800 rounded-full p-0.5 transition-colors cursor-pointer">
                <X size={11} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* 3. Horizontal Scrollable Kanban Columns Board or Empty Board State */}
      {columns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/80 shadow-sm max-w-md mx-auto my-8 animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5 shadow-inner">
            <Layers size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Create your first column</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm max-w-xs leading-relaxed">
            Your Kanban board is currently empty. Add custom workflow status columns to start creating and managing tasks.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              openInputDialog(
                'Add Status Column',
                '',
                'Enter column title (e.g. To Do)...',
                'Create Column',
                (name) => handleAddColumn(name)
              );
            }}
            className="mt-6 flex items-center gap-2 shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Status Column</span>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-800">
          <div className="flex gap-4 min-w-[1100px] h-[66vh] items-start">
            {/* Active Dynamic Columns */}
            {columns.map((col, index) => {
              // Filter tasks matching the current column status and active filters
              const columnTasks = filteredTasks.filter((t) => t.status === col.id);

              return (
                <Column
                  key={col.id}
                  title={col.label}
                  status={col.id}
                  index={index}
                  tasks={columnTasks}
                  availableAssignees={availableAssignees}
                  onEdit={(task) => {
                    setEditingTask(task);
                    setIsModalOpen(true);
                  }}
                  onView={(task) => {
                    setViewingTask(task);
                  }}
                  onDelete={handleDeleteTask}
                  draggedTaskId={draggedTaskId}
                  setDraggedTaskId={setDraggedTaskId}
                  dropIndicator={dropIndicator}
                  setDropIndicator={setDropIndicator}
                  onMoveTask={handleMoveTask}
                  onCreateTaskInColumn={handleCreateTaskOpen}
                  onRenameColumnClick={(statusId, currentName) => {
                    openInputDialog(
                      'Rename Column',
                      currentName,
                      'Enter column title...',
                      'Save Changes',
                      (newName) => handleRenameColumn(statusId, newName)
                    );
                  }}
                  onDeleteColumnClick={(statusId, title) => {
                    openConfirmDialog(
                      'Delete Column',
                      `Are you sure you want to delete the "${title}" column? This column and all of its tasks will be permanently deleted.`,
                      'Delete Column',
                      'danger',
                      () => handleDeleteColumn(statusId)
                    );
                  }}
                />
              );
            })}

            {/* "+ Add Column" Dynamic UI Trigger Card */}
            {hasPermission('task.column.create') && (
              <div
                onClick={() => {
                  openInputDialog(
                    'Add Status Column',
                    '',
                    'Enter column title (e.g. To Do)...',
                    'Create Column',
                    (name) => handleAddColumn(name)
                  );
                }}
                className="flex-shrink-0 w-[280px] h-[150px] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 bg-gray-50/50 dark:bg-gray-800/10 hover:bg-white dark:hover:bg-gray-800/30 rounded-xl p-6 text-center cursor-pointer transition-all duration-200 group shadow-sm select-none"
                title="Create a custom status column"
              >
                <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform border border-gray-100 dark:border-gray-700">
                  <Plus size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Add Column
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                  Create a custom status section
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty board state when searching filters return 0 results globally */}
      {filteredTasks.length === 0 && tasks.length > 0 && (
        <div className="py-12 text-center bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 max-w-md mx-auto my-6">
          <p className="text-gray-500 dark:text-gray-400 font-semibold text-sm">No tasks match your filters</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Try resetting search parameters or select &quot;All Priorities&quot;.</p>
          <button
            onClick={handleClearFilters}
            className="mt-3.5 inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            Clear Search Filters
          </button>
        </div>
      )}

      {/* 4. Task Creation/Edit Modal wrapper */}
      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleFormSubmit}
        availableAssignees={availableAssignees}
        columns={columns}
        editTask={editingTask || (defaultStatus !== (columns[0]?.id || '') ? {
          id: '',
          title: '',
          description: '',
          priority: 'medium',
          assignee: users[0]?.name || '',
          status: defaultStatus,
          dueDate: new Date().toISOString().split('T')[0],
          estimatedHours: 0,
          actualHours: 0,
        } : null)}
      />

      {/* 5. Custom Overlay Dialog Modal for Alerts/Confirms/Inputs */}
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
      <TaskDetailsModal
        isOpen={!!viewingTask}
        onClose={() => setViewingTask(null)}
        task={viewingTask}
      />
    </div>
  );
}
