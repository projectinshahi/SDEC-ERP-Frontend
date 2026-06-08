'use client';

import React, { useState, useEffect } from 'react';
import { Blocker, BlockerAttachment } from '@/lib/api/blockers';
import { fetchBlockerAttachments, uploadBlockerAttachments, deleteBlockerAttachment, updateBlocker } from '@/lib/api/blockers';
import { BlockerDiscussionPanel } from './BlockerDiscussionPanel';
import { ImageViewer } from '../bugs/ImageViewer';
import { FileUploader, QueuedFile } from '../bugs/FileUploader';
import { X, Calendar, User, Tag, AlertTriangle, Activity, FileText, File as FileIcon, Paperclip, UploadCloud, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../ToastProvider';

interface BlockerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocker: Blocker | null;
  currentUserId?: number | string;
  onBlockerUpdated?: (updatedBlocker: Blocker) => void;
}

export function BlockerDetailsModal({ isOpen, onClose, blocker, currentUserId, onBlockerUpdated }: BlockerDetailsModalProps) {
  const [attachments, setAttachments] = useState<BlockerAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<QueuedFile[]>([]);
  const { toast } = useToast();
  
  // Image viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [attachmentsForbidden, setAttachmentsForbidden] = useState(false);

  useEffect(() => {
    if (isOpen && blocker) {
      setLoadingAttachments(true);
      setAttachmentsForbidden(false);
      fetchBlockerAttachments(blocker.id)
        .then(setAttachments)
        .catch(err => {
          console.error(err);
          if (err.response?.status === 403) {
            setAttachmentsForbidden(true);
          }
        })
        .finally(() => setLoadingAttachments(false));
    } else {
      setUploadFiles([]);
      setAttachmentsForbidden(false);
    }
  }, [isOpen, blocker]);

  if (!isOpen || !blocker) return null;

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    setIsUploading(true);
    try {
      const filesToUpload = uploadFiles.map(f => f.file);
      // NOTE: We are ignoring the descriptions here as uploadBlockerAttachments expects File[], 
      // but in the backend we added support for descriptions. 
      // If needed, we can update api/blockers.ts to accept descriptions.
      const newAttachments = await uploadBlockerAttachments(blocker.id, filesToUpload);
      setAttachments(prev => [...newAttachments, ...prev]);
      setUploadFiles([]);
      toast('Attachments uploaded successfully', 'success');
    } catch (error) {
      console.error('Failed to upload attachments', error);
      toast('Failed to upload attachments', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await deleteBlockerAttachment(blocker.id, attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast('Attachment deleted', 'success');
    } catch (error) {
      console.error('Failed to delete attachment', error);
      toast('Failed to delete attachment. You may not have permission.', 'error');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const updated = await updateBlocker(blocker.id, { status: newStatus });
      toast(`Status updated to ${newStatus}`, 'success');
      if (onBlockerUpdated) onBlockerUpdated(updated);
    } catch (error) {
      console.error('Failed to update status', error);
      toast('Failed to update status', 'error');
    }
  };

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
      case 'in_progress': case 'in progress': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'closed': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400">BLK-{blocker.id}</span>
                <select 
                  value={blocker.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border cursor-pointer outline-none ${getStatusColor(blocker.status)}`}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getSeverityColor(blocker.severity)}`}>
                  {blocker.severity} Severity
                </span>
                {blocker.project && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-purple-100 text-purple-700 border-purple-200">
                    {blocker.project.name}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-800 mt-0.5">{blocker.title}</h2>
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
          
          {/* Left Section - Blocker Details (70%) */}
          <div className="w-full lg:w-[70%] h-full overflow-y-auto p-6 bg-white border-r border-gray-100 custom-scrollbar">
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <User size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Reporter</span>
                </div>
                <div className="font-medium text-sm text-gray-800">{blocker.loggedBy?.name || 'Unknown'}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <User size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Assigned To</span>
                </div>
                <div className="font-medium text-sm text-gray-800">{blocker.helpNeededFrom?.name || 'Unassigned'}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Calendar size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Created</span>
                </div>
                <div className="font-medium text-sm text-gray-800">
                  {blocker.createdAt ? format(new Date(blocker.createdAt), 'MMM d, yyyy') : 'N/A'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Tag size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Escalation</span>
                </div>
                <div className="font-medium text-sm text-gray-800 capitalize">{blocker.escalationLevel || 'None'}</div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Description */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={18} className="text-gray-400" />
                  <h3 className="text-lg font-bold text-gray-800">Description</h3>
                </div>
                <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-xl border border-gray-100">
                  {blocker.description || 'No description provided.'}
                </div>
              </section>

              {/* Tags and Notes */}
              {(blocker.notes || (blocker.tags && blocker.tags.length > 0)) && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={18} className="text-gray-400" />
                    <h3 className="text-lg font-bold text-gray-800">Additional Information</h3>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    {blocker.tags && blocker.tags.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {blocker.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-md">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {blocker.notes && (
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-700">Notes: </span>
                        {blocker.notes}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Attachments Section */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Paperclip size={18} className="text-gray-400" />
                  <h3 className="text-lg font-bold text-gray-800">Attachments</h3>
                </div>
                
                {/* Attachments Content */}
                {attachmentsForbidden ? (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center justify-center text-center">
                    <div>
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-2 mx-auto">
                        <span className="text-red-500 font-bold">!</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-800">Restricted Access</h4>
                      <p className="text-xs text-gray-500 mt-1">Only project members can view and upload attachments.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Upload Form */}
                    <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <FileUploader 
                        files={uploadFiles} 
                        onChange={setUploadFiles} 
                        maxFiles={5}
                        maxSizeMB={10}
                      />
                      {uploadFiles.length > 0 && (
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {isUploading ? (
                              <>Uploading...</>
                            ) : (
                              <>
                                <UploadCloud size={16} />
                                Upload Files
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                {/* Existing Attachments */}
                {loadingAttachments ? (
                  <div className="text-gray-500 text-sm italic">Loading attachments...</div>
                ) : attachments.length === 0 ? (
                  <div className="text-gray-500 text-sm italic">No attachments uploaded yet.</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {attachments.map((att) => {
                      const isImage = att.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || att.file_url.includes('image/upload');
                      const canDelete = String(currentUserId) === String(att.uploaded_by); // or if admin, handled by backend usually, but for UI we can just show/hide

                      return (
                        <div key={att.id} className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow transition-shadow relative group">
                          {isImage ? (
                            <div 
                              className="h-24 bg-gray-100 cursor-pointer overflow-hidden relative"
                              onClick={() => openImageViewer(att.id)}
                            >
                              <img src={att.file_url} alt={att.file_name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
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
                          <div className="p-2 border-t border-gray-100 flex flex-col justify-between flex-1">
                            <div>
                              <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-gray-700 truncate block hover:text-blue-600 transition-colors" title={att.file_name}>
                                {att.file_name}
                              </a>
                              {att.description && (
                                <p className="text-[10px] text-gray-600 mt-1 italic line-clamp-2" title={att.description}>
                                  "{att.description}"
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <p className="text-[10px] text-gray-500">{(att.file_size / 1024).toFixed(1)} KB • {att.uploader?.name}</p>
                              {canDelete && (
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleDeleteAttachment(att.id);
                                  }}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                  title="Delete attachment"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                </>
              )}
              </section>

            </div>
          </div>

          {/* Right Section - Discussion (30%) */}
          <div className="w-full lg:w-[30%] h-full flex flex-col bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-100">
            <BlockerDiscussionPanel blockerId={blocker.id} currentUserId={currentUserId} />
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
