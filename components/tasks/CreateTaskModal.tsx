'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignee: string; // Name of assigned user
  status: string; // Generic string status to allow dynamic columns
  dueDate: string;
  estimatedHours?: number;
  actualHours?: number;
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignee: string;
  status: string; // Generic string status to allow dynamic columns
  dueDate: string;
  estimatedHours?: number;
  actualHours?: number;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  availableAssignees: string[];
  columns: { id: string; label: string }[]; // Dynamically passed columns
  editTask?: Task | null;
}

/**
 * Modal to Create or Edit a Task on the Kanban Board
 */
export function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  availableAssignees,
  columns,
  editTask,
}: CreateTaskModalProps) {
  const initialFormState: TaskFormData = {
    title: '',
    description: '',
    priority: 'medium',
    assignee: availableAssignees[0] || '',
    status: columns[0]?.id || 'todo',
    dueDate: new Date().toISOString().split('T')[0],
    estimatedHours: 0,
    actualHours: 0,
  };

  const [formData, setFormData] = useState<TaskFormData>(initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormData, string>>>({});

  // Reset form when editTask changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (editTask) {
          setFormData({
            title: editTask.title,
            description: editTask.description,
            priority: editTask.priority,
            assignee: editTask.assignee,
            status: editTask.status,
            dueDate: editTask.dueDate,
            estimatedHours: editTask.estimatedHours || 0,
            actualHours: editTask.actualHours || 0,
          });
        } else {
          setFormData({
            title: '',
            description: '',
            priority: 'medium',
            assignee: availableAssignees[0] || '',
            status: columns[0]?.id || 'todo',
            dueDate: new Date().toISOString().split('T')[0],
            estimatedHours: 0,
            actualHours: 0,
          });
        }
        setErrors({});
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, editTask, availableAssignees, columns]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Field validations
    const newErrors: Partial<Record<keyof TaskFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task Title is required';
    } else if (formData.title.length > 80) {
      newErrors.title = 'Title must be under 80 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.assignee) {
      newErrors.assignee = 'Assignee selection is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due Date is required';
    }

    if (formData.estimatedHours !== undefined && formData.estimatedHours < 0) {
      newErrors.estimatedHours = 'Cannot be negative';
    }

    if (formData.actualHours !== undefined && formData.actualHours < 0) {
      newErrors.actualHours = 'Cannot be negative';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData(initialFormState);
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editTask ? 'Edit Task' : 'Create Task'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-1">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="task-title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder="e.g. Implement user login API"
          />
          {errors.title && <p className="text-red-500 text-xs mt-1 font-medium">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="task-desc" className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="task-desc"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            placeholder="Provide a brief summary of the task details..."
          />
          {errors.description && (
            <p className="text-red-500 text-xs mt-1 font-medium">{errors.description}</p>
          )}
        </div>

        {/* Row for Priority & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Priority */}
          <div>
            <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority <span className="text-red-500">*</span>
            </label>
            <select
              id="task-priority"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })
              }
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="low">Low (Green)</option>
              <option value="medium">Medium (Yellow)</option>
              <option value="high">High (Red)</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="task-status" className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="task-status"
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value,
                })
              }
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              {columns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row for Assignee & Due Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Assignee */}
          <div>
            <label htmlFor="task-assignee" className="block text-sm font-medium text-gray-700 mb-1">
              Assign User <span className="text-red-500">*</span>
            </label>
            <select
              id="task-assignee"
              value={formData.assignee}
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              {availableAssignees.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {errors.assignee && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.assignee}</p>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="task-due" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="task-due"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            />
            {errors.dueDate && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.dueDate}</p>
            )}
          </div>
        </div>

        {/* Row for Estimated & Actual Hours */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Estimated Hours */}
          <div>
            <label htmlFor="task-est-hours" className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Hours
            </label>
            <input
              type="text"
              inputMode="decimal"
              id="task-est-hours"
              value={formData.estimatedHours || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                  setFormData({ ...formData, estimatedHours: val === '' ? 0 : parseFloat(val) || 0 });
                }
              }}
              placeholder="0"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {errors.estimatedHours && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.estimatedHours}</p>
            )}
          </div>

          {/* Actual Hours */}
          <div>
            <label htmlFor="task-act-hours" className="block text-sm font-medium text-gray-700 mb-1">
              Actual Hours
            </label>
            <input
              type="text"
              inputMode="decimal"
              id="task-act-hours"
              value={formData.actualHours || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                  setFormData({ ...formData, actualHours: val === '' ? 0 : parseFloat(val) || 0 });
                }
              }}
              placeholder="0"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {errors.actualHours && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.actualHours}</p>
            )}
          </div>
        </div>

        {/* Form Controls */}
        <div className="flex gap-3 pt-5 border-t border-gray-100 mt-6">
          <Button type="button" variant="secondary" onClick={handleClose} fullWidth>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth>
            {editTask ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
