import { apiClient } from './api-client';

export interface TicketAttachment {
  id: number;
  ticket_id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  description: string | null;
  uploaded_by: number;
  uploaded_at: string;
  uploader?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: number | null;
  created_by: number;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { id: number; name: string; email: string };
  creator?: { id: number; name: string; email: string };
  attachments?: TicketAttachment[];
}

export interface TicketQueryParams {
  projectId?: string;
  status?: string;
  priority?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const fetchTickets = async (projectId?: string): Promise<Ticket[]> => {
  const params = projectId ? { projectId } : undefined;
  const res = await apiClient.get('/tickets', { params });
  return (res.data as any).data;
};

export const getTicketById = async (id: number): Promise<Ticket> => {
  const res = await apiClient.get(`/tickets/${id}`);
  return (res.data as any).data;
};

export const createTicket = async (data: Partial<Ticket>): Promise<Ticket> => {
  const res = await apiClient.post('/tickets', data);
  return (res.data as any).data;
};

export const updateTicket = async (id: number, data: Partial<Ticket>): Promise<Ticket> => {
  const res = await apiClient.put(`/tickets/${id}`, data);
  return (res.data as any).data;
};

export const deleteTicket = async (id: number): Promise<void> => {
  await apiClient.delete(`/tickets/${id}`);
};

export const fetchTicketAttachments = async (ticketId: number): Promise<TicketAttachment[]> => {
  const res = await apiClient.get(`/tickets/${ticketId}/attachments`);
  return (res.data as any).data;
};

export const uploadTicketAttachments = async (
  ticketId: number, 
  formData: FormData
): Promise<TicketAttachment[]> => {
  const res = await apiClient.post(`/tickets/${ticketId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return (res.data as any).data;
};

export const deleteTicketAttachment = async (ticketId: number, attachmentId: number): Promise<void> => {
  await apiClient.delete(`/tickets/${ticketId}/attachments/${attachmentId}`);
};
