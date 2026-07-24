import { apiClient } from './api-client';

/**
 * Contacts API — the person entity (Prisma model `Customer`; UI label "Contact";
 * route/API stay /sales/customers). Adds the Company link + designation/whatsapp.
 */

export interface Contact {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  designation?: string | null;
  company?: string | null; // deprecated free-text; superseded by companyRef
  industry?: string | null;
  website?: string | null;
  address?: string | null;
  companyId?: number | null;
  status?: string;
  ownerId?: number;
  owner?: { id: number; name: string; email?: string } | null;
  companyRef?: {
    id: number;
    name: string;
    industry?: string | null;
    website?: string | null;
    address?: string | null;
    gst?: string | null;
  } | null;
}

export interface ContactRelatedLead {
  id: number; title: string; status: string; stage: string; temperature?: string; createdAt: string;
}
export interface ContactRelatedDeal {
  id: number; title: string; amount: number; stage: string; status: string; createdAt: string;
}

export interface ContactDetails extends Contact {
  leads?: ContactRelatedLead[];
  deals?: ContactRelatedDeal[];
}

export interface ContactInput {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  designation?: string;
  companyId?: number | null;
  company?: string;
  industry?: string;
  website?: string;
  address?: string;
}

export async function fetchContacts(q?: string): Promise<Contact[]> {
  const suffix = q ? `?q=${encodeURIComponent(q)}` : '';
  const r = await apiClient.get<Contact[]>(`/sales/customers${suffix}`);
  return r.data;
}

export async function fetchContact(id: number): Promise<ContactDetails> {
  const r = await apiClient.get<ContactDetails>(`/sales/customers/${id}`);
  return r.data;
}

export async function createContact(input: ContactInput): Promise<Contact> {
  const r = await apiClient.post<Contact>('/sales/customers', input);
  return r.data;
}

export async function updateContact(id: number, input: Partial<ContactInput>): Promise<Contact> {
  const r = await apiClient.put<Contact>(`/sales/customers/${id}`, input);
  return r.data;
}

export async function deleteContact(id: number): Promise<{ success: boolean }> {
  const r = await apiClient.delete<{ success: boolean }>(`/sales/customers/${id}`);
  return r.data;
}
