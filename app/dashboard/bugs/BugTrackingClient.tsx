'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Breadcrumb } from '@/components/Breadcrumb';
import { BugTable } from '@/components/bugs/BugTable';
import { BugModal } from '@/components/bugs/BugModal';
import { QueuedFile } from '@/components/bugs/FileUploader';
import { BugDetailsModal } from '@/components/bugs/BugDetailsModal';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { Modal } from '@/components/Modal';
import { Plus, Bug, AlertTriangle, X, CheckCircle2, Info, FolderDot } from 'lucide-react';
import type { Bug as BugType } from '@/lib/api/bugs';
import { createBug, updateBug, deleteBug, uploadBugAttachments } from '@/lib/api/bugs';
import { fetchProjectBugs } from '@/lib/api/projects';
import { fetchUsers, type UserDbResponse } from '@/lib/api/users';
import { useToast } from '@/lib/hooks/useToast';
import { useAuthContext } from '@/lib/context/AuthContext';
import { useProject } from '@/lib/context/ProjectContext';
import { classNames } from '@/lib/utils';

export function BugTrackingClient() {
  const { activeProject } = useProject();
  const { user: currentUser } = useAuthContext();
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [users, setUsers] = useState<UserDbResponse[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBug, setEditingBug] = useState<BugType | null>(null);
  const [viewingBug, setViewingBug] = useState<BugType | null>(null);

  const [bugToDelete, setBugToDelete] = useState<BugType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBugs = async () => {
    if (!activeProject) {
      setBugs([]);
      return;
    }
    try {
      setIsLoading(true);
      const data = await fetchProjectBugs(activeProject.id);
      setBugs(data);
    } catch (err: any) {
      console.error('Failed to load bugs:', err);
      toast('Failed to load bugs from database', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBugs();
  }, [activeProject]);

  useEffect(() => {
    fetchUsers().then(setUsers).catch(console.error);
  }, []);

  const handleAddBug = async (data: Partial<BugType>, queuedFiles: QueuedFile[] = []) => {
    if (!activeProject) return;
    setIsSubmitting(true);
    try {
      const newBug = await createBug({ ...data, project_id: activeProject.id } as any);
      
      // Handle attachments
      if (queuedFiles.length > 0 && newBug.id) {
        const formData = new FormData();
        queuedFiles.forEach(qf => {
          formData.append('files', qf.file);
          formData.append('descriptions', qf.description || '');
        });
        await uploadBugAttachments(newBug.id, formData);
      }

      toast(`Bug "${data.title}" successfully reported!`, 'success');
      setIsModalOpen(false);
      loadBugs();
    } catch (err: any) {
      console.error('Error creating bug:', err);
      toast('Failed to create bug', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBug = async (data: Partial<BugType>, queuedFiles: QueuedFile[] = []) => {
    if (editingBug) {
      setIsSubmitting(true);
      try {
        await updateBug(editingBug.id, data);

        // Handle new attachments
        if (queuedFiles.length > 0) {
          const formData = new FormData();
          queuedFiles.forEach(qf => {
            formData.append('files', qf.file);
            formData.append('descriptions', qf.description || '');
          });
          await uploadBugAttachments(editingBug.id, formData);
        }

        toast(`Bug "${data.title}" successfully updated!`, 'success');
        setIsModalOpen(false);
        setEditingBug(null);
        loadBugs();
      } catch (err: any) {
        console.error('Error updating bug:', err);
        toast('Failed to update bug', 'error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleEditBug = (bug: BugType) => {
    setEditingBug(bug);
    setIsModalOpen(true);
  };

  const handleDeleteBug = (bugId: number) => {
    const bug = bugs.find((b) => b.id === bugId);
    if (bug) setBugToDelete(bug);
  };

  const handleConfirmDelete = async () => {
    if (!bugToDelete) return;
    setIsDeleting(true);
    try {
      await deleteBug(bugToDelete.id);
      toast(`Bug "${bugToDelete.title}" has been deleted.`, 'info');
      setBugToDelete(null);
      loadBugs();
    } catch (err: any) {
      console.error('Error deleting bug:', err);
      toast('Failed to delete bug', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PermissionPageGuard module="bugs">
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'Bug Tracking' }]} />
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Bug Tracking</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and track system issues, bugs, and feature requests.</p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGuard require="bugs.create">
            <Button
              variant="primary"
              size="lg"
              disabled={!activeProject}
              onClick={() => {
                setEditingBug(null);
                setIsModalOpen(true);
              }}
            >
              <Plus size={20} />
              Report Bug
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {!activeProject ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-gray-200">
          <FolderDot size={48} className="text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">No Active Project</h2>
          <p className="text-gray-500 mt-2">Please select a project from the top navigation bar to view its bugs.</p>
        </div>
      ) : (
        <Card variant="outlined" className="overflow-hidden">
          {isLoading ? (
            <div className="py-20 text-center bg-white flex flex-col items-center justify-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 font-bold text-xs mt-4">Loading issues...</p>
            </div>
          ) : (
            <BugTable bugs={bugs} onEdit={handleEditBug} onDelete={handleDeleteBug} onView={setViewingBug} />
          )}
        </Card>
      )}

      <BugModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBug(null);
        }}
        onSubmit={editingBug ? handleUpdateBug : handleAddBug}
        editBug={editingBug}
        isSubmitting={isSubmitting}
        users={users}
      />

      <BugDetailsModal
        isOpen={!!viewingBug}
        onClose={() => setViewingBug(null)}
        bug={viewingBug}
        currentUserId={currentUser?.id}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!bugToDelete}
        onClose={() => !isDeleting && setBugToDelete(null)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="flex flex-col items-center text-center p-2">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4 shadow-sm animate-pulse">
            <AlertTriangle size={28} />
          </div>

          <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-2">
            Delete Bug Report?
          </h3>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Are you sure you want to permanently delete bug <span className="font-semibold text-gray-800">"{bugToDelete?.title}"</span>? This action cannot be undone.
          </p>

          <div className="flex items-center gap-3 w-full">
            <Button
              variant="secondary"
              className="flex-1 font-semibold"
              onClick={() => setBugToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1 font-semibold"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Bug'}
            </Button>
          </div>
        </div>
      </Modal>

    </PermissionPageGuard>
  );
}
