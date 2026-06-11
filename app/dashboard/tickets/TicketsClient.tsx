'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Breadcrumb } from '@/components/Breadcrumb';
import { TicketTable } from '@/components/tickets/TicketTable';
import { TicketModal } from '@/components/tickets/TicketModal';
import { QueuedFile } from '@/components/tickets/FileUploader';
import { TicketDetailsModal } from '@/components/tickets/TicketDetailsModal';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { Modal } from '@/components/Modal';
import { Plus, Ticket, AlertTriangle, X, CheckCircle2, Info, FolderDot } from 'lucide-react';
import type { Ticket as TicketType } from '../../../lib/api/tickets';
import { fetchTickets, createTicket, updateTicket, deleteTicket, uploadTicketAttachments } from '../../../lib/api/tickets';

import { fetchUsers, type UserDbResponse } from '@/lib/api/users';
import { useToast } from '@/lib/hooks/useToast';
import { useAuthContext } from '@/lib/context/AuthContext';
import { useProject } from '@/lib/context/ProjectContext';
import { classNames } from '@/lib/utils';

export function TicketsClient() {
  const { activeProject } = useProject();
  const { user: currentUser } = useAuthContext();
  const [activeTab, setActiveTab] = useState<'reports' | 'analytics'>('reports');
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

      // Handle attachments
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
    if (editingTicket) {
      setIsSubmitting(true);
      try {
        await updateTicket(editingTicket.id, data);

        // Handle new attachments
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
    }
  };

  const handleEditTicket = (ticket: TicketType) => {
    setEditingTicket(ticket);
    setIsModalOpen(true);
  };

  const handleStatusChange = async (ticketId: number, newStatus: string) => {
    try {
      await updateTicket(ticketId, { status: newStatus as any });
      toast(`Ticket status updated successfully!`, 'success');
      loadTickets();
    } catch (err: any) {
      console.error('Error updating ticket status:', err);
      toast('Failed to update ticket status', 'error');
    }
  };

  const handleDeleteTicket = (ticketId: number) => {
    const ticket = tickets.find((b) => b.id === ticketId);
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
        <Breadcrumb items={[{ label: 'Ticket Tracking' }]} />
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Ticket Tracking</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and track system issues, tickets, and feature requests.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-lg flex items-center shadow-inner border border-slate-200">
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'reports' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Ticket Reports
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'analytics' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              Analytics
            </button>
          </div>

          {activeTab === 'reports' && (
            <PermissionGuard require="tickets.create">
              <Button
                variant="primary"
                size="lg"
                disabled={!activeProject}
                onClick={() => {
                  setEditingTicket(null);
                  setIsModalOpen(true);
                }}
              >
                <Plus size={20} />
                Report Ticket
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
              <p className="text-gray-500 mt-2">Please select a project from the top navigation bar to view its tickets.</p>
            </div>
          ) : (
            <Card variant="outlined" className="overflow-hidden">
              {isLoading ? (
                <div className="py-20 text-center bg-white flex flex-col items-center justify-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-gray-500 font-bold text-xs mt-4">Loading issues...</p>
                </div>
              ) : (
                <TicketTable tickets={tickets} onEdit={handleEditTicket} onDelete={handleDeleteTicket} onView={setViewingTicket} onStatusChange={handleStatusChange} />
              )}
            </Card>
          )}
        </>
      ) : null}

      <TicketModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTicket(null);
        }}
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

          <h3 className="text-lg font-bold text-gray-900 tracking-tight mb-2">
            Delete Ticket Report?
          </h3>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Are you sure you want to permanently delete ticket <span className="font-semibold text-gray-800">"{ticketToDelete?.title}"</span>? This action cannot be undone.
          </p>

          <div className="flex items-center gap-3 w-full">
            <Button
              variant="secondary"
              className="flex-1 font-semibold"
              onClick={() => setTicketToDelete(null)}
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
              {isDeleting ? 'Deleting...' : 'Delete Ticket'}
            </Button>
          </div>
        </div>
      </Modal>

    </PermissionPageGuard>
  );
}



