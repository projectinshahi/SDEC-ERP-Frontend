'use client';

import { useState, useEffect } from 'react';
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
import { AlertTriangle, Plus, X, CheckCircle2, Info } from 'lucide-react';
import { classNames } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import {
  getBlockers,
  createBlocker,
  updateBlocker,
  deleteBlocker,
  type Blocker,
} from '@/lib/api/blockers';
import { fetchProjects } from '@/lib/api/projects';
import type { Project } from '@/components/projects/ProjectCard';

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

  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlocker, setEditingBlocker] = useState<Blocker | null>(null);
  const [blockerToDelete, setBlockerToDelete] = useState<Blocker | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { severity: 'Medium', status: 'Open', escalationLevel: 'none' },
  });

  // ─── Load data ──────────────────────────────────────────────────────────────

  const loadBlockers = async () => {
    try {
      const data = await getBlockers();
      setBlockers(data);
    } catch (err) {
      console.error('Failed to load blockers:', err);
      toast('Failed to load blockers from database', 'error');
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([
        loadBlockers(),
        fetchProjects()
          .then((data) => setProjects(data.filter((p: Project) => p.status !== 'completed')))
          .catch(console.error),
      ]);
      setIsLoading(false);
    };
    init();
  }, []);

  // ─── Toasts ─────────────────────────────────────────────────────────────────

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
    } catch (err) {
      console.error('Error deleting blocker:', err);
      toast('Failed to delete blocker.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Stats ───────────────────────────────────────────────────────────────────

  const stats = {
    total: blockers.length,
    open: blockers.filter((b) => b.status === 'Open').length,
    resolved: blockers.filter((b) => b.status === 'Resolved').length,
    critical: blockers.filter((b) => b.severity === 'Critical').length,
  };

  // ─── Input class ─────────────────────────────────────────────────────────────

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white';

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
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Blockers</h1>
          <p className="text-gray-500 text-sm mt-1">
            Centralized dashboard for all project blockers, escalations, and help requests.
          </p>
        </div>
        <PermissionGuard require="blockers.create">
          <Button variant="primary" size="lg" onClick={openCreate}>
            <Plus size={20} />
            Log Blocker
          </Button>
        </PermissionGuard>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Blockers', value: stats.total, color: 'text-blue-600' },
          { label: 'Open', value: stats.open, color: 'text-red-500' },
          { label: 'Resolved', value: stats.resolved, color: 'text-green-500' },
          { label: 'Critical', value: stats.critical, color: 'text-orange-500' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <div className="flex flex-col items-center py-5">
              <span className={classNames('text-3xl font-bold', color)}>{value}</span>
              <span className="text-xs text-zinc-500 mt-1">{label}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card variant="outlined" className="overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-gray-500 font-bold text-xs mt-4">Loading blockers...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-900">
                <tr>
                  {['Title', 'Project', 'Severity', 'Status', 'Logged By', 'Help Needed From', 'Escalation', 'Created At', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {blockers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-gray-400">
                      <AlertTriangle className="mx-auto mb-3 opacity-30" size={36} />
                      <p className="font-medium">No blockers logged yet</p>
                      <p className="text-xs mt-1">Click "Log Blocker" to report the first one.</p>
                    </td>
                  </tr>
                ) : (
                  blockers.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{b.title}</td>
                      <td className="px-4 py-3 text-gray-600">{b.project?.name ?? b.projectId}</td>
                      <td className="px-4 py-3">
                        <Badge variant={severityVariant[b.severity] ?? 'default'}>{b.severity}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[b.status] ?? 'default'}>{b.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{b.loggedBy?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{b.helpNeededFrom?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={b.escalationLevel !== 'none' ? 'danger' : 'default'}>
                          {b.escalationLevel === 'none' ? 'No' : b.escalationLevel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
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

          {/* Escalation Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Escalation Level</label>
            <select {...register('escalationLevel')} className={inputCls}>
              <option value="none">None</option>
              <option value="team">Team</option>
              <option value="management">Management</option>
              <option value="executive">Executive</option>
            </select>
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

    </PermissionPageGuard>
  );
}
