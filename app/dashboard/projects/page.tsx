'use client';

import { useState, useEffect } from 'react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Skeleton, TableSkeleton } from '@/components/Skeleton';
import { Modal } from '@/components/Modal';
import { ROUTES } from '@/lib/constants';
import { 
  Plus, 
  Search, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  X, 
  FolderOpen,
  Briefcase
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useToast } from '@/lib/hooks/useToast';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { ViewToggle } from '@/components/ViewToggle';
import { useViewMode } from '@/lib/hooks/useViewMode';
import { ProjectCard, Project } from '@/components/projects/ProjectCard';
import { ProjectList } from '@/components/projects/ProjectList';
import { CreateProjectModal, ProjectFormData } from '@/components/projects/CreateProjectModal';
import { fetchProjects, createProjectApi, updateProjectApi, archiveProjectApi, restoreProjectApi, deleteProjectApi } from '@/lib/api/projects';
import { projectTabBucket, PROJECT_STATUSES, type ProjectTab } from '@/lib/projects/projectStatus';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [viewMode, setViewMode] = useViewMode('projects');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & submission states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>('active');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [projectToArchive, setProjectToArchive] = useState<Project | null>(null);
  const [isArchiving, setIsArchiving] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const { toast } = useToast();

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setError(err.message || 'Failed to fetch projects from the ERP backend server.');
      toast('Failed to sync projects from server', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleOpenCreateModal = () => {
    setProjectToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project: Project, e: React.MouseEvent) => {
    setProjectToEdit(project);
    setIsModalOpen(true);
  };

  const handleOpenArchiveModal = (project: Project, e: React.MouseEvent) => {
    setProjectToArchive(project);
  };

  const handleArchiveConfirm = async () => {
    if (!projectToArchive) return;
    setIsArchiving(true);
    try {
      await archiveProjectApi(projectToArchive.id);
      toast(`Project "${projectToArchive.name}" has been successfully archived!`, 'info');
      setProjectToArchive(null);
      loadProjects(); // Refresh listing
    } catch (err: any) {
      console.error('Failed to archive project:', err);
      toast(err.message || 'Failed to archive project. Try again.', 'error');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestoreClick = async (project: Project, e: React.MouseEvent) => {
    try {
      await restoreProjectApi(project.id);
      toast(`Project "${project.name}" has been successfully restored!`, 'success');
      loadProjects(); // Refresh listing
    } catch (err: any) {
      console.error('Failed to restore project:', err);
      toast(err.message || 'Failed to restore project. Try again.', 'error');
    }
  };

  const handleOpenDeleteModal = (project: Project, e: React.MouseEvent) => {
    setProjectToDelete(project);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProjectApi(projectToDelete.id);
      toast(`Project "${projectToDelete.name}" has been permanently deleted.`, 'info');
      setProjectToDelete(null);
      loadProjects(); // Refresh listing
    } catch (err: any) {
      console.error('Failed to permanently delete project:', err);
      toast(err.message || 'Failed to delete project. Try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateProjectSubmit = async (formData: ProjectFormData) => {
    setIsSubmitting(true);
    try {
      if (projectToEdit) {
        // Edit Project submission
        await updateProjectApi(projectToEdit.id, formData);
        toast(`Project "${formData.name}" was successfully updated!`, 'success');
      } else {
        // Create Project submission
        await createProjectApi(formData);
        toast(`Project "${formData.name}" was successfully created!`, 'success');
      }
      setIsModalOpen(false);
      setProjectToEdit(null);
      loadProjects(); // Refresh project list from backend
    } catch (err: any) {
      console.error('Failed to save project:', err);
      toast(err.message || 'Failed to save project. Try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real-time filtering logic based on project name
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Live, status-driven tab counts — one bucket per project status. Every
  // project maps to exactly one status tab, so the counts sum to the total.
  const tabCounts = projects.reduce((acc, p) => {
    const bucket = projectTabBucket(p);
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {} as Record<ProjectTab, number>);

  // Distinct categories present in the loaded projects (live) for the filter.
  const categoryOptions = Array.from(
    new Set(projects.map((p) => (p.category || '').trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  // Tab + category filters compose with the search (filteredProjects) above.
  const displayedProjects = filteredProjects.filter(
    (project) =>
      projectTabBucket(project) === activeTab &&
      (selectedCategory === 'all' || (project.category || '') === selectedCategory),
  );

  // Human label for the selected status tab — drives the empty-state copy.
  const activeTabLabel = PROJECT_STATUSES.find((s) => s.value === activeTab)?.label ?? '';

  return (
    <PermissionPageGuard require="project.view" module="project">
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: ROUTES.DASHBOARD },
            { label: 'Projects' },
          ]}
        />
      </div>

      {/* Page Header */}
      <section className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2.5">
            <Briefcase className="text-blue-500 w-8 h-8" />
            My Projects
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm max-w-xl leading-relaxed">
            Manage your teams, view active workloads, and track project lifecycle deliverables at a glance.
          </p>
        </div>
        <PermissionGuard require="project.create">
          <Button 
            variant="primary" 
            size="lg"
            onClick={handleOpenCreateModal}
            className="shadow-sm shadow-blue-500/10 cursor-pointer self-start sm:self-center"
          >
            <Plus size={18} className="stroke-[2.5]" />
            Create Project
          </Button>
        </PermissionGuard>
      </section>

      {/* Search & View Mode Filters Bar */}
      <section className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        {/* Search input with prefix search icon */}
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by project name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300/80 dark:border-gray-700/60 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Category filter + View Toggle */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
            className="flex-1 sm:flex-none px-3 py-2 border border-gray-300/80 dark:border-gray-700/60 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all shadow-sm cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </section>

      {/* Status tabs — one per project status (status-driven, live counts).
          Driven by PROJECT_STATUSES, so editing that list adds/removes tabs. */}
      <div className="flex border-b border-gray-200 dark:border-gray-700/60 mb-6 bg-slate-50/20 dark:bg-gray-900/10 p-0.5 rounded-lg overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PROJECT_STATUSES.map((status) => {
          const selected = activeTab === status.value;
          const count = tabCounts[status.value] || 0;
          return (
            <button
              key={status.value}
              onClick={() => setActiveTab(status.value)}
              className={classNames(
                'shrink-0 px-5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 select-none focus:outline-none whitespace-nowrap',
                selected
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 font-bold bg-white dark:bg-gray-800/40 rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              <span>{status.label}</span>
              <span className={classNames(
                'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                selected
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content Displays & UI States */}
      <div className="min-h-[400px]">
        {isLoading ? (
          /* LOADING STATE: Custom skeleton grids or lists */
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-5/6" />
                    <Skeleton className="h-3.5 w-2/3" />
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-50 dark:border-gray-700/40 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        <Skeleton className="w-6 h-6 rounded-full" />
                        <Skeleton className="w-6 h-6 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <TableSkeleton />
          )
        ) : error ? (
          /* ERROR STATE: Failed to load message with reconnect CTA */
          <div className="flex flex-col items-center justify-center text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/60 p-6 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 border border-rose-100 dark:border-rose-900/30 mb-4 shadow-sm animate-pulse">
              <AlertCircle size={26} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Failed to load projects</h3>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1.5 max-w-sm mb-6 leading-relaxed">
              {error}
            </p>
            <Button variant="primary" size="md" onClick={loadProjects}>
              <RotateCw size={16} className="mr-2 animate-spin-hover" />
              Retry Connection
            </Button>
          </div>
        ) : displayedProjects.length === 0 ? (
          /* EMPTY STATE: Nice icon placeholder with appropriate instructions */
          <div className="flex flex-col items-center justify-center text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/60 p-6 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-gray-900/60 flex items-center justify-center text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700/50 mb-4 shadow-sm">
              <FolderOpen size={26} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {searchQuery
                ? 'No matching projects'
                : projects.length === 0
                  ? 'No projects yet'
                  : `No ${activeTabLabel} projects`}
            </h3>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1.5 max-w-sm mb-6 leading-relaxed">
              {searchQuery
                ? `We couldn't find any projects matching "${searchQuery}". Try editing your keywords.`
                : projects.length === 0
                  ? 'Get started by creating your first project.'
                  : `There are no ${activeTabLabel.toLowerCase()} projects right now. Try another status tab.`}
            </p>
            {!searchQuery && projects.length === 0 && (
              <Button variant="primary" size="md" onClick={handleOpenCreateModal}>
                <Plus size={16} className="mr-1.5 stroke-[2.5]" />
                Create your first project
              </Button>
            )}
            {searchQuery && (
              <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          /* SUCCESS STATE: Display grid or list */
          <div className="animate-fade-in">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-5">
                {displayedProjects.map((project) => (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                    onEdit={handleOpenEditModal} 
                    onArchive={handleOpenArchiveModal}
                    onRestore={handleRestoreClick}
                    onDelete={handleOpenDeleteModal}
                  />
                ))}
              </div>
            ) : (
              <ProjectList 
                projects={displayedProjects} 
                onEdit={handleOpenEditModal} 
                onArchive={handleOpenArchiveModal}
                onRestore={handleRestoreClick}
                onDelete={handleOpenDeleteModal}
              />
            )}
          </div>
        )}
      </div>

      {/* Create Project Modal popup */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setProjectToEdit(null);
        }}
        onSubmit={handleCreateProjectSubmit}
        isSubmitting={isSubmitting}
        projectToEdit={projectToEdit}
      />

      {/* Archive Project Confirmation Dialog Modal */}
      <Modal
        isOpen={!!projectToArchive}
        onClose={() => setProjectToArchive(null)}
        title="Archive Project"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
            Are you sure you want to archive this project?
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            You can restore this project later from archived projects.
          </p>
          <div className="flex gap-3 pt-5 border-t border-gray-100 dark:border-gray-700/50 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setProjectToArchive(null)}
              disabled={isArchiving}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleArchiveConfirm}
              isLoading={isArchiving}
              disabled={isArchiving}
              fullWidth
            >
              Archive
            </Button>
          </div>
        </div>
      </Modal>

      {/* Permanent Delete Confirmation Dialog Modal */}
      <Modal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        title="Permanently Delete Project"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
            Are you sure you want to permanently delete this project?
          </p>
          <p className="text-xs text-rose-500 dark:text-rose-400 leading-relaxed font-medium">
            This action is irreversible and will permanently delete all project workload details.
          </p>
          <div className="flex gap-3 pt-5 border-t border-gray-100 dark:border-gray-700/50 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setProjectToDelete(null)}
              disabled={isDeleting}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={isDeleting}
              disabled={isDeleting}
              fullWidth
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>

    </PermissionPageGuard>
  );
}
