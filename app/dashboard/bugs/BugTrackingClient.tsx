'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Breadcrumb } from '@/components/Breadcrumb';
import { BugTable } from '@/components/bugs/BugTable';
import { BugModal } from '@/components/bugs/BugModal';
import { QueuedFile } from '@/components/bugs/FileUploader';
import { BugAnalyticsDashboard } from '@/components/bugs/BugAnalyticsDashboard';
import { BugDetailsModal } from '@/components/bugs/BugDetailsModal';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { Modal } from '@/components/Modal';
import { Plus, Bug, AlertTriangle, X, CheckCircle2, Info, FolderDot } from 'lucide-react';
import type { Bug as BugType } from '@/lib/api/bugs';
import { createBug, updateBug, deleteBug, uploadBugAttachments, getBugById } from '@/lib/api/bugs';
import { fetchProjectBugs } from '@/lib/api/projects';
import { fetchUsers, type UserDbResponse } from '@/lib/api/users';
import { useToast } from '@/lib/hooks/useToast';
import { useAuthContext } from '@/lib/context/AuthContext';
import { useProject } from '@/lib/context/ProjectContext';
import { classNames } from '@/lib/utils';

export function BugTrackingClient() {
  const { activeProject } = useProject();
  const { user: currentUser } = useAuthContext();
  const [activeTab, setActiveTab] = useState<'reports' | 'analytics'>('reports');
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [users, setUsers] = useState<UserDbResponse[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingBug, setViewingBug] = useState<BugType | null>(null);

  const [bugToDelete, setBugToDelete] = useState<BugType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = useSearchParams();

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

  // Open a specific bug from a ?bugId= deep link (e.g. from an assignment notification)
  useEffect(() => {
    const bugIdParam = searchParams.get('bugId');
    if (!bugIdParam) return;
    const openBugFromUrl = async () => {
      try {
        const bug = await getBugById(parseInt(bugIdParam, 10));
        if (bug) setViewingBug(bug);
      } catch (err: any) {
        console.error('Failed to load bug from URL parameter', err);
        toast('This bug may have been deleted or you do not have permission to view it.', 'error');
      } finally {
        // Remove the param so the modal doesn't reopen on reload
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('bugId');
        window.history.replaceState({}, '', newUrl.toString());
      }
    };
    openBugFromUrl();
  }, [searchParams]);

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



  const handleStatusChange = async (bugId: number, newStatus: string) => {
    try {
      await updateBug(bugId, { status: newStatus as any });
      toast(`Bug status updated successfully!`, 'success');
      loadBugs();
    } catch (err: any) {
      console.error('Error updating bug status:', err);
      toast('Failed to update bug status', 'error');
    }
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
        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-lg flex items-center shadow-inner border border-slate-200">
            <button 
              onClick={() => setActiveTab('reports')} 
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'reports' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Bug Reports
            </button>
            <button 
              onClick={() => setActiveTab('analytics')} 
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'analytics' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Analytics
            </button>
          </div>
          
          {activeTab === 'reports' && (
            <PermissionGuard require="bugs.create">
              <Button
                variant="primary"
                size="lg"
                disabled={!activeProject}
                onClick={() => {
                  setIsModalOpen(true);
                }}
              >
                <Plus size={20} />
                Report Bug
              </Button>
            </PermissionGuard>
          )}
        </div>
      </div>

      {activeTab === 'reports' ? (
        <>
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
                <BugTable bugs={bugs} onDelete={handleDeleteBug} onView={setViewingBug} onStatusChange={handleStatusChange} />
              )}
            </Card>
          )}
        </>
      ) : (
        <BugAnalyticsDashboard />
      )}

      <BugModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddBug}
        isSubmitting={isSubmitting}
        users={users}
      />

      <BugDetailsModal
        isOpen={!!viewingBug}
        onClose={() => setViewingBug(null)}
        bug={viewingBug}
        currentUserId={currentUser?.id}
        users={users}
        onUpdate={async (bugId, updates) => {
          await updateBug(bugId, updates);
          setViewingBug(prev => prev ? { ...prev, ...updates } : null);
          loadBugs();
        }}
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
