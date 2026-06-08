'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { Bug as BugIcon, AlertTriangle, FileText, User, X } from 'lucide-react';
import { FileUploader, QueuedFile } from './FileUploader';
import type { Bug, BugAttachment } from '@/lib/api/bugs';
import type { UserDbResponse } from '@/lib/api/users';
import { fetchBugAttachments, deleteBugAttachment } from '@/lib/api/bugs';

interface BugModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Bug>, files: QueuedFile[]) => void;
  editBug?: Bug | null;
  isSubmitting?: boolean;
  users?: UserDbResponse[];
}

export function BugModal({
  isOpen,
  onClose,
  onSubmit,
  editBug,
  isSubmitting = false,
  users = [],
}: BugModalProps) {
  const [formData, setFormData] = useState<Partial<Bug>>({
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    severity: 'low',
    assignedTo: '',
    reportedBy: '',
  });

  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<BugAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: editBug?.title || '',
        description: editBug?.description || '',
        status: editBug?.status || 'open',
        priority: editBug?.priority || 'medium',
        severity: editBug?.severity || 'low',
        assignedTo: editBug?.assignedTo || '',
        reportedBy: editBug?.reportedBy || '',
      });
      setQueuedFiles([]);
      
      if (editBug?.id) {
        setLoadingAttachments(true);
        fetchBugAttachments(editBug.id)
          .then(setExistingAttachments)
          .catch(console.error)
          .finally(() => setLoadingAttachments(false));
      } else {
        setExistingAttachments([]);
      }
    }
  }, [isOpen, editBug]);

  const handleChange = (field: keyof Bug, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, queuedFiles);
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!editBug?.id) return;
    try {
      await deleteBugAttachment(editBug.id, attachmentId);
      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      console.error('Failed to delete attachment', error);
      alert('Failed to delete attachment. You may not have permission.');
    }
  };

  const isFormValid = formData.title?.trim().length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editBug ? 'Edit Bug Report' : 'Report New Bug'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <InputField
          label="Bug Title"
          id="title"
          placeholder="Enter a descriptive title"
          icon={BugIcon}
          value={formData.title || ''}
          onChange={(val) => handleChange('title', val)}
          required
          disabled={isSubmitting}
          autoFocus
        />

        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700">
            Description
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3 text-slate-400 pointer-events-none">
              <FileText size={18} />
            </div>
            <textarea
              id="description"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm text-slate-800 placeholder-slate-400 min-h-[100px]"
              placeholder="Detailed description of the issue..."
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700">
            Attachments
          </label>
          <FileUploader files={queuedFiles} onChange={setQueuedFiles} />
          
          {editBug && existingAttachments.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">Existing Attachments</h4>
              <ul className="space-y-2">
                {existingAttachments.map(att => (
                  <li key={att.id} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg bg-gray-50">
                    <div className="flex flex-col overflow-hidden truncate">
                      <span className="text-sm font-medium text-gray-700 truncate">{att.file_name}</span>
                      <span className="text-xs text-gray-500">
                        {(att.file_size / 1024).toFixed(1)} KB • {new Date(att.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-full shadow-sm border border-gray-200 transition-colors ml-2"
                      title="Remove Attachment"
                    >
                      <X className="w-4 h-4 text-gray-500 hover:text-red-600" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {loadingAttachments && (
            <p className="text-xs text-gray-400 mt-2">Loading existing attachments...</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="status" className="block text-sm font-semibold text-gray-700">Status</label>
            <select
              id="status"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm text-slate-800"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              disabled={isSubmitting}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label htmlFor="priority" className="block text-sm font-semibold text-gray-700">Priority</label>
            <select
              id="priority"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm text-slate-800"
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              disabled={isSubmitting}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="assignedTo" className="block text-sm font-semibold text-gray-700">Assigned To (Optional)</label>
            <select
              id="assignedTo"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm text-slate-800"
              value={formData.assignedTo || ''}
              onChange={(e) => handleChange('assignedTo', e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Unassigned</option>
              {users.map(user => (
                <option key={user.id} value={user.name}>{user.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reportedBy" className="block text-sm font-semibold text-gray-700">Reported By (Optional)</label>
            <select
              id="reportedBy"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm text-slate-800"
              value={formData.reportedBy || ''}
              onChange={(e) => handleChange('reportedBy', e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Unknown</option>
              {users.map(user => (
                <option key={user.id} value={user.name}>{user.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-5 border-t border-gray-100 mt-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting} fullWidth>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || !isFormValid} fullWidth>
            {isSubmitting ? 'Saving...' : (editBug ? 'Save Changes' : 'Create Bug')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
