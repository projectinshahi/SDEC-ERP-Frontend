'use client';

import React from 'react';
import { Calendar, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { truncate, formatDate } from '@/lib/utils';
import type { Task } from './CreateTaskModal';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  draggedTaskId: string | null;
  setDraggedTaskId: (id: string | null) => void;
  dropIndicator: { taskId: string; position: 'before' | 'after' } | null;
  setDropIndicator: (val: { taskId: string; position: 'before' | 'after' } | null) => void;
  onMoveTask: (taskId: string, targetStatus: Task['status'], targetIndex?: number) => void;
  index: number;
}

/**
 * Generates consistent background tailwind class and initials from user's name
 */
function getUserAvatarDetails(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
  
  // Pick stable color based on name string hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    'bg-blue-500 text-white',
    'bg-purple-500 text-white',
    'bg-indigo-500 text-white',
    'bg-pink-500 text-white',
    'bg-teal-500 text-white',
    'bg-orange-500 text-white',
    'bg-emerald-500 text-white',
  ];
  
  const colorClass = colors[Math.abs(hash) % colors.length];
  return { initials, colorClass };
}

/**
 * TaskCard Component - Represents an individual task card inside a Kanban Column.
 * Implements HTML5 drag start, end, and hover algorithms for exact reordering.
 */
export function TaskCard({
  task,
  onEdit,
  onDelete,
  draggedTaskId,
  setDraggedTaskId,
  dropIndicator,
  setDropIndicator,
  onMoveTask,
  index,
}: TaskCardProps) {
  const isDragging = draggedTaskId === task.id;
  const { initials, colorClass } = getUserAvatarDetails(task.assignee);

  const getPriorityVariant = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      default:
        return 'success';
    }
  };

  // Drag start handler
  const handleDragStart = (e: React.DragEvent) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.setData('text/plain', task.id);
    // Visual drag feedback
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drag end handler
  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDropIndicator(null);
  };

  // Drag over card - calculate whether mouse is in top or bottom half of the card
  const handleDragOver = (e: React.DragEvent) => {
    if (draggedTaskId === task.id) return; // Can't drop on itself
    
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const threshold = rect.height / 2;
    const position = mouseY < threshold ? 'before' : 'after';

    // Avoid redundant state updates
    if (!dropIndicator || dropIndicator.taskId !== task.id || dropIndicator.position !== position) {
      setDropIndicator({ taskId: task.id, position });
    }
  };

  const handleDragLeave = () => {
    if (dropIndicator?.taskId === task.id) {
      setDropIndicator(null);
    }
  };

  // Drop on card - trigger move to specific index
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const incomingTaskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!incomingTaskId || incomingTaskId === task.id) {
      setDropIndicator(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const threshold = rect.height / 2;
    
    // Determine final placement index in the current column
    let targetIndex = index;
    if (mouseY >= threshold) {
      targetIndex = index + 1; // Insert after this card
    }

    onMoveTask(incomingTaskId, task.status, targetIndex);
    setDropIndicator(null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative py-1 transition-all duration-200"
    >
      {/* Top Drop Indicator Line */}
      {dropIndicator && dropIndicator.taskId === task.id && dropIndicator.position === 'before' && (
        <div className="h-1 bg-blue-500 rounded-full my-1 animate-pulse" />
      )}

      {/* Main Card Content */}
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 ${
          isDragging ? 'opacity-40 scale-[0.97] border-dashed border-2 border-blue-400 bg-blue-50/10' : ''
        }`}
      >
        {/* Card Header (Drag handle, Title, Action buttons) */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-snug group-hover:text-blue-600 transition-colors flex-1 break-words">
            {task.title}
          </h3>

          {/* Hover Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 pl-1">
            <button
              onClick={() => onEdit(task)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600 rounded transition-colors"
              title="Edit Task"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-500 hover:text-red-600 rounded transition-colors"
              title="Delete Task"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Short Description Preview */}
        <p className="text-gray-500 dark:text-gray-400 text-xs mb-4 line-clamp-2 leading-relaxed break-words">
          {truncate(task.description, 110)}
        </p>

        {/* Card Footer Details */}
        <div className="flex items-center justify-between mt-auto gap-2">
          {/* Priority badge */}
          <Badge variant={getPriorityVariant(task.priority)} className="capitalize text-[10px] px-2 py-0.5 font-bold">
            {task.priority}
          </Badge>

          {/* Assignee & Due Date */}
          <div className="flex items-center gap-2">
            {/* Due date */}
            <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              <Calendar size={12} className="text-gray-400" />
              <span>{formatDate(task.dueDate)}</span>
            </div>

            {/* User Avatar Initials */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm select-none shrink-0 ${colorClass}`}
              title={`Assigned to ${task.assignee}`}
            >
              {initials}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Drop Indicator Line */}
      {dropIndicator && dropIndicator.taskId === task.id && dropIndicator.position === 'after' && (
        <div className="h-1 bg-blue-500 rounded-full my-1 animate-pulse" />
      )}
    </div>
  );
}
