'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Breadcrumb } from '@/components/Breadcrumb';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton } from '@/components/Skeleton';
import { TicketTable } from '@/components/tickets/TicketTable';
import { TicketModal } from '@/components/tickets/TicketModal';
import { QueuedFile } from '@/components/tickets/FileUploader';
import { TicketDetailsModal } from '@/components/tickets/TicketDetailsModal';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { Modal } from '@/components/Modal';
import { Plus, Ticket as TicketIcon, AlertTriangle, Info } from 'lucide-react';
import type { Ticket as TicketType } from '@/lib/api/tickets';
import { fetchTickets, createTicket, updateTicket, deleteTicket, uploadTicketAttachments } from '@/lib/api/tickets';
import { fetchUsers, type UserDbResponse } from '@/lib/api/users';
import { useToast } from '@/lib/hooks/useToast';
import { useAuthContext } from '@/lib/context/AuthContext';
import { useProject } from '@/lib/context/ProjectContext';

export function TicketsClient() {
  const { activeProject } = useProject();
  const { user: currentUser } = useAuthContext();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [users, setUsers] = useState<UserDbResponse[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [viewingTicket, setViewingTicket] = useState<TicketType | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<TicketType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTickets = async () => {
    if (!activeProject) {
      setTickets([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await fetchTickets(activeProject.id);
      setTickets(data);
    } catch (err: any) {
      console.error('Failed to load tickets:', err);
      toast('Failed to load tickets from database', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [activeProject]);

  useEffect(() => {
    fetchUsers().then(setUsers).catch(console.error);
  }, []);

  const handleAddTicket = async (data: Partial<TicketType>, queuedFiles: QueuedFile[] = []) => {
    if (!activeProject) return;
    setIsSubmitting(true);
    try {
      const newTicket = await createTicket({ ...data, project_id: activeProject.id } as any);

      if (queuedFiles.length > 0 && newTicket.id) {
        const formData = new FormData();
        queuedFiles.forEach(qf => {
          formData.append('files', qf.file);
          formData.append('descriptions', qf.description || '');
        });
        await uploadTicketAttachments(newTicket.id, formData);
      }

      toast(`Ticket "${data.title}" successfully reported!`, 'success');
      setIsModalOpen(false);
      loadTickets();
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      toast('Failed to create ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTicket = async (data: Partial<TicketType>, queuedFiles: QueuedFile[] = []) => {
    if (!editingTicket) return;
    setIsSubmitting(true);
    try {
      await updateTicket(editingTicket.id, data);

      if (queuedFiles.length > 0) {
        const formData = new FormData();
        queuedFiles.forEach(qf => {
          formData.append('files', qf.file);
          formData.append('descriptions', qf.description || '');
        });
        await uploadTicketAttachments(editingTicket.id, formData);
      }

      toast(`Ticket "${data.title}" successfully updated!`, 'success');
      setIsModalOpen(false);
      setEditingTicket(null);
      loadTickets();
    } catch (err: any) {
      console.error('Error updating ticket:', err);
      toast('Failed to update ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTicket = (ticket: TicketType) => {
    setEditingTicket(ticket);
    setIsModalOpen(true);
  };

  const handleDeleteTicket = (ticketId: number) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (ticket) setTicketToDelete(ticket);
  };

  const handleConfirmDelete = async () => {
    if (!ticketToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTicket(ticketToDelete.id);
      toast(`Ticket "${ticketToDelete.title}" has been deleted.`, 'info');
      setTicketToDelete(null);
      loadTickets();
    } catch (err: any) {
      console.error('Error deleting ticket:', err);
      toast('Failed to delete ticket', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PermissionPageGuard module="tickets">
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'Tickets' }]} />
      </div>

      {/* Header — mirrors Meetings */}
      <section className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <TicketIcon className="text-blue-500 w-8 h-8" />
            Ticket Tracking
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm max-w-xl leading-relaxed">
            Manage and track system issues, tickets, and feature requests.
          </p>
          {!activeProject && (
            <div className="mt-2 flex items-center gap-2 text-amber-600">
              <Info size={14} />
              <span className="text-xs font-medium">Select a project from the sidebar to create tickets</span>
            </div>
          )}
        </div>
        <PermissionGuard require="tickets.create">
          <Button
            variant={activeProject ? 'primary' : 'secondary'}
            size="lg"
            disabled={!activeProject}
            onClick={() => { setEditingTicket(null); setIsModalOpen(true); }}
            className="self-start sm:self-center"
            title={!activeProject ? 'Select a project from the sidebar to create tickets' : 'Report a new ticket'}
          >
            <Plus size={18} />
            Report Ticket
          </Button>
        </PermissionGuard>
      </section>

      {/* Tickets Table — mirrors the Meetings table card */}
      <Card variant="outlined" className="overflow-hidden mb-8 !bg-white !border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <TicketIcon size={17} className="text-blue-500" />
          <h2 className="text-sm font-bold text-gray-800">Tickets</h2>
          <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{tickets.length}</span>
        </div>

        {isLoading ? (
          <div className="space-y-4 px-6 py-6">
            <TableSkeleton />
          </div>
        ) : tickets.length === 0 ? (
          <div className="px-6 py-8">
            {!activeProject ? (
              <EmptyState
                icon={<Info size={32} className="text-amber-500" />}
                title="No project selected"
                description="Please select a project from the sidebar to view and manage tickets for that project."
              />
            ) : (
              <EmptyState
                icon={<TicketIcon size={32} className="text-blue-500" />}
                title="No tickets found"
                description={`No tickets reported yet for ${activeProject.name}. Report your first ticket.`}
                actionLabel="Report Ticket"
                onAction={() => { setEditingTicket(null); setIsModalOpen(true); }}
              />
            )}
          </div>
        ) : (
          <TicketTable
            tickets={tickets}
            onEdit={handleEditTicket}
            onDelete={handleDeleteTicket}
            onView={setViewingTicket}
          />
        )}
      </Card>

      <TicketModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTicket(null); }}
        onSubmit={editingTicket ? handleUpdateTicket : handleAddTicket}
        editTicket={editingTicket}
        isSubmitting={isSubmitting}
        users={users}
      />

      <TicketDetailsModal
        isOpen={!!viewingTicket}
        onClose={() => setViewingTicket(null)}
        ticket={viewingTicket}
        currentUserId={currentUser?.id}
        onUpdate={async (ticketId, updates) => {
          await updateTicket(ticketId, updates);
          setViewingTicket(prev => prev ? { ...prev, ...updates } : null);
          loadTickets();
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!ticketToDelete}
        onClose={() => !isDeleting && setTicketToDelete(null)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="flex flex-col items-center text-center p-2">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4 shadow-sm animate-pulse">
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-2">Delete Ticket?</h3>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Are you sure you want to permanently delete ticket <span className="font-semibold text-gray-800">"{ticketToDelete?.title}"</span>? This action cannot be undone.
          </p>
          <div className="flex items-center gap-3 w-full">
            <Button variant="secondary" className="flex-1 font-semibold" onClick={() => setTicketToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1 font-semibold" onClick={handleConfirmDelete} isLoading={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Ticket'}
            </Button>
          </div>
        </div>
      </Modal>
    </PermissionPageGuard>
  );
}
