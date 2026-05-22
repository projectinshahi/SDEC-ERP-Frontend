'use client';

import React, { useState } from 'react';
import { Plus, FolderOpen, MoreHorizontal, Trash2 } from 'lucide-react';
import { TaskCard } from './TaskCard';
import type { Task } from './CreateTaskModal';

interface ColumnProps {
  title: string;
  status: string; // Dynamic string status
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  draggedTaskId: string | null;
  setDraggedTaskId: (id: string | null) => void;
  dropIndicator: { taskId: string; position: 'before' | 'after' } | null;
  setDropIndicator: (val: { taskId: string; position: 'before' | 'after' } | null) => void;
  onMoveTask: (taskId: string, targetStatus: string, targetIndex?: number) => void;
  onCreateTaskInColumn: (status: string) => void;
  onRenameColumnClick?: (statusId: string, currentName: string) => void;
  onDeleteColumnClick?: (statusId: string, title: string) => void;
}

/**
 * Kanban Column Component - Renders tasks in a single status category.
 * Implements HTML5 dragover, dragenter, dragleave, and drop algorithms to route cards.
 */
export function Column({
  title,
  status,
  tasks,
  onEdit,
  onDelete,
  draggedTaskId,
  setDraggedTaskId,
  dropIndicator,
  setDropIndicator,
  onMoveTask,
  onCreateTaskInColumn,
  onRenameColumnClick,
  onDeleteColumnClick,
}: ColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  // Styling maps based on column status
  const themeMap: Record<string, { border: string; dotBg: string; bgHeader: string }> = {
    todo: {
      border: 'border-t-4 border-t-gray-400',
      dotBg: 'bg-gray-400',
      bgHeader: 'bg-gray-50 dark:bg-gray-900',
    },
    'in-progress': {
      border: 'border-t-4 border-t-amber-500',
      dotBg: 'bg-amber-500',
      bgHeader: 'bg-amber-50/30 dark:bg-amber-950/10',
    },
    review: {
      border: 'border-t-4 border-t-blue-500',
      dotBg: 'bg-blue-500',
      bgHeader: 'bg-blue-50/30 dark:bg-blue-950/10',
    },
    done: {
      border: 'border-t-4 border-t-emerald-500',
      dotBg: 'bg-emerald-500',
      bgHeader: 'bg-emerald-50/30 dark:bg-emerald-950/10',
    },
  };

  // Safe fallback theme for dynamically added columns
  const currentTheme = themeMap[status] || {
    border: 'border-t-4 border-t-indigo-500',
    dotBg: 'bg-indigo-500',
    bgHeader: 'bg-indigo-50/30 dark:bg-indigo-950/10',
  };

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
      className={`flex-1 min-w-[280px] max-w-[340px] flex flex-col bg-gray-50/80 dark:bg-gray-900/40 rounded-xl border border-gray-200/60 dark:border-gray-800/80 transition-all duration-300 p-3 h-full max-h-[80vh] ${
        currentTheme.border
      } ${
        isDragOver
          ? 'bg-blue-50/30 dark:bg-blue-950/10 ring-2 ring-blue-500/20 border-blue-200 dark:border-blue-900 shadow-md scale-[1.005]'
          : ''
      }`}
    >
      {/* Column Header */}
      <div className={`flex items-center justify-between pb-3 mb-2 rounded-t-lg px-1`}>
        <div className="flex items-center gap-2">
          {/* Status Dot */}
          <span className={`w-2.5 h-2.5 rounded-full ${currentTheme.dotBg}`} />
          
          {/* Title */}
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm capitalize">
            {title}
          </h2>

          {/* Count Badge */}
          <span className="flex items-center justify-center bg-gray-200/80 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 text-xs font-bold leading-none select-none">
            {tasks.length}
          </span>
        </div>

        {/* Actions (Create Task directly in status, Rename, and Delete options) */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCreateTaskInColumn(status)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded transition-colors cursor-pointer"
            title={`Add task to ${title}`}
          >
            <Plus size={16} />
          </button>
          
          {onRenameColumnClick && (
            <button
              onClick={() => onRenameColumnClick(status, title)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded transition-colors cursor-pointer"
              title="Rename Column"
            >
              <MoreHorizontal size={16} />
            </button>
          )}

          {onDeleteColumnClick && (
            <button
              onClick={() => onDeleteColumnClick(status, title)}
              className="p-1 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 text-gray-400 rounded transition-colors cursor-pointer"
              title="Delete Column"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Column Body - Card list container */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 max-h-[calc(80vh-70px)] scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-800">
        {tasks.length > 0 ? (
          tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              onEdit={onEdit}
              onDelete={onDelete}
              draggedTaskId={draggedTaskId}
              setDraggedTaskId={setDraggedTaskId}
              dropIndicator={dropIndicator}
              setDropIndicator={setDropIndicator}
              onMoveTask={onMoveTask}
            />
          ))
        ) : (
          /* Column Empty State Layout */
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center my-1 select-none transition-colors group">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <FolderOpen size={20} className="text-gray-400 dark:text-gray-600" />
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Empty Column</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 max-w-[140px] leading-relaxed">
              Drag tasks here, or click &quot;+&quot; above to create one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
