'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { Search, Upload, File as FileIcon, FileText, Image as ImageIcon, Archive, Download, Edit3, Trash2, MoreVertical, Loader2 } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { classNames } from '@/lib/utils';
import { 
  ProjectDocument, 
  fetchProjectDocuments, 
  uploadProjectDocument, 
  deleteProjectDocument, 
  updateProjectDocument, 
  downloadProjectDocumentBlob 
} from '@/lib/api/project_documents';
import { UploadDocModal } from './UploadDocModal';
import { EditDocModal } from './EditDocModal';
import { Modal } from '@/components/Modal';

interface ProjectDocsLibraryProps {
  projectId: string;
  userRole: 'admin' | 'editor' | 'viewer' | null;
  currentUserId: number | null;
}

export function ProjectDocsLibrary({ projectId, userRole, currentUserId }: ProjectDocsLibraryProps) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [editingDoc, setEditingDoc] = useState<ProjectDocument | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [deletingDoc, setDeletingDoc] = useState<ProjectDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await fetchProjectDocuments(projectId);
      setDocuments(data);
    } catch (error) {
      toast('Failed to load project documents.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [projectId]);

  const handleUpload = async (file: File, title: string, description: string) => {
    setIsUploading(true);
    try {
      const newDoc = await uploadProjectDocument(projectId, file, title, description);
      setDocuments([newDoc, ...documents]);
      toast('Document uploaded successfully!');
      setIsUploadModalOpen(false);
    } catch (error: any) {
      toast(error.message || 'Failed to upload document', 'error');
      throw error; // Rethrow to let modal handle error state
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = async (documentId: number, title: string, description: string) => {
    setIsUpdating(true);
    try {
      const updatedDoc = await updateProjectDocument(projectId, documentId, { title, description });
      setDocuments(documents.map(d => d.id === documentId ? updatedDoc : d));
      toast('Document updated successfully!');
      setEditingDoc(null);
    } catch (error: any) {
      toast(error.message || 'Failed to update document', 'error');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDoc) return;
    setIsDeleting(true);
    try {
      await deleteProjectDocument(projectId, deletingDoc.id);
      setDocuments(documents.filter(d => d.id !== deletingDoc.id));
      toast('Document deleted successfully!');
      setDeletingDoc(null);
    } catch (error: any) {
      toast(error.message || 'Failed to delete document', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Permissions
  const canUpload = userRole === 'admin' || userRole === 'editor';
  const canDelete = (doc: ProjectDocument) => {
    if (userRole === 'admin') return true;
    if (userRole === 'editor' && Number(doc.uploaded_by) === Number(currentUserId)) return true;
    return false;
  };
  const canEdit = canUpload; // Admins and Editors can edit metadata

  const filteredDocs = documents.filter(doc => {
    const query = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(query) ||
      (doc.description && doc.description.toLowerCase().includes(query)) ||
      doc.file_name.toLowerCase().includes(query)
    );
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="text-red-500" />;
    if (mimeType.includes('image')) return <ImageIcon className="text-blue-500" />;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <Archive className="text-yellow-500" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return <FileIcon className="text-emerald-500" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileIcon className="text-blue-700" />;
    return <FileIcon className="text-gray-500" />;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handlePreview = async (doc: ProjectDocument, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      toast('Opening document...', 'info');
      const blob = await downloadProjectDocumentBlob(doc.project_id, doc.id);
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (error) {
      console.error("Preview failed:", error);
      toast('Failed to load document', 'error');
    }
  };

  const handleDownload = async (doc: ProjectDocument, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      toast('Starting download...', 'success');
      const blob = await downloadProjectDocumentBlob(doc.project_id, doc.id);
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      toast('Direct download failed, opening in new tab...', 'error');
      window.open(doc.file_url, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card variant="outlined" className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/60 shadow-sm">
        <CardBody className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 w-full sm:max-w-xs relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>
          
          {canUpload && (
            <Button
              variant="primary"
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Upload size={16} />
              Upload Document
            </Button>
          )}
        </CardBody>
      </Card>

      {/* Documents List */}
      <Card variant="outlined" className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-gray-400">
            <Loader2 className="animate-spin w-8 h-8" />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full flex items-center justify-center mb-4">
              <FileIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">No Documents Found</h3>
            <p className="text-sm text-gray-500 max-w-md">
              {searchQuery 
                ? 'Try adjusting your search query to find what you are looking for.' 
                : 'This project does not have any documents uploaded yet. Upload BRDs, design files, or meeting notes here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
              <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/50 uppercase border-b border-gray-200 dark:border-gray-700/60">
                <tr>
                  <th className="px-6 py-4 font-semibold w-10">Type</th>
                  <th className="px-6 py-4 font-semibold">Document details</th>
                  <th className="px-6 py-4 font-semibold">Size</th>
                  <th className="px-6 py-4 font-semibold">Uploaded by</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center border border-gray-100 dark:border-gray-700">
                        {getFileIcon(doc.mime_type)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href="#" 
                        onClick={(e) => handlePreview(doc, e)}
                        className="font-bold text-gray-900 dark:text-gray-100 mb-0.5 hover:underline group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 block cursor-pointer"
                        title="Click to preview document"
                      >
                        {doc.title}
                      </a>
                      <p className="text-xs text-gray-400 line-clamp-1 max-w-[400px]">
                        {doc.description || doc.file_name}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">
                      {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-200">
                        {doc.uploader?.name || 'Unknown User'}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {formatDate(doc.created_at)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        <a
                          href={doc.file_url}
                          onClick={(e) => handleDownload(doc, e)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                          title="Download Document"
                        >
                          <Download size={16} />
                        </a>
                        
                        {canEdit && (
                          <button
                            onClick={() => setEditingDoc(doc)}
                            className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                            title="Edit Details"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}

                        {canDelete(doc) && (
                          <button
                            onClick={() => setDeletingDoc(doc)}
                            className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals */}
      <UploadDocModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        isUploading={isUploading}
      />

      <EditDocModal
        isOpen={!!editingDoc}
        onClose={() => setEditingDoc(null)}
        document={editingDoc}
        onUpdate={handleUpdate}
        isUpdating={isUpdating}
      />

      <Modal
        isOpen={!!deletingDoc}
        onClose={() => setDeletingDoc(null)}
        title="Delete Document"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Are you sure you want to delete <span className="font-bold">{deletingDoc?.title}</span>?
          </p>
          <p className="text-xs text-rose-500">
            This action cannot be undone and the file will be permanently removed.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={() => setDeletingDoc(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
