'use client';

import React from 'react';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';
import { Clock, Calendar, AlignLeft, User } from 'lucide-react';
import type { Task } from './CreateTaskModal';
import { formatDate } from '@/lib/utils';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

export function TaskDetailsModal({ isOpen, onClose, task }: TaskDetailsModalProps) {
  if (!task) return null;

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Task Details"
      size="md"
    >
      <div className="space-y-6">
        {/* Title and Priority */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{task.title}</h2>
            <Badge variant={getPriorityVariant(task.priority)} className="capitalize px-2.5 py-1">
              {task.priority} Priority
            </Badge>
          </div>
          <div className="flex items-center gap-3 self-start">
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-md capitalize font-medium">
              Status: {task.status.replace('-', ' ')}
            </span>
            {task.originTaskId && (
              <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs px-2 py-1 rounded-md font-mono font-medium flex items-center gap-1 border border-blue-100 dark:border-blue-800/50">
                ID: {task.originTaskId}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-2">
            <AlignLeft size={16} />
            Description
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-lg border border-gray-100 dark:border-gray-700/50">
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
              {task.description || <span className="italic text-gray-400">No description provided.</span>}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Assignee */}
          <div className="flex flex-col p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50">
            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <User size={14} /> Assignee
            </span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {task.assignee || 'Unassigned'}
            </span>
          </div>

          {/* Due Date */}
          <div className="flex flex-col p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50">
            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Calendar size={14} /> Due Date
            </span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
            </span>
          </div>

          {/* Estimated Hours */}
          <div className="flex flex-col p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-800/30">
            <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 mb-1">
              <Clock size={14} /> Estimated Hours
            </span>
            <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              {task.estimatedHours || 0} hrs
            </span>
          </div>

          {/* Actual Hours */}
          <div className="flex flex-col p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100/50 dark:border-emerald-800/30">
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mb-1">
              <Clock size={14} /> Actual Hours
            </span>
            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              {task.actualHours || 0} hrs
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
