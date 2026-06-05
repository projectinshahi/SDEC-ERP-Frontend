'use client';

import { Calendar, User, Flag, CheckCircle, FileIcon, Download, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Task } from './CreateTaskModal';
import { Modal } from '@/components/Modal';
import { TaskDiscussionPanel } from './TaskDiscussionPanel';
import { useAuth } from '@/lib/hooks/useAuth';

const MDEditor = dynamic(() => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown), { ssr: false });

interface TaskDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit: () => void;
  canEdit: boolean;
}

export function TaskDetailsDrawer({ isOpen, onClose, task, onEdit, canEdit }: TaskDetailsDrawerProps) {
  const { user } = useAuth();
  if (!task) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      size="xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Task Information */}
        <div className="space-y-6 lg:border-r lg:border-gray-100 lg:pr-6">
          {/* Meta Information */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 w-20">Status</span>
              <span className="font-medium text-gray-900 capitalize px-2.5 py-0.5 bg-gray-100 rounded-full">{task.status}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 w-20">Assignee</span>
              <span className="font-medium text-gray-900">{task.assignee || 'Unassigned'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Flag className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 w-20">Priority</span>
              <span className={`font-medium capitalize ${
                task.priority === 'high' ? 'text-red-600' :
                task.priority === 'medium' ? 'text-orange-500' :
                'text-green-600'
              }`}>{task.priority}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 w-20">Due Date</span>
              <span className="font-medium text-gray-900">{task.dueDate}</span>
            </div>
            {task.storyPoints !== undefined && (
              <div className="flex items-center gap-3 text-sm col-span-2">
                <span className="text-blue-500 bg-blue-50 px-2 py-0.5 rounded text-xs font-semibold w-8 text-center">{task.storyPoints}</span>
                <span className="text-gray-500">Story Points</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
            <div className="prose prose-sm max-w-none text-gray-600 bg-gray-50/50 p-4 rounded-lg border border-gray-100" data-color-mode="light">
              {task.description ? (
                <MDEditor source={task.description} className="!bg-transparent !text-gray-700" />
              ) : (
                <p className="italic text-gray-400">No description provided.</p>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
              Attachments
              <span className="bg-gray-100 text-gray-600 text-xs py-0.5 px-2 rounded-full font-medium">
                {task.attachments?.length || 0}
              </span>
            </h3>
            
            {task.attachments && task.attachments.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3">
                {task.attachments.map((att) => (
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
                        <span className="text-sm font-medium text-gray-900 truncate" title={att.file_name}>
                          {att.file_name}
                        </span>
                        <span className="text-xs text-gray-500 truncate">
                          {(att.file_size / 1024).toFixed(1)} KB • {att.uploader?.name || 'Unknown'}
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
              </div>
            )}
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Edit Task
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Task Discussion */}
        <div className="h-[600px] lg:h-auto">
          <TaskDiscussionPanel taskId={task.id} currentUserId={user?.id ? Number(user.id) : undefined} />
        </div>
      </div>
    </Modal>
  );
}
