import { apiClient } from './api-client';

/**
 * Sales Tickets API — talks to /api/sales/tickets (module='sales' on the backend).
 * Shares the snake_case wire shape with the Development tickets contract
 * (lib/api/tickets.ts) and adds the Sales-only fields + linkages.
 */

export interface SalesTicketAttachment {
  id: number;
  ticket_id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  description: string | null;
  uploaded_by: number;
  uploaded_at: string;
  uploader?: { id: number; name: string; email: string };
}

export interface SalesTicketDiscussion {
  id: number;
  ticket_id: number;
  sender_id: number;
  message: string;
  created_at: string;
  updated_at: string;
  sender?: { id: number; name: string; email: string };
}

export interface SalesTicket {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  module: string;
  category: string | null;
  source: string | null;
  project_id: string | null;
  lead_id: number | null;
  deal_id: number | null;
  customer_id: number | null;
  team_id: number | null;
  assigned_to: number | null;
  created_by: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { id: number; name: string; email: string } | null;
  creator?: { id: number; name: string; email: string } | null;
  lead?: { id: number; title: string } | null;
  deal?: { id: number; title: string } | null;
  customer?: { id: number; name: string } | null;
  team?: { id: number; name: string } | null;
  attachments?: SalesTicketAttachment[];
}

export interface SalesTicketFilters {
  status?: string;
  priority?: string;
  search?: string;
  leadId?: number;
  dealId?: number;
}

export const fetchSalesTickets = async (filters: SalesTicketFilters = {}): Promise<SalesTicket[]> => {
  const params = new URLSearchParams();
  const set = (k: string, v: unknown) => {
    if (v !== undefined && v !== null && String(v).trim() !== '' && v !== 'ALL') params.set(k, String(v));
  };
  set('status', filters.status);
  set('priority', filters.priority);
  set('search', filters.search);
  set('leadId', filters.leadId);
  set('dealId', filters.dealId);
  const qs = params.toString();
  const res = await apiClient.get(`/sales/tickets${qs ? `?${qs}` : ''}`);
  return (res.data as any).data;
};

export const getSalesTicketById = async (id: number): Promise<SalesTicket> => {
  const res = await apiClient.get(`/sales/tickets/${id}`);
  return (res.data as any).data;
};

export const createSalesTicket = async (data: Partial<SalesTicket>): Promise<SalesTicket> => {
  const res = await apiClient.post('/sales/tickets', data);
  return (res.data as any).data;
};

export const updateSalesTicket = async (id: number, data: Partial<SalesTicket>): Promise<SalesTicket> => {
  const res = await apiClient.put(`/sales/tickets/${id}`, data);
  return (res.data as any).data;
};

export const deleteSalesTicket = async (id: number): Promise<void> => {
  await apiClient.delete(`/sales/tickets/${id}`);
};

// ── Attachments ──────────────────────────────────────────────────────────────

export const fetchSalesTicketAttachments = async (ticketId: number): Promise<SalesTicketAttachment[]> => {
  const res = await apiClient.get(`/sales/tickets/${ticketId}/attachments`);
  return (res.data as any).data ?? (res.data as any).attachments ?? [];
};

export const uploadSalesTicketAttachments = async (ticketId: number, formData: FormData): Promise<SalesTicketAttachment[]> => {
  const res = await apiClient.post(`/sales/tickets/${ticketId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return (res.data as any).data ?? (res.data as any).attachments ?? [];
};

export const deleteSalesTicketAttachment = async (ticketId: number, attachmentId: number): Promise<void> => {
  await apiClient.delete(`/sales/tickets/${ticketId}/attachments/${attachmentId}`);
};

// ── Discussions / Comments ───────────────────────────────────────────────────

export const fetchSalesTicketDiscussions = async (ticketId: number): Promise<SalesTicketDiscussion[]> => {
  const res = await apiClient.get(`/sales/tickets/${ticketId}/discussions`);
  return res.data as any;
};

export const addSalesTicketDiscussion = async (ticketId: number, message: string): Promise<SalesTicketDiscussion> => {
  const res = await apiClient.post(`/sales/tickets/${ticketId}/discussions`, { message });
  return (res.data as any).message;
};

export const deleteSalesTicketDiscussion = async (ticketId: number, messageId: number): Promise<void> => {
  await apiClient.delete(`/sales/tickets/${ticketId}/discussions/${messageId}`);
};

export const markSalesTicketDiscussionsRead = async (ticketId: number): Promise<void> => {
  await apiClient.post(`/sales/tickets/${ticketId}/discussions/read`, {});
};
