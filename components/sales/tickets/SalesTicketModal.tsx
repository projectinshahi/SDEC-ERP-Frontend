'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { InputField } from '@/components/ui/InputField';
import { Ticket as TicketIcon, FileText, X } from 'lucide-react';
import { FileUploader, QueuedFile } from '@/components/tickets/FileUploader';
import {
  type SalesTicket,
  type SalesTicketAttachment,
  fetchSalesTicketAttachments,
  deleteSalesTicketAttachment,
} from '@/lib/api/salesTickets';
import { fetchUsers, type UserDbResponse } from '@/lib/api/users';
import { fetchLeads } from '@/lib/api/leads';
import { fetchDeals, fetchSalesCustomers, type CustomerOption } from '@/lib/api/leadLifecycle';
import { fetchTeams } from '@/lib/api/salesTeams';
import type { Lead } from '@/lib/types/lead';
import type { Deal } from '@/lib/types/leadLifecycle';
import type { SalesTeam } from '@/lib/types/salesExecution';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface SalesTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Parent handles the create vs. update API call + queued attachment upload. */
  onSubmit: (data: Partial<SalesTicket>, files: QueuedFile[]) => void;
  editTicket?: SalesTicket | null;
  isSubmitting?: boolean;
}

const selectClass =
  'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm text-slate-800';

/** Build the snake_case create/update payload the backend expects. */
interface SalesTicketFormState {
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  source: string;
  due_date: string;
  customer_id: number | undefined;
  lead_id: number | undefined;
  deal_id: number | undefined;
  team_id: number | undefined;
  assigned_to: number | undefined;
}

const emptyForm: SalesTicketFormState = {
  title: '',
  description: '',
  status: 'open',
  priority: 'medium',
  category: '',
  source: '',
  due_date: '',
  customer_id: undefined,
  lead_id: undefined,
  deal_id: undefined,
  team_id: undefined,
  assigned_to: undefined,
};

