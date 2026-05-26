'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { Bug as BugIcon, AlertTriangle, FileText, User } from 'lucide-react';
import type { Bug } from '@/lib/api/bugs';
import type { UserDbResponse } from '@/lib/api/users';

interface BugModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Bug>) => void;
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
    }
  }, [isOpen, editBug]);

  const handleChange = (field: keyof Bug, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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

        <div className="space-y-1.5">
          <label htmlFor="severity" className="block text-sm font-semibold text-gray-700">Severity (Optional)</label>
          <div className="relative">
            <div className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 pointer-events-none">
              <AlertTriangle size={18} />
            </div>
            <input
              type="text"
              id="severity"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm text-slate-800 placeholder-slate-400"
              placeholder="e.g. Critical System Crash"
              value={formData.severity || ''}
              onChange={(e) => handleChange('severity', e.target.value)}
              disabled={isSubmitting}
            />
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
