'use client';

import React from 'react';
import { Calendar, Edit, Trash2, AlertTriangle, Clock, Copy, GitMerge, Paperclip } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { truncate, formatDate } from '@/lib/utils';
import type { Task } from './CreateTaskModal';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onView: (task: Task) => void;
  onDelete: (id: string) => void;
  onClone?: (id: string) => void;
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

type DueStatus = 'overdue' | 'due-today' | 'normal';

/**
 * Determines due date status by comparing YYYY-MM-DD strings.
 * Timezone-safe: uses local date for both sides.
 */
function getDueStatus(dueDate: string): DueStatus {
  if (!dueDate) return 'normal';
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dueDateStr = dueDate.split('T')[0]; // normalize ISO strings
  if (dueDateStr < todayStr) return 'overdue';
  if (dueDateStr === todayStr) return 'due-today';
  return 'normal';
}

/**
 * TaskCard Component - Represents an individual task card inside a Kanban Column.
 * Implements HTML5 drag start, end, and hover algorithms for exact reordering.
 */
export function TaskCard({
  task,
  onEdit,
  onView,
  onDelete,
  onClone,
  draggedTaskId,
  setDraggedTaskId,
  dropIndicator,
  setDropIndicator,
  onMoveTask,
  index,
}: TaskCardProps) {
  const { hasPermission } = usePermissions();
  const isDragging = draggedTaskId === task.id;
  const { initials, colorClass } = getUserAvatarDetails(task.assignee);
  const dueStatus = getDueStatus(task.dueDate);

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
        onClick={() => onView(task)}
        aria-label={
          dueStatus === 'overdue' ? 'Overdue task' :
          dueStatus === 'due-today' ? 'Task due today' : undefined
        }
        className={`group rounded-lg shadow-sm p-4 transition-all duration-200 cursor-pointer hover:shadow-md ${
          isDragging
            ? 'opacity-40 scale-[0.97] border-dashed border-2 border-blue-400 bg-blue-50/10'
            : dueStatus === 'overdue'
              ? 'border-l-4 border-l-red-600 border border-red-300 dark:border-red-700/60 bg-red-100 dark:bg-red-950/40 hover:border-red-400 dark:hover:border-red-600'
              : dueStatus === 'due-today'
                ? 'border-l-4 border-l-amber-500 border border-amber-300 dark:border-amber-700/60 bg-amber-100 dark:bg-amber-950/30 hover:border-amber-400 dark:hover:border-amber-600'
                : 'border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600'
        }`}
      >
        {/* Card Header (Drag handle, Title, Action buttons) */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-col flex-1 min-w-0">
            {task.originTaskId && (
              <div 
                className="flex items-center gap-1 group/copy cursor-pointer w-fit mb-0.5"
                title="Copy Task ID"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(task.originTaskId || '');
                  // Optional: we could add a toast here, but simple copy is fine
                }}
              >
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-wider group-hover/copy:text-blue-500 transition-colors">
                  {task.originTaskId}
                </span>
                <Copy size={10} className="text-gray-400 opacity-0 group-hover/copy:opacity-100 group-hover/copy:text-blue-500 transition-all" />
              </div>
            )}
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-snug group-hover:text-blue-600 transition-colors break-words flex items-center gap-2">
              {task.title}
              {!!task.unreadCount && task.unreadCount > 0 && (
                <span className="inline-flex items-center justify-center bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none select-none animate-pulse shadow-sm">
                  {task.unreadCount}
                </span>
              )}
            </h3>
          </div>

          {/* Hover Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 pl-1">
            {hasPermission('task.update') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600 rounded transition-colors"
                title="Edit Task"
              >
                <Edit size={14} />
              </button>
            )}
            {hasPermission('task.delete') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-500 hover:text-red-600 rounded transition-colors"
                title="Delete Task"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Short Description Preview */}
        <p className="text-gray-500 dark:text-gray-400 text-xs mb-4 line-clamp-2 leading-relaxed break-words">
          {truncate(task.description, 110)}
        </p>

        {/* Card Footer Details */}
        <div className="flex items-center justify-between mt-auto gap-2">
          {/* Priority badge */}
          <div className="flex items-center gap-2">
            <Badge variant={getPriorityVariant(task.priority)} className="capitalize text-[10px] px-2 py-0.5 font-bold">
              {task.priority}
            </Badge>
            {task.storyPoints !== undefined && task.storyPoints > 0 && (
              <Badge variant="default" className="text-[10px] px-2 py-0.5 font-bold bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                {task.storyPoints} {task.storyPoints === 1 ? 'pt' : 'pts'}
              </Badge>
            )}
            {task.attachments && task.attachments.length > 0 && (
              <div className="flex items-center gap-1 text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-medium" title={`${task.attachments.length} attachment(s)`}>
                <Paperclip size={10} />
                <span>{task.attachments.length}</span>
              </div>
            )}
          </div>

          {/* Assignee & Due Date */}
          <div className="flex items-center gap-2">
            {/* Due date with status indicator */}
            <div className={`flex items-center gap-1 text-[11px] font-medium ${
              dueStatus === 'overdue'
                ? 'text-red-600 dark:text-red-400'
                : dueStatus === 'due-today'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-500 dark:text-gray-400'
            }`}>
              {dueStatus === 'overdue' ? (
                <AlertTriangle size={12} className="text-red-500 animate-pulse" />
              ) : dueStatus === 'due-today' ? (
                <Clock size={12} className="text-amber-500" />
              ) : (
                <Calendar size={12} className="text-gray-400" />
              )}
              <span>{formatDate(task.dueDate)}</span>
              {dueStatus === 'overdue' && (
                <span className="ml-1 text-[9px] font-bold uppercase bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full leading-none">
                  Overdue
                </span>
              )}
              {dueStatus === 'due-today' && (
                <span className="ml-1 text-[9px] font-bold uppercase bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full leading-none">
                  Today
                </span>
              )}
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