/** Normalise an ISO/datetime string into a yyyy-mm-dd value for <input type=date>. */
function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function SalesTicketModal({
  isOpen,
  onClose,
  onSubmit,
  editTicket,
  isSubmitting = false,
}: SalesTicketModalProps) {
  const { hasPermission } = usePermissions();
  const canAssign = hasPermission('sales.tickets.assign');

  const [formData, setFormData] = useState<SalesTicketFormState>(emptyForm);

  // Linkage picker data.
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [teams, setTeams] = useState<SalesTeam[]>([]);
  const [salesUsers, setSalesUsers] = useState<UserDbResponse[]>([]);

  // Attachments.
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<SalesTicketAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  // Load picker data once the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    fetchSalesCustomers().then(setCustomers).catch(() => setCustomers([]));
    fetchLeads().then(setLeads).catch(() => setLeads([]));
    fetchDeals().then(setDeals).catch(() => setDeals([]));
    fetchTeams().then(setTeams).catch(() => setTeams([]));
    if (canAssign) {
      fetchUsers('sales').then(setSalesUsers).catch(() => setSalesUsers([]));
    }
  }, [isOpen, canAssign]);

  // Reset the form + load existing attachments whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setFormData({
      title: editTicket?.title || '',
      description: editTicket?.description || '',
      status: editTicket?.status || 'open',
      priority: editTicket?.priority || 'medium',
      category: editTicket?.category || '',
      source: editTicket?.source || '',
      due_date: toDateInput(editTicket?.due_date),
      customer_id: editTicket?.customer_id ?? undefined,
      lead_id: editTicket?.lead_id ?? undefined,
      deal_id: editTicket?.deal_id ?? undefined,
      team_id: editTicket?.team_id ?? undefined,
      assigned_to: editTicket?.assigned_to ?? undefined,
    });
    setQueuedFiles([]);

    if (editTicket?.id) {
      setLoadingAttachments(true);
      fetchSalesTicketAttachments(editTicket.id)
        .then(setExistingAttachments)
        .catch(console.error)
        .finally(() => setLoadingAttachments(false));
    } else {
      setExistingAttachments([]);
    }
  }, [isOpen, editTicket]);

  const handleChange = <K extends keyof SalesTicketFormState>(field: K, value: SalesTicketFormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // The numeric-id linkage fields only (customer/lead/deal/team/assignee).
  type NumericField = 'customer_id' | 'lead_id' | 'deal_id' | 'team_id' | 'assigned_to';
  const handleNumberChange = (field: NumericField, raw: string) => {
    handleChange(field, raw ? Number(raw) : undefined);
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!editTicket?.id) return;
    try {
      await deleteSalesTicketAttachment(editTicket.id, attachmentId);
      setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (error) {
      console.error('Failed to delete attachment', error);
      alert('Failed to delete attachment. You may not have permission.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Partial<SalesTicket> = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      status: formData.status,
      priority: formData.priority,
      category: formData.category.trim() || null,
      source: formData.source.trim() || null,
      due_date: formData.due_date || null,
      customer_id: formData.customer_id ?? null,
      lead_id: formData.lead_id ?? null,
      deal_id: formData.deal_id ?? null,
      team_id: formData.team_id ?? null,
    };

    // Only send assigned_to when the user is allowed to assign — otherwise the
    // field isn't rendered and we must not clobber the existing assignment.
    if (canAssign) {
      payload.assigned_to = formData.assigned_to ?? null;
    }

    onSubmit(payload, queuedFiles);
  };

  const isFormValid = formData.title.trim().length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editTicket ? 'Edit Sales Ticket' : 'New Sales Ticket'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <InputField
          label="Ticket Title"
          id="title"
          placeholder="Enter a descriptive title"
          icon={TicketIcon}
          value={formData.title}
          onChange={(val) => handleChange('title', val)}
          required
          disabled={isSubmitting}
          autoFocus
        />

        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700">
            Description
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3 text-slate-400 pointer-events-none">
              <FileText size={18} />
            </div>
            <textarea
              id="description"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm text-slate-800 placeholder-slate-400 min-h-[100px]"
              placeholder="Detailed description of the issue or request..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Linkages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="customer" className="block text-sm font-semibold text-gray-700">Customer (Optional)</label>
            <select
              id="customer"
              className={selectClass}
              value={formData.customer_id ?? ''}
              onChange={(e) => handleNumberChange('customer_id', e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">None</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="lead" className="block text-sm font-semibold text-gray-700">Lead (Optional)</label>
            <select
              id="lead"
              className={selectClass}
              value={formData.lead_id ?? ''}
              onChange={(e) => handleNumberChange('lead_id', e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">None</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="deal" className="block text-sm font-semibold text-gray-700">Deal (Optional)</label>
            <select
              id="deal"
              className={selectClass}
              value={formData.deal_id ?? ''}
              onChange={(e) => handleNumberChange('deal_id', e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">None</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="team" className="block text-sm font-semibold text-gray-700">Related Team (Optional)</label>
            <select
              id="team"
              className={selectClass}
              value={formData.team_id ?? ''}
              onChange={(e) => handleNumberChange('team_id', e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">None</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status / Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="status" className="block text-sm font-semibold text-gray-700">Status</label>
            <select
              id="status"
              className={selectClass}
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              disabled={isSubmitting}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="priority" className="block text-sm font-semibold text-gray-700">Priority</label>
            <select
              id="priority"
              className={selectClass}
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              disabled={isSubmitting}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Assignee (gated) + Due date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {canAssign && (
            <div className="space-y-1.5">
              <label htmlFor="assignedTo" className="block text-sm font-semibold text-gray-700">Assigned To (Optional)</label>
              <select
                id="assignedTo"
                className={selectClass}
                value={formData.assigned_to ?? ''}
                onChange={(e) => handleNumberChange('assigned_to', e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Unassigned</option>
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="dueDate" className="block text-sm font-semibold text-gray-700">Due Date (Optional)</label>
            <input
              id="dueDate"
              type="date"
              className={selectClass}
              value={formData.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Category / Source */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Category (Optional)"
            id="category"
            placeholder="e.g. Billing, Onboarding"
            value={formData.category}
            onChange={(val) => handleChange('category', val)}
            disabled={isSubmitting}
          />
          <InputField
            label="Source (Optional)"
            id="source"
            placeholder="e.g. Email, Phone, Website"
            value={formData.source}
            onChange={(val) => handleChange('source', val)}
            disabled={isSubmitting}
          />
        </div>

        {/* Attachments */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700">Attachments</label>
          <FileUploader files={queuedFiles} onChange={setQueuedFiles} />

          {editTicket && existingAttachments.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">Existing Attachments</h4>
              <ul className="space-y-2">
                {existingAttachments.map((att) => (
                  <li key={att.id} className="flex items-center justify-between p-2.5 border border-gray-100 rounded-lg bg-gray-50">
                    <div className="flex flex-col overflow-hidden truncate">
                      <span className="text-sm font-semibold text-gray-800 truncate" title={att.description || att.file_name}>
                        {att.description || att.file_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {att.description ? att.file_name + ' • ' : ''}{(att.file_size / 1024).toFixed(1)} KB • {new Date(att.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-full shadow-sm border border-gray-200 transition-colors ml-2"
                      title="Remove Attachment"
                    >
                      <X className="w-4 h-4 text-gray-500 hover:text-red-600" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {loadingAttachments && (
            <p className="text-xs text-gray-400 mt-2">Loading existing attachments...</p>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-5 border-t border-gray-100 mt-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting} fullWidth>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || !isFormValid} fullWidth>
            {isSubmitting ? 'Saving...' : (editTicket ? 'Save Changes' : 'Create Ticket')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
