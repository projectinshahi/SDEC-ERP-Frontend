'use client';

import { useState, useEffect, useRef } from 'react';

import { Calendar, User, Flag, CheckCircle, FileIcon, Download, AlertCircle, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Task } from './CreateTaskModal';
import { Modal } from '@/components/Modal';
import { TaskDiscussionPanel } from './TaskDiscussionPanel';
import { useAuth } from '@/lib/hooks/useAuth';
import { uploadTaskAttachment } from '@/lib/api/kanban';

const MarkdownViewer = dynamic(() => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown), { ssr: false });
const MarkdownEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

import { InlineEditableText } from '../ui/InlineEditableText';
import { InlineSelect } from '../ui/InlineSelect';
import { InlineDatePicker } from '../ui/InlineDatePicker';

interface TaskDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit: () => void;
  canEdit: boolean;
  columns?: { id: string; label: string }[];
  onStatusChange?: (taskId: string, newStatus: string) => void;
  availableAssignees?: string[];
  boards?: any[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
}

export function TaskDetailsDrawer({ isOpen, onClose, task, onEdit, canEdit, columns = [], onStatusChange, availableAssignees = [], boards = [], onTaskUpdate }: TaskDetailsDrawerProps) {
  const { user } = useAuth();
  
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(task?.description || '');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const [localAttachments, setLocalAttachments] = useState<any[]>(task?.attachments || []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (task) {
      setDescriptionValue(task.description || '');
      setIsEditingDescription(false);
      setLocalAttachments(task.attachments || []);
    }
  }, [task?.id, task?.description, task?.attachments]);

  const handleAttachmentDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canEdit && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!task || !files || files.length === 0) return;
    try {
      setIsUploading(true);
      const formData = new FormData();
      Array.from(files).forEach(file => formData.append('files', file));
      const response = await uploadTaskAttachment(task.id, formData);
      if (response && response.attachments) {
        setLocalAttachments(prev => [...prev, ...response.attachments]);
        if (onTaskUpdate) {
          // Keep a shallow copy of task and overwrite attachments so parent state knows.
          onTaskUpdate(task.id, { attachments: [...localAttachments, ...response.attachments] } as any);
        }
      }
    } catch (err) {
      console.error('Failed to upload attachment', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  if (!task) return null;

  const handleDoubleClickDescription = () => {
    if (canEdit && onTaskUpdate) {
      setIsEditingDescription(true);
    }
  };

  const handleDescriptionChange = (val: string | undefined) => {
    const newVal = val || '';
    setDescriptionValue(newVal);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      if (onTaskUpdate && task) {
        onTaskUpdate(task.id, { description: newVal });
        setIsEditingDescription(false);
      }
    }, 5000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <InlineEditableText
            value={task.title}
            onSave={(val) => onTaskUpdate?.(task.id, { title: val })}
            permission={canEdit}
            textClassName="text-xl font-bold"
            inputClassName="text-xl font-bold"
          />
        </div>
      }
      size="xl"
    >
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:h-[80vh] lg:max-h-[800px] lg:overflow-hidden">
        {/* Left Side: Task Information */}
        <div className="space-y-6 lg:border-r lg:border-gray-100 lg:pr-6 lg:overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 lg:h-full pb-4">
          {/* Meta Information */}
          <div className="flex flex-col gap-y-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            {/* Board / Sprint */}
            {boards && boards.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="w-4 h-4 shrink-0 text-gray-400 flex items-center justify-center border border-gray-400 rounded-sm text-[10px] font-bold">B</span>
                <span className="text-gray-500 w-20 shrink-0">Board</span>
                <InlineSelect
                  value={task.boardId?.toString() || ''}
                  options={boards.map(b => ({ label: b.name || `Board ${b.id}`, value: b.id.toString() }))}
                  onSave={(val) => onTaskUpdate?.(task.id, { boardId: parseInt(val) })}
                  permission={canEdit}
                />
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-500 w-20 shrink-0">Status</span>
              <InlineSelect
                value={task.status}
                options={columns.map(c => ({ label: c.label, value: c.id }))}
                onSave={(val) => onStatusChange?.(task.id, val)}
                permission={canEdit && columns.length > 0}
              />
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-500 w-20 shrink-0">Assignee</span>
              <InlineSelect
                value={task.assignee || ''}
                options={[
                  { label: 'Unassigned', value: '' },
                  ...(task.assignee && !availableAssignees.includes(task.assignee) 
                    ? [{ label: task.assignee, value: task.assignee }] 
                    : []),
                  ...availableAssignees.map(a => ({ label: a, value: a }))
                ]}
                onSave={(val) => onTaskUpdate?.(task.id, { assignee: val })}
                permission={canEdit && availableAssignees.length > 0}
              />
            </div>

            {/* Priority */}
            <div className="flex items-center gap-2 text-sm">
              <Flag className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-500 w-20 shrink-0">Priority</span>
              <InlineSelect
                value={task.priority}
                options={[
                  { label: 'High', value: 'high', colorClass: 'text-red-600 dark:text-red-400' },
                  { label: 'Medium', value: 'medium', colorClass: 'text-orange-500 dark:text-orange-400' },
                  { label: 'Low', value: 'low', colorClass: 'text-green-600 dark:text-green-400' }
                ]}
                onSave={(val) => onTaskUpdate?.(task.id, { priority: val as Task['priority'] })}
                permission={canEdit}
              />
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-500 w-20 shrink-0">Due Date</span>
              <InlineDatePicker
                value={task.dueDate}
                onSave={(val) => onTaskUpdate?.(task.id, { dueDate: val || undefined })}
                permission={canEdit}
              />
            </div>

            {/* Story Points */}
            {task.storyPoints !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <span className="w-4 h-4 shrink-0 text-gray-400 flex items-center justify-center text-[10px] font-bold border border-gray-400 rounded-full">SP</span>
                <span className="text-gray-500 w-20 shrink-0">Points</span>
                {canEdit && onTaskUpdate ? (
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={task.storyPoints ? task.storyPoints : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onTaskUpdate(task.id, { storyPoints: val === '' ? 0 : parseFloat(val) });
                    }}
                    className="flex-1 min-w-0 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md text-sm font-semibold text-left border-none focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
                  />
                ) : (
                  <span className="flex-1 min-w-0 text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md text-sm font-semibold truncate">{task.storyPoints}</span>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
              Description
            </h3>
            <InlineEditableText
              value={task.description || ''}
              onSave={(val) => onTaskUpdate?.(task.id, { description: val })}
              permission={canEdit}
              type="textarea"
              placeholder="Add a description..."
            />
          </div>

          {/* Attachments */}
          <div 
            onDoubleClick={handleAttachmentDoubleClick} 
            className={`relative rounded-lg p-2 -mx-2 transition-colors ${canEdit ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer' : ''}`}
            title={canEdit ? 'Double click to upload attachments' : ''}
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              Attachments
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs py-0.5 px-2 rounded-full font-medium">
                {localAttachments.length}
              </span>
              {isUploading && <Loader2 size={14} className="animate-spin text-blue-500 ml-2" />}
            </h3>
            
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              onClick={(e) => e.stopPropagation()} 
            />

            {localAttachments.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3">
                {localAttachments.map((att) => (
                  <li key={att.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {att.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || att.file_url.includes('image/upload') ? (
                        <div className="w-10 h-10 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                          <img src={att.file_url.startsWith('http') ? att.file_url : process.env.NEXT_PUBLIC_API_URL + att.file_url} alt={att.file_name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 flex-shrink-0 bg-gray-50 flex items-center justify-center rounded-md border border-gray-200">
                          <FileIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={att.description || att.file_name}>
                          {att.description || att.file_name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {att.description ? att.file_name + ' • ' : ''}{(att.file_size / 1024).toFixed(1)} KB • {att.uploader?.name || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <a
                      href={att.file_url.startsWith('http') ? att.file_url : process.env.NEXT_PUBLIC_API_URL + att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 px-4 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <AlertCircle className="w-6 h-6 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">No attachments</p>
                {canEdit && <p className="text-xs text-gray-400 mt-1">Double click to upload</p>}
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Task Discussion */}
        <div className="h-[500px] lg:h-full flex flex-col min-h-0">
          <TaskDiscussionPanel taskId={task.id} currentUserId={user?.id ? Number(user.id) : undefined} />
        </div>
      </div>
    </Modal>
  );
}
