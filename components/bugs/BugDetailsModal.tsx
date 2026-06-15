'use client';

import React, { useState, useEffect } from 'react';
import { Bug as BugType, BugAttachment, fetchBugAttachments, uploadBugAttachments, deleteBugAttachment } from '@/lib/api/bugs';
import type { UserDbResponse } from '@/lib/api/users';
import { BugDiscussionPanel } from './BugDiscussionPanel';
import { ImageViewer } from './ImageViewer';
import { FileUploader, QueuedFile } from './FileUploader';
import { X, Calendar, User, Tag, AlertTriangle, Monitor, Activity, FileText, Settings, Bug as BugIcon, File as FileIcon, Paperclip, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';

import { InlineEditableText } from '../ui/InlineEditableText';
import { InlineSelect } from '../ui/InlineSelect';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface BugDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bug: BugType | null;
  currentUserId?: number | string;
  users?: UserDbResponse[];
  onUpdate?: (bugId: number, updates: Partial<BugType>) => Promise<void>;
}

export function BugDetailsModal({ isOpen, onClose, bug, currentUserId, users = [], onUpdate }: BugDetailsModalProps) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('bugs.update');
  const [attachments, setAttachments] = useState<BugAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [isEditingAttachments, setIsEditingAttachments] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Image viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    if (isOpen && bug) {
      setLoadingAttachments(true);
      fetchBugAttachments(bug.id)
        .then(setAttachments)
        .catch(console.error)
        .finally(() => setLoadingAttachments(false));
      setIsEditingAttachments(false);
      setQueuedFiles([]);
    }
  }, [isOpen, bug]);

  const handleUploadAttachments = async () => {
    if (!bug || queuedFiles.length === 0) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      queuedFiles.forEach(qf => {
        formData.append('files', qf.file);
        formData.append('descriptions', qf.description || '');
      });
      await uploadBugAttachments(bug.id, formData);
      const updatedAttachments = await fetchBugAttachments(bug.id);
      setAttachments(updatedAttachments);
      setQueuedFiles([]);
      setIsEditingAttachments(false);
    } catch (error) {
      console.error('Failed to upload attachments', error);
      alert('Failed to upload attachments.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!bug) return;
    try {
      await deleteBugAttachment(bug.id, attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      console.error('Failed to delete attachment', error);
      alert('Failed to delete attachment.');
    }
  };

  if (!isOpen || !bug) return null;

  const imageAttachments = attachments.filter(a => a.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || a.file_url.includes('image/upload'));
  const viewerImages = imageAttachments.map(a => ({ id: a.id, url: a.file_url, name: a.file_name }));

  const openImageViewer = (attachmentId: number) => {
    const index = viewerImages.findIndex(img => img.id === attachmentId);
    if (index !== -1) {
      setViewerIndex(index);
      setViewerOpen(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'closed': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div
        className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 w-full max-w-2xl">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <BugIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-400">BUG-{bug.id}</span>
                <InlineSelect
                  value={bug.status}
                  options={[
                    { label: 'Open', value: 'open', colorClass: getStatusColor('open') },
                    { label: 'In Progress', value: 'in_progress', colorClass: getStatusColor('in_progress') },
                    { label: 'Resolved', value: 'resolved', colorClass: getStatusColor('resolved') },
                    { label: 'Closed', value: 'closed', colorClass: getStatusColor('closed') }
                  ]}
                  onSave={(val) => onUpdate?.(bug.id, { status: val })}
                  permission={canEdit}
                />
                <InlineSelect
                  value={bug.priority}
                  options={[
                    { label: 'Critical', value: 'critical', colorClass: getPriorityColor('critical') },
                    { label: 'High', value: 'high', colorClass: getPriorityColor('high') },
                    { label: 'Medium', value: 'medium', colorClass: getPriorityColor('medium') },
                    { label: 'Low', value: 'low', colorClass: getPriorityColor('low') }
                  ]}
                  onSave={(val) => onUpdate?.(bug.id, { priority: val })}
                  permission={canEdit}
                />
              </div>
              <InlineEditableText
                value={bug.title}
                onSave={(val) => onUpdate?.(bug.id, { title: val })}
                permission={canEdit}
                textClassName="text-xl font-bold text-gray-800 mt-0.5"
                inputClassName="text-xl font-bold text-gray-800 mt-0.5"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

          {/* Left Section - Bug Details (70%) */}
          <div className="w-full lg:w-[70%] h-full overflow-y-auto p-6 bg-white border-r border-gray-100 custom-scrollbar">

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <User size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Assignee</span>
                </div>
                <InlineSelect
                  value={bug.assignedTo || ''}
                  options={[
                    { label: 'Unassigned', value: '' },
                    ...users.map(u => ({ label: u.name, value: u.name }))
                  ]}
                  onSave={(val) => onUpdate?.(bug.id, { assignedTo: val || null })}
                  permission={canEdit}
                  className="font-medium text-sm text-gray-800"
                />
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <User size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Reporter</span>
                </div>
                <div className="font-medium text-sm text-gray-800">{bug.reportedBy || 'Unknown'}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Calendar size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Created</span>
                </div>
                <div className="font-medium text-sm text-gray-800 relative group">
                  <input
                    type="date"
                    disabled={!canEdit}
                    value={bug.createdAt ? new Date(bug.createdAt).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        onUpdate?.(bug.id, { createdAt: new Date(e.target.value).toISOString() as any });
                      }
                    }}
                    className={`bg-transparent border-none p-0 h-auto focus:ring-0 text-sm font-medium text-gray-800 w-full ${canEdit ? 'cursor-pointer group-hover:bg-gray-100 rounded' : 'cursor-default'}`}
                  />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <AlertTriangle size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Severity</span>
                </div>
                <InlineSelect
                  value={bug.severity || ''}
                  options={[
                    { label: 'Not set', value: '' },
                    { label: 'Critical', value: 'critical' },
                    { label: 'Major', value: 'major' },
                    { label: 'Minor', value: 'minor' },
                    { label: 'Trivial', value: 'trivial' }
                  ]}
                  onSave={(val) => onUpdate?.(bug.id, { severity: val || null })}
                  permission={canEdit}
                  className="font-medium text-sm text-gray-800 capitalize"
                />
              </div>
            </div>

            <div className="space-y-8">
              {/* Description */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={18} className="text-gray-400" />
                  <h3 className="text-lg font-bold text-gray-800">Description</h3>
                </div>
                <div className="text-sm leading-relaxed bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <InlineEditableText
                    value={bug.description || ''}
                    onSave={(val) => onUpdate?.(bug.id, { description: val || null })}
                    permission={canEdit}
                    type="textarea"
                    placeholder="No description provided."
                  />
                </div>
              </section>

              {/* Steps to Reproduce */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={18} className="text-gray-400" />
                  <h3 className="text-lg font-bold text-gray-800">Reproduction Steps</h3>
                </div>
                <div className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <InlineEditableText
                    value={bug.reproductionSteps || ''}
                    onSave={(val) => onUpdate?.(bug.id, { reproductionSteps: val || null })}
                    permission={canEdit}
                    type="textarea"
                    placeholder="Not specified."
                  />
                </div>
              </section>

              {/* Expected & Actual Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag size={18} className="text-emerald-500" />
                    <h3 className="text-lg font-bold text-gray-800">Expected Result</h3>
                  </div>
                  <div className="text-gray-600 text-sm leading-relaxed bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                    <InlineEditableText
                      value={bug.expectedResult || ''}
                      onSave={(val) => onUpdate?.(bug.id, { expectedResult: val || null })}
                      permission={canEdit}
                      type="textarea"
                      placeholder="Not specified."
                    />
                  </div>
                </section>
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={18} className="text-red-500" />
                    <h3 className="text-lg font-bold text-gray-800">Actual Result</h3>
                  </div>
                  <div className="text-gray-600 text-sm leading-relaxed bg-red-50/50 p-2 rounded-xl border border-red-100">
                    <InlineEditableText
                      value={bug.actualResult || ''}
                      onSave={(val) => onUpdate?.(bug.id, { actualResult: val || null })}
                      permission={canEdit}
                      type="textarea"
                      placeholder="Not specified."
                    />
                  </div>
                </section>
              </div>



              {/* Resolution Notes */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardCheck size={18} className="text-gray-400" />
                  <h3 className="text-lg font-bold text-gray-800">Resolution Notes</h3>
                </div>
                <div className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <InlineEditableText
                    value={bug.resolutionNotes || ''}
                    onSave={(val) => onUpdate?.(bug.id, { resolutionNotes: val || null })}
                    permission={canEdit}
                    type="textarea"
                    placeholder="Notes on how this bug was resolved..."
                  />
                </div>
              </section>

              {/* Attachments */}
              <section>
                <div 
                  className="flex items-center gap-2 mb-3 cursor-pointer select-none"
                  onDoubleClick={() => canEdit && setIsEditingAttachments(true)}
                  title={canEdit ? "Double click to manage attachments" : undefined}
                >
                  <Paperclip size={18} className="text-gray-400" />
                  <h3 className="text-lg font-bold text-gray-800">Attachments</h3>
                  {canEdit && !isEditingAttachments && (
                    <span className="text-xs text-gray-400 ml-2 font-normal hidden md:inline">(Double click to add)</span>
                  )}
                </div>

                {isEditingAttachments ? (
                  <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <FileUploader files={queuedFiles} onChange={setQueuedFiles} />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setIsEditingAttachments(false);
                          setQueuedFiles([]);
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        disabled={isUploading}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUploadAttachments}
                        disabled={queuedFiles.length === 0 || isUploading}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isUploading ? 'Uploading...' : 'Save Attachments'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {loadingAttachments ? (
                  <div className="text-gray-500 text-sm italic">Loading attachments...</div>
                ) : attachments.length === 0 ? (
                  <div className="text-gray-500 text-sm italic">No attachments uploaded.</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {attachments.map((att) => {
                      const isImage = att.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || att.file_url.includes('image/upload');

                      return (
                        <div key={att.id} className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow transition-shadow">
                          {isImage ? (
                            <div
                              className="h-24 bg-gray-100 cursor-pointer overflow-hidden relative group"
                              onClick={() => openImageViewer(att.id)}
                            >
                              <img src={att.file_url} alt={att.file_name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                          ) : (
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-24 bg-blue-50 flex items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors"
                            >
                              <FileIcon className="w-8 h-8 text-blue-500" />
                            </a>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this attachment?')) {
                                  handleDeleteAttachment(att.id);
                                }
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                              title="Delete Attachment"
                            >
                              <X size={14} />
                            </button>
                          )}
                          <div className="p-2.5 border-t border-gray-100 flex flex-col justify-between flex-1">
                            <div>
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate" title={att.description || 'Uploaded file'}>
                                {att.description || 'Uploaded file'}
                              </p>
                              <p className="text-[10px] text-gray-500 mt-0.5 truncate" title={att.file_name}>
                                {att.file_name}
                              </p>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1.5">
                              {(att.file_size / 1024).toFixed(1)} KB • {att.uploader?.name}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

            </div>
          </div>

          {/* Right Section - Discussion (30%) */}
          <div className="w-full lg:w-[30%] h-full flex flex-col bg-gray-50">
            <BugDiscussionPanel bugId={bug.id} currentUserId={currentUserId} />
          </div>

        </div>
      </div>
      <ImageViewer
        images={viewerImages}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
