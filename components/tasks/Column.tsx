'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, MoreHorizontal, Trash2, Filter, X, ChevronDown, Edit2 } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { EmptyState } from './EmptyState';
import type { Task } from './CreateTaskModal';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface ColumnProps {
  title: string;
  status: string; // Dynamic string status
  index: number;  // Order index of this column for dynamic coloring
  tasks: Task[];
  unreadCount?: number;
  availableAssignees: string[];
  onEdit: (task: Task) => void;
  onView: (task: Task) => void;
  onDelete: (id: string) => void;
  onClone?: (id: string) => void;
  draggedTaskId: string | null;
  setDraggedTaskId: (id: string | null) => void;
  dropIndicator: { taskId: string; position: 'before' | 'after' } | null;
  setDropIndicator: (val: { taskId: string; position: 'before' | 'after' } | null) => void;
  onMoveTask: (taskId: string, targetStatus: string, targetIndex?: number) => void;
  onCreateTaskInColumn: (status: string) => void;
  onRenameColumnClick?: (statusId: string, currentName: string) => void;
  onDeleteColumnClick?: (statusId: string, title: string) => void;
  isCompletedColumn?: boolean;
}

/**
 * Kanban Column Component - Renders tasks in a single status category.
 * Implements HTML5 dragover, dragenter, dragleave, and drop algorithms to route cards.
 * Includes per-column filtering by Priority and Assignee.
 */
