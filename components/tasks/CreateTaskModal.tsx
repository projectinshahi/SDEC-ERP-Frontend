'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import dynamic from 'next/dynamic';
import { useDropzone } from 'react-dropzone';
import { TaskAttachment, uploadTaskAttachment, deleteTaskAttachment } from '@/lib/api/kanban';
import { X, UploadCloud, FileIcon, Loader2, Paperclip } from 'lucide-react';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignee: string; // Name of assigned user
  status: string; // Generic string status to allow dynamic columns
  dueDate: string;
  storyPoints?: number;
  originTaskId?: string;
  attachments?: TaskAttachment[];
  unreadCount?: number;
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignee: string;
  status: string; // Generic string status to allow dynamic columns
  dueDate: string;
  storyPoints?: number;
  originTaskId?: string;
  pendingFiles?: File[];
  attachments?: TaskAttachment[];
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
    storyPoints: 0,
  };

  const [formData, setFormData] = useState<TaskFormData>(initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormData, string>>>({});
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

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
            storyPoints: editTask.storyPoints || 0,
            originTaskId: editTask.originTaskId,
          });
          setAttachments(editTask.attachments || []);
        } else {
          setFormData({
            title: '',
            description: '',
            priority: 'medium',
            assignee: availableAssignees[0] || '',
            status: columns[0]?.id || 'todo',
            dueDate: new Date().toISOString().split('T')[0],
            storyPoints: 0,
          });
          setAttachments([]);
        }
        setErrors({});
        setUploadingFiles([]);
        setPendingFiles([]);
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

    if (formData.storyPoints !== undefined && formData.storyPoints < 0) {
      newErrors.storyPoints = 'Cannot be negative';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({ ...formData, pendingFiles, attachments });
    handleClose();
  };

  const handleClose = () => {
    setFormData(initialFormState);
    setErrors({});
    setAttachments([]);
    setUploadingFiles([]);
    setPendingFiles([]);
    onClose();
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!editTask || !editTask.id) {
      setPendingFiles((prev) => [...prev, ...acceptedFiles]);
      return;
    }
    
    for (const file of acceptedFiles) {
      setUploadingFiles((prev) => [...prev, file.name]);
      
      const form = new FormData();
      form.append('files', file);
      
      try {
        const res = await uploadTaskAttachment(editTask.id, form);
        if (res.success && res.attachments) {
          setAttachments((prev) => [...prev, ...res.attachments]);
        }
      } catch (err) {
        console.error('Failed to upload file:', file.name, err);
      } finally {
        setUploadingFiles((prev) => prev.filter(name => name !== file.name));
      }
    }
  }, [editTask]);

  const { getRootProps, getInputProps, open } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': [],
      'application/pdf': []
    },
    maxSize: 50 * 1024 * 1024,
    noClick: true,
    noKeyboard: true
  });

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!editTask || !editTask.id) return;
    try {
      await deleteTaskAttachment(editTask.id, attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      console.error('Failed to delete attachment', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editTask ? 'Edit Task' : 'Create Task'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Read-Only Task ID (Only shown during edit) */}
        {editTask && editTask.id && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task ID
            </label>
            <div className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500 font-mono flex items-center justify-between cursor-not-allowed">
              <span className={!editTask.originTaskId ? 'italic opacity-60' : ''}>
                {editTask.originTaskId || 'N/A (Legacy Task)'}
              </span>
              <span className="text-xs text-gray-400 font-sans tracking-wide uppercase px-2 py-0.5 bg-gray-200/50 rounded-md">
                {editTask.originTaskId ? 'Auto-generated' : 'Not Available'}
              </span>
            </div>
          </div>
        )}

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

        {/* Description & Attachments Button */}
        <div data-color-mode="light">
          <div className="flex items-end justify-between mb-1">
            <label htmlFor="task-desc" className="block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              <button 
                type="button" 
                onClick={open} 
                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
              >
                <Paperclip size={14} /> Add Attachment
              </button>
            </div>
          </div>
          <MDEditor
            value={formData.description}
            onChange={(val) => setFormData({ ...formData, description: val || '' })}
            preview="edit"
            height={200}
            className="w-full"
          />
          {errors.description && (
            <p className="text-red-500 text-xs mt-1 font-medium">{errors.description}</p>
          )}

          {/* Uploading Files Indicator */}
            {uploadingFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadingFiles.map(name => (
                  <div key={name} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                    <Loader2 className="animate-spin w-4 h-4 text-blue-500" />
                    <span>Uploading {name}...</span>
                  </div>
                ))}
              </div>
            )}

            {/* Existing Attachments List */}
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {att.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || att.file_url.includes('image/upload') ? (
                        <img src={att.file_url.startsWith('http') ? att.file_url : process.env.NEXT_PUBLIC_API_URL + att.file_url} alt={att.file_name} className="w-10 h-10 object-cover rounded-md border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 flex items-center justify-center rounded-md border border-gray-200">
                          <FileIcon className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div className="truncate">
                        <a href={att.file_url.startsWith('http') ? att.file_url : process.env.NEXT_PUBLIC_API_URL + att.file_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-600 hover:underline truncate block">
                          {att.description || att.file_name}
                        </a>
                        <span className="text-xs text-gray-500">{att.description ? att.file_name + ' • ' : ''}{(att.file_size / 1024).toFixed(1)} KB • by {att.uploader?.name || 'Unknown'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove attachment"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pending Files List (Before task is created) */}
            {pendingFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {pendingFiles.map((file, idx) => (
                  <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-10 h-10 object-cover rounded-md border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 flex items-center justify-center rounded-md border border-gray-200">
                          <FileIcon className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div className="truncate">
                        <span className="text-sm font-medium text-gray-800 truncate block">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB • Pending upload</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
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

        {/* Row for Story Points */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="task-story-points" className="block text-sm font-medium text-gray-700 mb-1">
              Story Points
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              id="task-story-points"
              value={formData.storyPoints === 0 ? '' : formData.storyPoints ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, storyPoints: val === '' ? 0 : parseFloat(val) });
              }}
              placeholder="0"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {errors.storyPoints && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.storyPoints}</p>
            )}
          </div>
        </div>

        {/* Attachments Section used to be here, moved up */}

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
