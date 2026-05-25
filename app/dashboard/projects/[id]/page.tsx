'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Skeleton } from '@/components/Skeleton';
import { ROUTES } from '@/lib/constants';
import { 
  ArrowLeft, 
  Briefcase, 
  Calendar, 
  Users, 
  LayoutDashboard, 
  Clock, 
  CheckSquare, 
  BarChart3,
  AlertCircle,
  Plus,
  CheckCircle2,
  Info,
  X
} from 'lucide-react';
import { fetchProjectById, fetchProjectMembers, addProjectMemberApi, updateProjectMemberRoleApi, removeProjectMemberApi } from '@/lib/api/projects';
import { Project, ProjectMember } from '@/components/projects/ProjectCard';
import { MemberList } from '@/components/projects/MemberList';
import { AddMemberModal } from '@/components/projects/AddMemberModal';
import { Modal } from '@/components/Modal';
import { classNames } from '@/lib/utils';

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState<boolean>(true);
  
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | number | null>(null);

  interface ToastMessage { id: string; message: string; type: 'success' | 'error' | 'info'; }
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const loadProjectAndMembers = async () => {
    setIsLoading(true);
    setIsMembersLoading(true);
    setError(null);
    try {
      const data = await fetchProjectById(projectId);
      setProject(data);
      const membersData = await fetchProjectMembers(projectId);
      setMembers(membersData);
    } catch (err: any) {
      console.error('Failed to load project details:', err);
      setError(err.message || 'The requested project could not be loaded or does not exist.');
    } finally {
      setIsLoading(false);
      setIsMembersLoading(false);
    }
  };

  const loadMembersOnly = async () => {
    setIsMembersLoading(true);
    try {
      const membersData = await fetchProjectMembers(projectId);
      setMembers(membersData);
    } catch (err: any) {
      console.error('Failed to load members:', err);
    } finally {
      setIsMembersLoading(false);
    }
  }

  useEffect(() => {
    if (projectId) {
      loadProjectAndMembers();
    }
  }, [projectId]);

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

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: ROUTES.DASHBOARD },
            { label: 'Projects', href: ROUTES.PROJECTS },
            { label: isLoading ? 'Loading...' : project?.name || 'Project Details' },
          ]}
        />
      </div>

      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(ROUTES.PROJECTS)}
          className="flex items-center gap-1.5 cursor-pointer shadow-none border-gray-200"
        >
          <ArrowLeft size={15} />
          Back to Projects
        </Button>
      </div>

      {isLoading ? (
        /* LOADING STATE SKELETON */
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2.5 w-1/3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card variant="outlined">
                <CardBody className="space-y-4 p-6">
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </CardBody>
              </Card>
            </div>
            <div className="space-y-6">
              <Card variant="outlined">
                <CardBody className="space-y-4 p-6">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      ) : error || !project ? (
        /* ERROR STATE */
        <div className="flex flex-col items-center justify-center text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/60 p-6 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 border border-rose-100 dark:border-rose-900/30 mb-4 shadow-sm">
            <AlertCircle size={26} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Project Not Found</h3>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1.5 max-w-sm mb-6 leading-relaxed">
            {error || 'The requested project could not be found. It may have been deleted or you do not have permission to view it.'}
          </p>
          <Button variant="primary" size="md" onClick={() => router.push(ROUTES.PROJECTS)}>
            Return to Projects List
          </Button>
        </div>
      ) : (
        /* PROJECT DETAILS DASHBOARD SUCCESS STATE */
        <div className="space-y-6 animate-fade-in">
          {/* Header section with status badge */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-3">
                <Briefcase className="text-blue-500 w-7 h-7" />
                {project.name}
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1.5 mt-1">
                <Clock size={13} />
                Last updated on {formatDate(project.updatedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={project.status === 'active' ? 'success' : 'default'}
                className="capitalize text-xs font-bold px-3 py-1 tracking-wider shadow-sm shrink-0"
              >
                {project.status} status
              </Badge>
            </div>
          </div>

          {/* Details layout: main columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main description and interactive stats */}
            <div className="lg:col-span-2 space-y-6">
              {/* Project Description Card */}
              <Card variant="outlined" className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm">
                <CardHeader className="border-b border-gray-100 bg-white">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Project Workspace Overview</h3>
                </CardHeader>
                <CardBody className="p-6 space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                    {project.description}
                  </p>
                </CardBody>
              </Card>

              {/* ERP Project Workspace Mockup Feature */}
              <Card variant="outlined" className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm">
                <CardHeader className="border-b border-gray-100 bg-white flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Project Deliverables & Timeline</h3>
                  <Badge variant="info" className="text-[9px] font-bold tracking-widest px-2 uppercase shadow-sm">
                    Premium Workspace
                  </Badge>
                </CardHeader>
                <CardBody className="p-6 text-center flex flex-col items-center justify-center min-h-[220px] bg-slate-50/50 dark:bg-slate-900/40 rounded-b-lg">
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-500 mb-3 border border-blue-100 dark:border-blue-900/30 shadow-sm">
                    <BarChart3 size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200">Interactive Workspace Details</h4>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1.5 mb-5 max-w-sm leading-relaxed">
                    Interactive milestones, Gantt timelines, performance trackers, and financial audit worksheets are presently under construction for this project slot.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="primary" size="sm" onClick={() => router.push('/dashboard/tasks')}>
                      <CheckSquare size={14} className="mr-1.5" />
                      View Board Tasks
                    </Button>
                    <Button variant="secondary" size="sm" disabled>
                      <LayoutDashboard size={14} className="mr-1.5" />
                      Analytics Hub
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Sidebar metadata card */}
            <div className="space-y-6">
              {/* Project Members List */}
              <Card variant="outlined" className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col">
                <CardHeader className="border-b border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-500" />
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Project Directory</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md shadow-sm">
                      {members.length} Total
                    </span>
                    <Button variant="primary" size="sm" className="px-2 py-1 text-[10px] h-7" onClick={() => setIsAddMemberOpen(true)}>
                      <Plus size={12} className="mr-1" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardBody className="p-0 flex-1">
                  {isMembersLoading ? (
                    <div className="p-6 space-y-4">
                      <Skeleton className="h-10 w-full rounded-md" />
                      <Skeleton className="h-10 w-full rounded-md" />
                      <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                  ) : (
                    <MemberList 
                      members={members}
                      onRoleChange={handleRoleChange}
                      onRemove={setMemberToRemove}
                      isUpdating={isUpdatingRole}
                    />
                  )}
                </CardBody>
              </Card>

              {/* Date Metadata details card */}
              <Card variant="outlined" className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm">
                <CardBody className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar size={16} className="text-gray-400 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400">Created Workspace</h4>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mt-0.5">
                        {formatDate(project.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Briefcase size={16} className="text-gray-400 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400">Access ID Reference</h4>
                      <code className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-900/10 px-2 py-1 rounded border border-blue-100/20 mt-1 block">
                        {project.id}
                      </code>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSubmit={handleAddMemberSubmit}
        existingMembers={members}
      />

      {/* Remove Member Confirmation Dialog Modal */}
      <Modal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title="Remove Member"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
            Are you sure you want to remove <span className="text-blue-600 dark:text-blue-400">{memberToRemove?.name}</span> from this project?
          </p>
          <p className="text-xs text-rose-500 dark:text-rose-400 leading-relaxed font-medium">
            This user will immediately lose access to this project workspace.
          </p>
          <div className="flex gap-3 pt-5 border-t border-gray-100 dark:border-gray-700/50 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setMemberToRemove(null)}
              disabled={isRemoving}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleRemoveConfirm}
              isLoading={isRemoving}
              disabled={isRemoving}
              fullWidth
            >
              Remove Member
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