export function Column({
  title,
  status,
  index,
  tasks,
  unreadCount,
  availableAssignees,
  onEdit,
  onView,
  onDelete,
  onClone,
  draggedTaskId,
  setDraggedTaskId,
  dropIndicator,
  setDropIndicator,
  onMoveTask,
  onCreateTaskInColumn,
  onRenameColumnClick,
  onDeleteColumnClick,
  isCompletedColumn,
}: ColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { hasPermission } = usePermissions();

  // Per-column filter state
  const [showFilters, setShowFilters] = useState(false);
  const [colFilterPriority, setColFilterPriority] = useState<string>('all');
  const [colFilterAssignee, setColFilterAssignee] = useState<string>('all');

  const hasColumnFilters = colFilterPriority !== 'all' || colFilterAssignee !== 'all';
  const activeFilterCount = (colFilterPriority !== 'all' ? 1 : 0) + (colFilterAssignee !== 'all' ? 1 : 0);

  // Dropdown menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter tasks locally within this column
  const displayedTasks = useMemo(() => {
    if (!hasColumnFilters) return tasks;
    return tasks.filter((task) => {
      const matchPriority = colFilterPriority === 'all' || task.priority === colFilterPriority;
      const matchAssignee = colFilterAssignee === 'all' || task.assignee === colFilterAssignee;
      return matchPriority && matchAssignee;
    });
  }, [tasks, colFilterPriority, colFilterAssignee, hasColumnFilters]);

  const handleClearColumnFilters = () => {
    setColFilterPriority('all');
    setColFilterAssignee('all');
  };

  // Curated modern color themes cycling dynamically based on column index
  const colorThemes = [
    {
      border: 'border-t-4 border-t-gray-400',
      dotBg: 'bg-gray-400',
      bgHeader: 'bg-gray-50 dark:bg-gray-900',
    },
    {
      border: 'border-t-4 border-t-amber-500',
      dotBg: 'bg-amber-500',
      bgHeader: 'bg-amber-50/30 dark:bg-amber-950/10',
    },
    {
      border: 'border-t-4 border-t-blue-500',
      dotBg: 'bg-blue-500',
      bgHeader: 'bg-blue-50/30 dark:bg-blue-950/10',
    },
    {
      border: 'border-t-4 border-t-emerald-500',
      dotBg: 'bg-emerald-500',
      bgHeader: 'bg-emerald-50/30 dark:bg-emerald-950/10',
    },
    {
      border: 'border-t-4 border-t-indigo-500',
      dotBg: 'bg-indigo-500',
      bgHeader: 'bg-indigo-50/30 dark:bg-indigo-950/10',
    },
    {
      border: 'border-t-4 border-t-rose-500',
      dotBg: 'bg-rose-500',
      bgHeader: 'bg-rose-50/30 dark:bg-rose-950/10',
    },
    {
      border: 'border-t-4 border-t-violet-500',
      dotBg: 'bg-violet-500',
      bgHeader: 'bg-violet-50/30 dark:bg-violet-950/10',
    },
    {
      border: 'border-t-4 border-t-cyan-500',
      dotBg: 'bg-cyan-500',
      bgHeader: 'bg-cyan-50/30 dark:bg-cyan-950/10',
    },
  ];

  const currentTheme = colorThemes[index % colorThemes.length];

  // Drag over column container
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only remove highlight if we leave the actual column container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragOver(false);
    }
  };

  // Drop on column container - appends card to the end if not dropped directly on a card
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const incomingTaskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!incomingTaskId) return;

    // Check if drop occurred on a specific card (which is handled by TaskCard)
    // If we're dropping in the empty area or general column body, move to the end
    onMoveTask(incomingTaskId, status);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`shrink-0 w-[320px] flex flex-col bg-gray-50/80 dark:bg-gray-900/40 rounded-xl border border-gray-200/60 dark:border-gray-800/80 transition-all duration-300 p-3 h-full max-h-[80vh] ${
        currentTheme.border
      } ${
        isDragOver
          ? 'bg-blue-50/30 dark:bg-blue-950/10 ring-2 ring-blue-500/20 border-blue-200 dark:border-blue-900 shadow-md scale-[1.005]'
          : ''
      }`}
    >
      {/* Column Header */}
      <div className={`flex items-center justify-between pb-2 mb-1 rounded-t-lg px-1`}>
        <div className="flex items-center gap-2">
          {/* Status Dot */}
          <span className={`w-2.5 h-2.5 rounded-full ${currentTheme.dotBg}`} />
          
          {/* Title */}
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm capitalize">
            {title}
          </h2>

          {/* Count Badge */}
          <span className="flex items-center justify-center bg-gray-200/80 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 text-xs font-bold leading-none select-none">
            {hasColumnFilters ? `${displayedTasks.length}/${tasks.length}` : tasks.length}
          </span>

          {/* Unread Count Badge */}
          {!!unreadCount && unreadCount > 0 && (
            <span className="flex items-center justify-center bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none select-none animate-pulse shadow-sm">
              {unreadCount}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Per-column filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-1 rounded transition-colors cursor-pointer ${
              showFilters || hasColumnFilters
                ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
            title="Filter tasks in this column"
          >
            <Filter size={14} />
            {/* Active filter count badge */}
            {hasColumnFilters && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onCreateTaskInColumn(status)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded transition-colors cursor-pointer"
            title={`Add task to ${title}`}
          >
            <Plus size={16} />
          </button>

          {/* Triple dot menu for Rename and Delete */}
          {(onRenameColumnClick || onDeleteColumnClick) && (hasPermission('task.column.update') || hasPermission('task.column.delete')) && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded transition-colors cursor-pointer"
                title="More actions"
              >
                <MoreHorizontal size={16} />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-1 flex flex-col">
                    {onRenameColumnClick && hasPermission('task.column.update') && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onRenameColumnClick(status, title);
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors"
                      >
                        <Edit2 size={14} className="text-gray-500" />
                        Rename
                      </button>
                    )}
                    {onDeleteColumnClick && hasPermission('task.column.delete') && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onDeleteColumnClick(status, title);
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors"
                      >
                        <Trash2 size={14} className="text-red-500" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Per-Column Filter Panel (collapsible) */}
      {showFilters && (
        <div className="mb-2 px-1 py-2 bg-white dark:bg-gray-800/80 rounded-lg border border-gray-200/80 dark:border-gray-700/60 space-y-2 animate-in">
          {/* Priority Filter */}
          <select
            value={colFilterPriority}
            onChange={(e) => setColFilterPriority(e.target.value)}
            className={`w-full px-2 py-1.5 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer dark:text-gray-200 transition-all ${
              colFilterPriority !== 'all'
                ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
            }`}
          >
            <option value="all">All Priorities</option>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={colFilterAssignee}
            onChange={(e) => setColFilterAssignee(e.target.value)}
            className={`w-full px-2 py-1.5 border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer dark:text-gray-200 transition-all ${
              colFilterAssignee !== 'all'
                ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
            }`}
          >
            <option value="all">All Assignees</option>
            {availableAssignees.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* Clear column filters */}
          {hasColumnFilters && (
            <button
              onClick={handleClearColumnFilters}
              className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-1 cursor-pointer transition-colors"
            >
              <X size={10} />
              Clear Column Filters
            </button>
          )}
        </div>
      )}

      {/* Active column filter chips (shown when panel is collapsed) */}
      {!showFilters && hasColumnFilters && (
        <div className="flex flex-wrap gap-1 mb-2 px-1">
          {colFilterPriority !== 'all' && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              colFilterPriority === 'high' ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800' :
              colFilterPriority === 'medium' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
              'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
            }`}>
              {colFilterPriority === 'high' ? '🔴' : colFilterPriority === 'medium' ? '🟡' : '🟢'} {colFilterPriority}
              <button onClick={() => setColFilterPriority('all')} className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 cursor-pointer">
                <X size={9} />
              </button>
            </span>
          )}
          {colFilterAssignee !== 'all' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 px-1.5 py-0.5 rounded-full">
              {colFilterAssignee.split(' ')[0]}
              <button onClick={() => setColFilterAssignee('all')} className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 cursor-pointer">
                <X size={9} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Column Body - Card list container */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 max-h-[calc(80vh-70px)] scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-800">
        {displayedTasks.length > 0 ? (
          displayedTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              onEdit={onEdit}
              onView={onView}
              onDelete={onDelete}
              onClone={onClone}
              draggedTaskId={draggedTaskId}
              setDraggedTaskId={setDraggedTaskId}
              dropIndicator={dropIndicator}
              setDropIndicator={setDropIndicator}
              onMoveTask={onMoveTask}
              isCompletedColumn={isCompletedColumn}
            />
          ))
        ) : tasks.length > 0 && hasColumnFilters ? (
          <EmptyState
            variant="filtered"
            columnTitle={title}
            onClearFilters={handleClearColumnFilters}
          />
        ) : (
          <EmptyState
            variant="empty"
            columnTitle={title}
            onCreateTask={() => onCreateTaskInColumn(status)}
          />
        )}
      </div>
    </div>
  );
}
