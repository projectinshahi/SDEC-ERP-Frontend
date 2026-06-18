'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/lib/hooks/useToast';
import { useParams, useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Skeleton } from '@/components/Skeleton';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
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
  Upload,
  FileText,
  Bug
} from 'lucide-react';
import { fetchProjectById, fetchProjectMembers, bulkUpdateProjectMembersApi, updateProjectMemberRoleApi, removeProjectMemberApi, importProjectBacklogApi, fetchProjectAnalytics } from '@/lib/api/projects';
import { Project, ProjectMember } from '@/components/projects/ProjectCard';
import { MemberList } from '@/components/projects/MemberList';
import { AddMemberModal } from '@/components/projects/AddMemberModal';
import { ImportBacklogModal } from '@/components/projects/ImportBacklogModal';
import { Modal } from '@/components/Modal';
import { ProjectSprintsTable } from '@/components/projects/ProjectSprintsTable';
import { SprintStatsSidebar } from '@/components/projects/SprintStatsSidebar';
import { ProjectDocsLibrary } from '@/components/projects/docs/ProjectDocsLibrary';
import { StatCard } from '@/components/dashboard/StatCard';
import { classNames } from '@/lib/utils';
import { io, Socket } from 'socket.io-client';

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'editor' | 'viewer' | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isMembersLoading, setIsMembersLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'docs'>('overview');

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | number | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { user, isLoading: authIsLoading } = useAuth();

  const [stats, setStats] = useState({
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    openBugs: 0,
    teamMembers: 0
  });
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(true);
  const [isStatsError, setIsStatsError] = useState<boolean>(false);

  const getStatsData = async () => {
    try {
      setIsStatsLoading(true);
      setIsStatsError(false);
      const data = await fetchProjectAnalytics(projectId);
      setStats({
        totalTasks: data.totalTasks || 0,
        activeTasks: data.activeTasks || 0,
        completedTasks: data.completedTasks || 0,
        openBugs: data.openBugs || 0,
        teamMembers: data.teamMembers || 0
      });
    } catch (error) {
      setIsStatsError(true);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const loadProjectAndMembers = async () => {
    setIsLoading(true);
    setIsMembersLoading(true);
    setError(null);
    try {
      const data = await fetchProjectById(projectId);
      setProject(data);
      let membersData = await fetchProjectMembers(projectId);

      // If the members API returns empty but the project has members assigned,
      // derive ProjectMember objects from the project's members name array
      if ((!membersData || membersData.length === 0) && data.members && data.members.length > 0) {
        try {
          const { fetchUsers } = await import('@/lib/api/users');
          const allUsers = await fetchUsers();
          membersData = data.members.map((name: string, idx: number) => {
            const user = allUsers.find((u) => u.name.toLowerCase() === name.toLowerCase());
            return {
              id: user ? user.id : `derived-${idx}`,
              project_id: data.id,
              userId: user ? user.id : idx + 1,
              role: (idx === 0 ? 'admin' : 'editor') as 'admin' | 'editor' | 'viewer',
              name: name,
              email: user ? user.email : `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            };
          });
        } catch (userErr) {
          // If users fetch fails, still show members with basic info
          membersData = data.members.map((name: string, idx: number) => ({
            id: `derived-${idx}`,
            project_id: data.id,
            userId: idx + 1,
            role: (idx === 0 ? 'admin' : 'editor') as 'admin' | 'editor' | 'viewer',
            name: name,
            email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          }));
        }
      }

      setMembers(membersData);

      // Determine current user role
      if (user) {
        try {
          setCurrentUserId(Number(user.id) || null);
          const currentMember = membersData.find((m: ProjectMember) =>
            String(m.userId) === String(user.id) ||
            (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
          );
          if (currentMember) {
            setCurrentUserRole(currentMember.role);
          } else {
            const roleStr = user.role?.toLowerCase() || user.roleName?.toLowerCase() || '';
            if (roleStr.includes('admin') || roleStr === 'super admin') {
              setCurrentUserRole('admin');
            } else if (roleStr.includes('editor') || roleStr.includes('manager') || hasPermission('project.edit')) {
              setCurrentUserRole('editor');
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

  const canManageMembers = currentUserRole === 'admin' || hasPermission('project.manage_members');
  const canEditProject = hasPermission('project.edit') && currentUserRole !== 'viewer';
  const canViewSettings = canEditProject || canManageMembers;
  // Regression fix: the "Import Backlog" affordance silently disappeared because
  // commit 4ece463 over-tightened this gate to ALSO require global permissions,
  // hiding it from editors/admins who previously had it. Restore it
  // to the project-level capability — matching the original intent and
  // the backend authorization checkProjectRole(['admin','editor']) on POST /projects/:id/import.
  const canImportBacklog = currentUserRole === 'admin' || currentUserRole === 'editor';
  const canViewAnalytics = hasPermission('project.analytics');

  useEffect(() => {
    if (authIsLoading) return;

    let active = true;
    let socket: Socket | null = null;

    if (projectId && active) {
      loadProjectAndMembers();
      getStatsData();

      // Initialize Socket.io for dynamic updates
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const socketUrl = apiUrl.endsWith('/api') ? apiUrl.replace('/api', '') : apiUrl;

      const token = localStorage.getItem('token');
      socket = io(socketUrl, {
        auth: { token }
      });

      socket.on('connect', () => {
        socket?.emit('join_project_room', { projectId });
      });

      socket.on('project_analytics_updated', () => {
        getStatsData();
      });
    }

    return () => {
      active = false;
      if (socket && projectId) {
        socket.emit('leave_project_room', { projectId });
        socket.disconnect();
      }
    };
  }, [projectId, authIsLoading, user?.id]);

  const handleAddMemberSubmit = async (updatedMembers: any[]) => {
    try {
      await bulkUpdateProjectMembersApi(projectId, updatedMembers);
      toast('Members updated successfully!');
      setIsAddMemberOpen(false);
      loadMembersOnly();
    } catch (error: any) {
      toast(error.message || 'Failed to update members', 'error');
    }
  };

  const handleRoleChange = async (memberId: string | number, newRole: 'admin' | 'editor' | 'viewer') => {
    setIsUpdatingRole(memberId);
    try {
      await updateProjectMemberRoleApi(projectId, memberId, newRole);
      toast('Role updated successfully!');
      loadMembersOnly();
    } catch (error: any) {
      toast(error.message || 'Failed to update role', 'error');
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    try {
      await removeProjectMemberApi(projectId, memberToRemove.id);
      toast('Member removed successfully!');
      setMemberToRemove(null);
      loadMembersOnly();
    } catch (error: any) {
      toast(error.message || 'Failed to remove member', 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleImportBacklog = async (tasks: any[]) => {
    setIsImporting(true);
    try {
      const result = await importProjectBacklogApi(projectId, tasks);
      if (result.success) {
        // Defensive: tolerate a response that omits/partially fills summary so a
        // successful import never surfaces as a generic error.
        const summary: any = result.summary ?? {};
        const tasksImported = summary.tasksImported ?? 0;
        const skipped = summary.skippedDueToInvalidDate ?? 0;
        const boardsCreated = summary.boardsCreated ?? 0;
        const columnsCreated = summary.columnsCreated ?? 0;
        if (skipped > 0) {
          toast(`Imported: ${tasksImported} rows\nSkipped: ${skipped} rows\nReason: Invalid Date Format`);
        } else {
          toast(`Import completed successfully! Boards: ${boardsCreated}, Columns: ${columnsCreated}, Tasks: ${tasksImported}`);
        }
        setIsImportModalOpen(false);
        loadProjectAndMembers(); // Reload data
      } else {
        toast('Failed to import backlog.', 'error');
      }
    } catch (error: any) {
      toast(error.message || 'Error importing backlog', 'error');
    } finally {
      setIsImporting(false);
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
    <PermissionPageGuard require="project.view" module="project">
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
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {error?.includes('Forbidden') ? 'Access Denied' : 'Project Not Found'}
          </h3>
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
            <div className="flex items-center gap-3">
              <Badge
                variant={project.status === 'active' ? 'success' : 'default'}
                className="capitalize text-xs font-bold px-3 py-1 tracking-wider shadow-sm shrink-0"
              >
                {project.status} status
              </Badge>
              {canImportBacklog && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-2 border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <Upload size={14} />
                  Import Backlog
                </Button>
              )}
              {canViewSettings && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/dashboard/projects/${projectId}/settings`)}
                  className="flex items-center gap-2 border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  Settings
                </Button>
              )}
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('overview')}
              className={classNames(
                'pb-3 pt-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap outline-none',
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={classNames(
                'pb-3 pt-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap outline-none flex items-center gap-1.5',
                activeTab === 'docs'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              <FileText size={15} className={activeTab === 'docs' ? 'text-blue-500' : 'text-gray-400'} />
              Project Docs
            </button>
          </div>

          {/* Details layout: main columns */}
          {activeTab === 'overview' ? (
            <div className="space-y-6 animate-fade-in">
              {/* Project Analytics Cards */}
              {canViewAnalytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <StatCard
                    label="Total Tasks"
                    value={stats.totalTasks}
                    change=""
                    icon={BarChart3}
                    variant="info"
                    isLoading={isStatsLoading}
                    isError={isStatsError}
                    onRetry={getStatsData}
                  />
                  <StatCard
                    label="Active Tasks"
                    value={stats.activeTasks}
                    change=""
                    icon={CheckSquare}
                    variant="success"
                    isLoading={isStatsLoading}
                    isError={isStatsError}
                    onRetry={getStatsData}
                  />
                  <StatCard
                    label="Completed Tasks"
                    value={stats.completedTasks}
                    change=""
                    icon={CheckSquare}
                    variant="primary"
                    isLoading={isStatsLoading}
                    isError={isStatsError}
                    onRetry={getStatsData}
                  />
                  <StatCard
                    label="Open Bugs"
                    value={stats.openBugs}
                    change=""
                    icon={Bug}
                    variant="danger"
                    isLoading={isStatsLoading}
                    isError={isStatsError}
                    onRetry={getStatsData}
                  />
                  <StatCard
                    label="Team Members"
                    value={stats.teamMembers}
                    change=""
                    icon={Users}
                    variant="warning"
                    isLoading={isStatsLoading}
                    isError={isStatsError}
                    onRetry={getStatsData}
                  />
                </div>
              )}

              {canImportBacklog && (
                <Card variant="outlined" className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800/30 shadow-sm">
                  <CardBody className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                        <Upload size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100">Import Project Data</h3>
                        <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mt-1 max-w-xl">
                          Quickly bring your team's work into this workspace. Upload a CSV or Excel file to automatically generate sprints, boards, and populate tasks.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsImportModalOpen(true)}
                      className="shrink-0 shadow-sm"
                    >
                      <Upload size={14} className="mr-1.5" />
                      Import Backlog
                    </Button>
                  </CardBody>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Column (Left - 70%) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Project Description Card */}
                  <Card variant="outlined" className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 shadow-sm">
                    <CardHeader className="border-b border-gray-100 bg-white dark:bg-gray-800">
                      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Project Workspace Overview</h3>
                    </CardHeader>
                    <CardBody className="p-6 space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">
                        {project.description}
                      </p>
                    </CardBody>
                  </Card>

                  {/* Sprint Tracking Table */}
                  <ProjectSprintsTable projectId={projectId} userRole={currentUserRole} />
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
                        {canManageMembers && (
                          <Button variant="primary" size="sm" className="px-2 py-1 text-[10px] h-7" onClick={() => setIsAddMemberOpen(true)}>
                            <Users size={12} className="mr-1" />
                            Manage
                          </Button>
                        )}
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
                          onRoleChange={canManageMembers ? handleRoleChange : undefined}
                          onRemove={canManageMembers ? setMemberToRemove : undefined}
                          isUpdating={isUpdatingRole}
                          readOnly={!canManageMembers}
                        />
                      )}
                    </CardBody>
                  </Card>

                  {/* Minimal Sprint Stats Sidebar */}
                  {canViewAnalytics && (
                    <SprintStatsSidebar projectId={projectId} />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <ProjectDocsLibrary
                projectId={projectId}
                userRole={currentUserRole}
                currentUserId={currentUserId}
              />
            </div>
          )}
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

      {/* Import Backlog Modal */}
      <ImportBacklogModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportBacklog}
        isImporting={isImporting}
      />

      {/* Floating Dynamic status toast message alerts */}
    </PermissionPageGuard>
  );
}
