'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Skeleton } from '@/components/Skeleton';
import { ROUTES } from '@/lib/constants';
import { 
  ArrowLeft, 
  AlertCircle,
  CheckCircle2,
  Settings,
  Users,
  Info,
  X,
  Loader2
} from 'lucide-react';
import { 
  fetchProjectById, 
  updateProjectApi, 
  fetchProjectMembers, 
  addProjectMemberApi, 
  updateProjectMemberRoleApi, 
  removeProjectMemberApi,
  deleteProjectApi
} from '@/lib/api/projects';
import { Project, ProjectMember } from '@/components/projects/ProjectCard';
import { MemberList } from '@/components/projects/MemberList';
import { AddMemberModal } from '@/components/projects/AddMemberModal';
import { Modal } from '@/components/Modal';
import { classNames } from '@/lib/utils';

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [activeTab, setActiveTab] = useState<'details' | 'members'>('details');

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'editor' | 'viewer' | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'completed' | 'on-hold'>('active');

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | number | null>(null);

  interface ToastMessage { id: string; message: string; type: 'success' | 'error' | 'info'; }
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProjectById(projectId);
      setProject(data);
      setName(data.name);
      setDescription(data.description || '');
      setStatus(data.status as any);

      const membersData = await fetchProjectMembers(projectId);
      setMembers(membersData);

      // Determine current user role
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          const currentMember = membersData.find(m => m.userId === userObj.id || m.email === userObj.email);
          if (currentMember) {
            setCurrentUserRole(currentMember.role);
          } else {
            // Fallback for global admins (assuming they bypass restrictions but we'll show them as admin)
            if (userObj.role?.toLowerCase() === 'admin' || userObj.role?.toLowerCase() === 'super admin') {
              setCurrentUserRole('admin');
            } else {
              setCurrentUserRole('viewer');
            }
          }
        } catch (e) {
          setCurrentUserRole('viewer');
        }
      } else {
        setCurrentUserRole('viewer');
      }

    } catch (err: any) {
      console.error('Failed to load project details:', err);
      setError(err.message || 'The requested project could not be loaded or does not exist.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembersOnly = async () => {
    try {
      const membersData = await fetchProjectMembers(projectId);
      setMembers(membersData);
    } catch (err: any) {
      console.error('Failed to load members:', err);
    }
  }

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const handleSaveDetails = async () => {
    if (currentUserRole === 'viewer') return;
    setIsSaving(true);
    try {
      await updateProjectApi(projectId, { name, description, status });
      showToast('Project details updated successfully');
      setProject(prev => prev ? { ...prev, name, description, status } : null);
    } catch (error: any) {
      showToast(error.message || 'Failed to update details', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMemberSubmit = async (data: { userId: number; role: 'admin' | 'editor' | 'viewer' }) => {
    try {
      await addProjectMemberApi(projectId, data);
      showToast('Member added successfully!');
      setIsAddMemberOpen(false);
      loadMembersOnly();
    } catch (error: any) {
      showToast(error.message || 'Failed to add member', 'error');
    }
  };

  const handleRoleChange = async (memberId: string | number, newRole: 'admin' | 'editor' | 'viewer') => {
    setIsUpdatingRole(memberId);
    try {
      await updateProjectMemberRoleApi(projectId, memberId, newRole);
      showToast('Role updated successfully!');
      loadMembersOnly();
    } catch (error: any) {
      showToast(error.message || 'Failed to update role', 'error');
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!memberToRemove) return;
    
    // Check if removing last admin
    if (memberToRemove.role === 'admin') {
      const adminCount = members.filter(m => m.role === 'admin').length;
      if (adminCount <= 1) {
        showToast('Cannot remove the last admin from the project.', 'error');
        setMemberToRemove(null);
        return;
      }
    }

    setIsRemoving(true);
    try {
      await removeProjectMemberApi(projectId, memberToRemove.id);
      showToast('Member removed successfully!');
      setMemberToRemove(null);
      loadMembersOnly();
    } catch (error: any) {
      showToast(error.message || 'Failed to remove member', 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (currentUserRole !== 'admin') return;
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this project? This action cannot be undone.");
    if (confirmDelete) {
      try {
        await deleteProjectApi(projectId);
        router.push(ROUTES.PROJECTS);
      } catch (err: any) {
        showToast(err.message || 'Failed to delete project', 'error');
      }
    }
  };

  const canEditDetails = currentUserRole === 'admin' || currentUserRole === 'editor';
  const canManageMembers = currentUserRole === 'admin';

  return (
    <>
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: ROUTES.DASHBOARD },
            { label: 'Projects', href: ROUTES.PROJECTS },
            { label: isLoading ? 'Loading...' : project?.name || 'Project', href: `/dashboard/projects/${projectId}` },
            { label: 'Settings' }
          ]}
        />
      </div>

      <div className="mb-6 flex justify-between items-center">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/dashboard/projects/${projectId}`)}
          className="flex items-center gap-1.5 cursor-pointer shadow-none border-gray-200"
        >
          <ArrowLeft size={15} />
          Back to Project
        </Button>

        {currentUserRole && (
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="text-gray-500">Your Role:</span>
            <Badge 
              variant={currentUserRole === 'admin' ? 'danger' : currentUserRole === 'editor' ? 'info' : 'default'}
              className="uppercase text-[10px] tracking-wider"
            >
              {currentUserRole}
            </Badge>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error || !project ? (
        <div className="flex flex-col items-center justify-center text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/60 p-6 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 border border-rose-100 dark:border-rose-900/30 mb-4 shadow-sm">
            <AlertCircle size={26} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {error?.includes('Forbidden') ? 'Access Denied' : 'Project Not Found'}
          </h3>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1.5 max-w-sm mb-6 leading-relaxed">
            {error || 'You do not have permission to view these settings.'}
          </p>
          <Button variant="primary" size="md" onClick={() => router.push(ROUTES.PROJECTS)}>
            Return to Projects List
          </Button>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <Settings className="text-gray-700 dark:text-gray-300 w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Project Settings</h1>
              <p className="text-sm text-gray-500">Manage preferences and access control for {project.name}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-3.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === 'details' 
                    ? 'border-blue-500 text-blue-600 bg-white dark:bg-gray-800' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }`}
              >
                <Settings size={16} />
                General Details
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`px-6 py-3.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === 'members' 
                    ? 'border-blue-500 text-blue-600 bg-white dark:bg-gray-800' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }`}
              >
                <Users size={16} />
                Members & Roles
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab === 'details' && (
                <div className="space-y-6 max-w-2xl">
                  {!canEditDetails && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 text-sm flex gap-2">
                      <Info size={18} className="shrink-0 mt-0.5" />
                      You have Viewer access to this project. You cannot modify these settings.
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Project Name</label>
                      <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        disabled={!canEditDetails}
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                      <textarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={!canEditDetails}
                        rows={4}
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:bg-gray-50 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                      <select 
                        value={status} 
                        onChange={(e) => setStatus(e.target.value as any)}
                        disabled={!canEditDetails}
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:bg-gray-50"
                      >
                        <option value="active">Active</option>
                        <option value="on-hold">On Hold</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  {canEditDetails && (
                    <div className="pt-4 flex justify-end">
                      <Button variant="primary" onClick={handleSaveDetails} disabled={isSaving || !name.trim()}>
                        {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  )}

                  {currentUserRole === 'admin' && (
                    <div className="pt-8 mt-8 border-t border-red-100 dark:border-red-900/30">
                      <h4 className="text-red-600 font-bold mb-2">Danger Zone</h4>
                      <p className="text-sm text-gray-500 mb-4">Deleting this project will permanently remove all associated tasks, columns, and data.</p>
                      <Button variant="danger" onClick={handleDeleteProject}>
                        Delete Project
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'members' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Team Members</h3>
                      <p className="text-sm text-gray-500">Manage who has access to this project.</p>
                    </div>
                    {canManageMembers && (
                      <Button variant="primary" size="sm" onClick={() => setIsAddMemberOpen(true)}>
                        Add Member
                      </Button>
                    )}
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <MemberList 
                      members={members}
                      onRoleChange={canManageMembers ? handleRoleChange : undefined}
                      onRemove={canManageMembers ? setMemberToRemove : undefined}
                      isUpdating={isUpdatingRole}
                      readOnly={!canManageMembers}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals & Toasts */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSubmit={handleAddMemberSubmit}
        existingMembers={members}
      />

      <Modal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title="Remove Member"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Are you sure you want to remove <span className="font-bold">{memberToRemove?.name}</span> from this project?
          </p>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setMemberToRemove(null)} disabled={isRemoving} fullWidth>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemoveConfirm} isLoading={isRemoving} disabled={isRemoving} fullWidth>
              Remove
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Dynamic status toast message alerts */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={classNames(
              'pointer-events-auto flex items-center gap-3.5 p-4 rounded-xl shadow-xl border animate-slide-in-right bg-white dark:bg-gray-800',
              toast.type === 'success'
                ? 'border-green-100 dark:border-green-900/30 text-green-800 dark:text-green-300'
                : toast.type === 'error'
                  ? 'border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-300'
                  : 'border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-300'
            )}
            role="alert"
          >
            <div className="flex-shrink-0">
              {toast.type === 'success' ? (
                <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-950/20 flex items-center justify-center text-green-500 animate-pulse">
                  <CheckCircle2 size={16} />
                </div>
              ) : toast.type === 'error' ? (
                <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-500 animate-bounce">
                  <AlertCircle size={16} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-500">
                  <Info size={16} />
                </div>
              )}
            </div>

            <div className="flex-1 text-xs font-bold leading-normal">{toast.message}</div>

            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
