'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { Breadcrumb } from '@/components/Breadcrumb';
import { AlertTriangle, Plus, X, CheckCircle2, Info, Search, Filter, RefreshCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import {
  getBlockers,
  getBlockerById,
  createBlocker,
  updateBlocker,
  deleteBlocker,
  type Blocker,
} from '@/lib/api/blockers';
import { fetchProjects, fetchProjectMembers } from '@/lib/api/projects';
import { fetchUsers } from '@/lib/api/users';
import type { Project, ProjectMember } from '@/components/projects/ProjectCard';
import { BlockerDetailsModal } from '@/components/blockers/BlockerDetailsModal';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  projectId: z.string().min(1, 'Project is required'),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']),
  escalationLevel: z.enum(['none', 'team', 'management', 'executive']).optional(),
  helpNeededFromId: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ─── Badge colour maps ────────────────────────────────────────────────────────

const severityVariant: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  Low: 'success',
  Medium: 'warning',
  High: 'danger',
  Critical: 'danger',
};

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  Open: 'danger',
  'In Progress': 'warning',
  Resolved: 'success',
  Closed: 'info',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BlockersClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<{id: number, name: string}[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlocker, setEditingBlocker] = useState<Blocker | null>(null);
  const [blockerToDelete, setBlockerToDelete] = useState<Blocker | null>(null);
  const [selectedBlocker, setSelectedBlocker] = useState<Blocker | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Filters & Sorting State ────────────────────────────────────────────────
  const [filterSearch, setFilterSearch] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEscalation, setFilterEscalation] = useState('all');
  const [filterLoggedBy, setFilterLoggedBy] = useState('all');
  const [filterAssignedTo, setFilterAssignedTo] = useState('all');
  
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 20;

  // Track if filters are active
  const hasActiveFilters = filterSearch || filterProject !== 'all' || filterStatus !== 'all' || filterEscalation !== 'all' || filterLoggedBy !== 'all' || filterAssignedTo !== 'all';

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { severity: 'Medium', status: 'Open', escalationLevel: 'none' },
  });

  const selectedProjectId = watch('projectId');
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectMembers(selectedProjectId)
        .then(setProjectMembers)
        .catch(err => {
          console.error('Failed to load project members', err);
          setProjectMembers([]);
        });
    } else {
      setProjectMembers([]);
    }
  }, [selectedProjectId]);

  const currentUserRole = projectMembers.find(m => String(m.userId) === String(user?.id))?.role?.toLowerCase() || 'viewer';
  const isGlobalAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'super admin';
  const canAssign = isGlobalAdmin || ['admin', 'manager', 'editor', 'member'].includes(currentUserRole);

  // ─── Load data ──────────────────────────────────────────────────────────────

  const loadBlockers = async () => {
    setIsLoading(true);
    try {
      const data = await getBlockers({
        projectId: filterProject !== 'all' ? filterProject : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        escalation: filterEscalation !== 'all' ? filterEscalation : undefined,
        loggedBy: filterLoggedBy !== 'all' ? filterLoggedBy : undefined,
        assignedTo: filterAssignedTo !== 'all' ? filterAssignedTo : undefined,
        search: filterSearch || undefined,
        sortBy,
        sortOrder,
        page,
        limit
      });
      setBlockers(data.data);
      setTotalPages(data.meta.totalPages);
      setTotalRecords(data.meta.total);
    } catch (err) {
      console.error('Failed to load blockers:', err);
      toast('Failed to load blockers from database', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBlockers();
  }, [filterProject, filterStatus, filterEscalation, filterLoggedBy, filterAssignedTo, filterSearch, sortBy, sortOrder, page]);

  useEffect(() => {
    const init = async () => {
      try {
        const [projData, usersData] = await Promise.all([
          fetchProjects().then(data => data.filter((p: Project) => p.status !== 'completed')),
          fetchUsers()
        ]);
        setProjects(projData);
        setUsers(usersData);
      } catch (err) {
        console.error('Failed to initialize blocker data:', err);
      }
    };
    init();
  }, []);

  // Handle ?blockerId= URL parameter
  useEffect(() => {
    const blockerIdParam = searchParams.get('blockerId');
    if (blockerIdParam) {
      const openBlockerFromUrl = async () => {
        try {
          const blocker = await getBlockerById(parseInt(blockerIdParam, 10));
          if (blocker) {
            setSelectedBlocker(blocker);
            setIsDetailsModalOpen(true);
          }
        } catch (err: any) {
          console.error('Failed to load blocker from URL parameter', err);
          if (err.status === 404 || err.message?.includes('Not Found')) {
            toast('This ticket may have been deleted or you do not have permission to view it.', 'error');
          } else {
            toast('Failed to load the ticket from the notification.', 'error');
          }
        } finally {
          // Always remove the parameter from the URL to prevent reopening on reload or getting stuck
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('blockerId');
          window.history.replaceState({}, '', newUrl.toString());
        }
      };
      openBlockerFromUrl();
    }
  }, [searchParams]);

  const resetFilters = () => {
    setFilterSearch('');
    setFilterProject('all');
    setFilterStatus('all');
    setFilterEscalation('all');
    setFilterLoggedBy('all');
    setFilterAssignedTo('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1); // Reset to first page on sort
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <span className="opacity-0 group-hover:opacity-50 ml-1"><ChevronDown size={14} /></span>;
    return sortOrder === 'asc' ? <span className="ml-1 text-blue-500"><ChevronUp size={14} /></span> : <span className="ml-1 text-blue-500"><ChevronDown size={14} /></span>;
  };

  // ─── Modal helpers ───────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingBlocker(null);
    reset({ severity: 'Medium', status: 'Open', escalationLevel: 'none' });
    setIsModalOpen(true);
  };

  const openEdit = (blocker: Blocker) => {
    setEditingBlocker(blocker);
    reset({
      title: blocker.title,
      description: blocker.description ?? '',
      projectId: blocker.projectId,
      severity: blocker.severity as FormData['severity'],
      status: blocker.status as FormData['status'],
      escalationLevel: (blocker.escalationLevel as FormData['escalationLevel']) ?? 'none',
      helpNeededFromId: blocker.helpNeededFromId?.toString() ?? '',
      notes: blocker.notes ?? '',
    });
    setIsModalOpen(true);
  };

  const openDetails = (blocker: Blocker) => {
    setSelectedBlocker(blocker);
    setIsDetailsModalOpen(true);
  };

  const handleBlockerUpdated = (updatedBlocker: Blocker) => {
    setBlockers(prev => prev.map(b => b.id === updatedBlocker.id ? updatedBlocker : b));
    if (selectedBlocker?.id === updatedBlocker.id) {
      setSelectedBlocker(updatedBlocker);
    }
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (editingBlocker) {
        const updated = await updateBlocker(editingBlocker.id, {
          title: data.title,
          description: data.description || undefined,
          severity: data.severity,
          status: data.status,
          escalationLevel: data.escalationLevel || 'none',
          helpNeededFromId: data.helpNeededFromId ? parseInt(data.helpNeededFromId) : undefined,
          notes: data.notes || undefined,
        });
        setBlockers((prev) => prev.map((b) => (b.id === editingBlocker.id ? updated : b)));
        toast(`Blocker "${data.title}" updated successfully!`, 'success');
      } else {
        const created = await createBlocker({
          title: data.title,
          description: data.description || undefined,
          severity: data.severity,
          status: data.status,
          escalationLevel: data.escalationLevel || 'none',
          projectId: data.projectId,
          loggedById: parseInt(user.id),
          helpNeededFromId: data.helpNeededFromId ? parseInt(data.helpNeededFromId) : undefined,
          notes: data.notes || undefined,
        });
        setBlockers((prev) => [created, ...prev]);
        toast(`Blocker "${data.title}" logged successfully!`, 'success');
      }
      setIsModalOpen(false);
      loadBlockers(); // Reload to respect current sorting/pagination
    } catch (err) {
      console.error('Error saving blocker:', err);
      toast('Failed to save blocker. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────────

  const handleConfirmDelete = async () => {
    if (!blockerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteBlocker(blockerToDelete.id);
      setBlockers((prev) => prev.filter((b) => b.id !== blockerToDelete.id));
      toast(`Blocker "${blockerToDelete.title}" deleted.`, 'info');
      setBlockerToDelete(null);
      loadBlockers(); // Reload to respect pagination
    } catch (err) {
      console.error('Error deleting blocker:', err);
      toast('Failed to delete blocker.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Stats (Approximated based on current page or could be fetched separately) ──

  // For real stats across ALL blockers, we'd need a separate endpoint.
  // Using the visible list for now.
  const stats = {
    total: totalRecords,
    open: blockers.filter((b) => b.status === 'Open').length,
    resolved: blockers.filter((b) => b.status === 'Resolved').length,
    critical: blockers.filter((b) => b.severity === 'Critical').length,
  };

  // ─── Input class ─────────────────────────────────────────────────────────────

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white';
  const filterSelectCls = 'w-full md:w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white appearance-none';

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <PermissionPageGuard module="blockers">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'Blockers' }]} />
      </div>

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Tickets & Blockers</h1>
          <p className="text-gray-500 text-sm mt-1">
            Centralized dashboard for all project tickets, escalations, and help requests.
          </p>
        </div>
        <PermissionGuard require="blockers.create">
          <Button variant="primary" size="lg" onClick={openCreate}>
            <Plus size={20} />
            Log Blocker
          </Button>
        </PermissionGuard>
      </div>

      {/* Filters Toolbar */}
      <Card variant="outlined" className="mb-6 bg-white dark:bg-gray-800 p-4 shadow-sm border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter & Search</h3>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="ml-auto flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
              <RefreshCw size={12} />
              Reset Filters
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by title or description..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={filterSearch}
              onChange={(e) => {
                setFilterSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Project */}
          <select className={filterSelectCls} value={filterProject} onChange={(e) => { setFilterProject(e.target.value); setPage(1); }}>
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Status */}
          <select className={filterSelectCls} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          {/* Logged By */}
          <select className={filterSelectCls} value={filterLoggedBy} onChange={(e) => { setFilterLoggedBy(e.target.value); setPage(1); }}>
            <option value="all">Logged By: All</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          {/* Assigned To */}
          <select className={filterSelectCls} value={filterAssignedTo} onChange={(e) => { setFilterAssignedTo(e.target.value); setPage(1); }}>
            <option value="all">Assigned: All</option>
            <option value="unassigned">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          {/* Escalation (Optional extra row item or pushed to next line if needed, currently fits in 6 cols) */}
          <select className={filterSelectCls} value={filterEscalation} onChange={(e) => { setFilterEscalation(e.target.value); setPage(1); }}>
            <option value="all">All Escalations</option>
            <option value="none">Not Escalated</option>
            <option value="team,management,executive">Escalated (Any)</option>
            <option value="team">Team Level</option>
            <option value="management">Management Level</option>
            <option value="executive">Executive Level</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card variant="outlined" className="overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-gray-500 font-medium text-sm mt-4">Loading tickets...</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group" onClick={() => toggleSort('title')}>
                      <div className="flex items-center">Title <SortIcon field="title" /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group" onClick={() => toggleSort('projectId')}>
                      <div className="flex items-center">Project <SortIcon field="projectId" /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group" onClick={() => toggleSort('severity')}>
                      <div className="flex items-center">Priority <SortIcon field="severity" /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group" onClick={() => toggleSort('status')}>
                      <div className="flex items-center">Status <SortIcon field="status" /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Logged By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group" onClick={() => toggleSort('assignee')}>
                      <div className="flex items-center">Assigned To <SortIcon field="assignee" /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group" onClick={() => toggleSort('escalationLevel')}>
                      <div className="flex items-center">Escalation <SortIcon field="escalationLevel" /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group" onClick={() => toggleSort('createdAt')}>
                      <div className="flex items-center">Created At <SortIcon field="createdAt" /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {blockers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <AlertTriangle size={32} className="text-gray-300 dark:text-gray-600 mb-3" />
                          <p className="text-gray-600 dark:text-gray-300 font-semibold mb-1">No records found</p>
                          <p className="text-gray-400 text-xs">Try adjusting your filters or search criteria.</p>
                          {hasActiveFilters && (
                            <Button variant="secondary" size="sm" className="mt-4" onClick={resetFilters}>
                              Clear all filters
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    blockers.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer" onClick={() => openDetails(b)}>{b.title}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.project?.name ?? b.projectId}</td>
                        <td className="px-4 py-3">
                          <Badge variant={severityVariant[b.severity] ?? 'default'}>{b.severity}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant[b.status] ?? 'default'}>{b.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.loggedBy?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.helpNeededFrom?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={b.escalationLevel !== 'none' ? 'danger' : 'default'}>
                            {b.escalationLevel === 'none' ? 'No' : b.escalationLevel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button variant="secondary" size="sm" onClick={() => openDetails(b)}>View</Button>
                            <PermissionGuard require="blockers.update">
                              <Button variant="secondary" size="sm" onClick={() => openEdit(b)}>Edit</Button>
                            </PermissionGuard>
                            <PermissionGuard require="blockers.delete">
                              <Button variant="danger" size="sm" onClick={() => setBlockerToDelete(b)}>Delete</Button>
                            </PermissionGuard>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, totalRecords)}</span> of <span className="font-medium">{totalRecords}</span> results
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    disabled={page === 1} 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={16} /> Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const p = i + 1;
                      // Simple pagination logic: show first, last, current, and adjacent
                      if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                        return (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={classNames(
                              "w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                              page === p 
                                ? "bg-blue-600 text-white" 
                                : "text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                            )}
                          >
                            {p}
                          </button>
                        );
                      }
                      if (p === page - 2 || p === page + 2) {
                        return <span key={p} className="text-gray-400">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    disabled={page === totalPages} 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBlocker ? 'Edit Blocker' : 'Log New Blocker'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input {...register('title')} placeholder="Brief description of the blocker" className={inputCls} />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register('description')} rows={3} placeholder="Additional context or details" className={classNames(inputCls, 'resize-none')} />
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
            <select {...register('projectId')} className={inputCls} disabled={!!editingBlocker}>
              <option value="">Select a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {errors.projectId && <p className="text-xs text-red-500 mt-1">{errors.projectId.message}</p>}
          </div>

          {/* Severity + Status side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity *</label>
              <select {...register('severity')} className={inputCls}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
              <select {...register('status')} className={inputCls}>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Escalation Level & Assigned To side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Escalation Level</label>
              <select {...register('escalationLevel')} className={inputCls}>
                <option value="none">None</option>
                <option value="team">Team</option>
                <option value="management">Management</option>
                <option value="executive">Executive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <select 
                {...register('helpNeededFromId')} 
                className={inputCls} 
                disabled={!selectedProjectId || !canAssign}
              >
                <option value="">Unassigned</option>
                {projectMembers.map((m, index) => (
                  <option key={`${m.userId}-${index}`} value={m.userId}>{m.name || `User ${m.userId}`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Any additional notes or context" className={classNames(inputCls, 'resize-none')} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" isLoading={isSubmitting}>
              {editingBlocker ? 'Update Blocker' : 'Log Blocker'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!blockerToDelete} onClose={() => !isDeleting && setBlockerToDelete(null)} title="Confirm Deletion" size="sm">
        <div className="flex flex-col items-center text-center p-2">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4 shadow-sm animate-pulse">
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Blocker?</h3>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-gray-800">"{blockerToDelete?.title}"</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setBlockerToDelete(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={handleConfirmDelete} isLoading={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Details Modal */}
      <BlockerDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        blocker={selectedBlocker}
        currentUserId={user?.id}
        onBlockerUpdated={handleBlockerUpdated}
      />

    </PermissionPageGuard>
  );
}