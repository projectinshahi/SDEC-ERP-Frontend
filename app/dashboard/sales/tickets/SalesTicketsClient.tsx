'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Breadcrumb } from '@/components/Breadcrumb';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton } from '@/components/Skeleton';
import { Modal } from '@/components/Modal';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { SalesTicketTable } from '@/components/sales/tickets/SalesTicketTable';
import { SalesTicketModal } from '@/components/sales/tickets/SalesTicketModal';
import { SalesTicketDetailsModal } from '@/components/sales/tickets/SalesTicketDetailsModal';
import { QueuedFile } from '@/components/tickets/FileUploader';
import { Plus, Ticket as TicketIcon, AlertTriangle } from 'lucide-react';
import {
  type SalesTicket,
  fetchSalesTickets,
  createSalesTicket,
  updateSalesTicket,
  deleteSalesTicket,
  uploadSalesTicketAttachments,
} from '@/lib/api/salesTickets';
import { useToast } from '@/lib/hooks/useToast';
import { useAuthContext } from '@/lib/context/AuthContext';
import { classNames } from '@/lib/utils';

// Status filter tabs (the value 'ALL' maps to no status filter server-side).
const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

export function SalesTicketsClient() {
  const { user: currentUser } = useAuthContext();
  const { toast } = useToast();

  const [tickets, setTickets] = useState<SalesTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SalesTicket | null>(null);
  const [viewingTicket, setViewingTicket] = useState<SalesTicket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<SalesTicket | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchSalesTickets({ status: statusFilter });
      setTickets(data);
    } catch (err) {
      console.error('Failed to load sales tickets:', err);
      toast('Failed to load sales tickets from database', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleAddTicket = async (data: Partial<SalesTicket>, queuedFiles: QueuedFile[] = []) => {
    setIsSubmitting(true);
    try {
      const newTicket = await createSalesTicket(data);

      if (queuedFiles.length > 0 && newTicket.id) {
        const formData = new FormData();
        queuedFiles.forEach((qf) => {
          formData.append('files', qf.file);
          formData.append('descriptions', qf.description || '');
        });
        await uploadSalesTicketAttachments(newTicket.id, formData);
      }

      toast(`Ticket "${data.title}" successfully created!`, 'success');
      setIsModalOpen(false);
      loadTickets();
    } catch (err) {
      console.error('Error creating sales ticket:', err);
      toast('Failed to create ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTicket = async (data: Partial<SalesTicket>, queuedFiles: QueuedFile[] = []) => {
    if (!editingTicket) return;
    setIsSubmitting(true);
    try {
      await updateSalesTicket(editingTicket.id, data);

      if (queuedFiles.length > 0) {
        const formData = new FormData();
        queuedFiles.forEach((qf) => {
          formData.append('files', qf.file);
          formData.append('descriptions', qf.description || '');
        });
        await uploadSalesTicketAttachments(editingTicket.id, formData);
      }

      toast(`Ticket "${data.title}" successfully updated!`, 'success');
      setIsModalOpen(false);
      setEditingTicket(null);
      loadTickets();
    } catch (err) {
      console.error('Error updating sales ticket:', err);
      toast('Failed to update ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTicket = (ticket: SalesTicket) => {
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
      await deleteSalesTicket(ticketToDelete.id);
      toast(`Ticket "${ticketToDelete.title}" has been deleted.`, 'info');
      setTicketToDelete(null);
      loadTickets();
    } catch (err) {
      console.error('Error deleting sales ticket:', err);
      toast('Failed to delete ticket', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PermissionPageGuard require="sales.tickets.view">
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: 'Sales', href: '/dashboard/sales/pipeline' },
            { label: 'Tickets' },
          ]}
        />
      </div>

      {/* Header */}
      <section className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2.5">
            <TicketIcon className="text-blue-500 w-8 h-8" />
            Sales Tickets
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm max-w-xl leading-relaxed">
            Track customer issues, requests and follow-ups across leads, deals and accounts.
          </p>
        </div>
        <PermissionGuard require="sales.tickets.create">
          <Button
            variant="primary"
            size="lg"
            onClick={() => { setEditingTicket(null); setIsModalOpen(true); }}
            className="self-start sm:self-center"
            title="Create a new sales ticket"
          >
            <Plus size={18} />
            New Ticket
          </Button>
        </PermissionGuard>
      </section>

      {/* Status filter tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex flex-wrap gap-1" aria-label="Status filter">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              aria-current={statusFilter === tab.key ? 'page' : undefined}
              className={classNames(
                'px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px',
                statusFilter === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tickets table */}
      <Card variant="outlined" className="overflow-hidden mb-8 !bg-white dark:!bg-gray-900 !border-gray-200 dark:!border-gray-800">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <TicketIcon size={17} className="text-blue-500" />
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Tickets</h2>
          <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">{tickets.length}</span>
        </div>

        {isLoading ? (
          <div className="space-y-4 px-6 py-6">
            <TableSkeleton />
          </div>
        ) : tickets.length === 0 ? (
          <div className="px-6 py-8">
            <EmptyState
              icon={<TicketIcon size={32} className="text-blue-500" />}
              title="No tickets found"
              description={
                statusFilter === 'ALL'
                  ? 'No sales tickets yet. Create your first ticket to get started.'
                  : 'No tickets match the selected status filter.'
              }
            />
          </div>
        ) : (
          <SalesTicketTable
            tickets={tickets}
            onEdit={handleEditTicket}
            onDelete={handleDeleteTicket}
            onView={setViewingTicket}
          />
        )}
      </Card>

      {/* Create / Edit modal */}
      <SalesTicketModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTicket(null); }}
        onSubmit={editingTicket ? handleUpdateTicket : handleAddTicket}
        editTicket={editingTicket}
        isSubmitting={isSubmitting}
      />

      {/* Details modal (with live discussion panel) */}
      <SalesTicketDetailsModal
        isOpen={!!viewingTicket}
        onClose={() => setViewingTicket(null)}
        ticket={viewingTicket}
        currentUserId={currentUser?.id}
      />

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!ticketToDelete}
        onClose={() => !isDeleting && setTicketToDelete(null)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="flex flex-col items-center text-center p-2">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-500/15 border border-red-100 dark:border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 mb-4 shadow-sm animate-pulse">
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">Delete Ticket?</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
            Are you sure you want to permanently delete ticket <span className="font-semibold text-gray-800 dark:text-gray-100">"{ticketToDelete?.title}"</span>? This action cannot be undone.
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
