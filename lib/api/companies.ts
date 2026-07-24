import { apiClient } from './api-client';

/**
 * Companies API — the normalized CRM account entity. Talks to /sales/companies.
 * (apiClient.get/post/put/delete return an AxiosResponse — read `.data`.)
 */

export interface Company {
  id: number;
  name: string;
  industry?: string | null;
  website?: string | null;
  address?: string | null;
  gst?: string | null;
  notes?: string | null;
  ownerId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: { contacts: number };
}

export interface CompanyContact {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  whatsapp?: string | null;
  ownerId?: number | null;
}

export interface CompanyPipelineRecord {
  id: number;
  title: string;
  status: string;
  stage: string;
  temperature?: string | null;
  createdAt: string;
}

export interface CompanyDetails extends Company {
  contacts: CompanyContact[];
  pipeline: CompanyPipelineRecord[];
}

export interface CompanyListResponse {
  data: Company[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CompanyInput {
  name: string;
  industry?: string;
  website?: string;
  address?: string;
  gst?: string;
  notes?: string;
}

export async function fetchCompanies(
  params: { q?: string; page?: number; pageSize?: number } = {},
): Promise<CompanyListResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const r = await apiClient.get<CompanyListResponse>(`/sales/companies${suffix}`);
  return r.data;
}

export async function fetchCompany(id: number): Promise<CompanyDetails> {
  const r = await apiClient.get<CompanyDetails>(`/sales/companies/${id}`);
  return r.data;
}

export async function createCompany(input: CompanyInput): Promise<Company> {
  const r = await apiClient.post<Company>('/sales/companies', input);
  return r.data;
}

export async function updateCompany(id: number, input: Partial<CompanyInput>): Promise<Company> {
  const r = await apiClient.put<Company>(`/sales/companies/${id}`, input);
  return r.data;
}

export async function deleteCompany(id: number): Promise<{ success: boolean }> {
  const r = await apiClient.delete<{ success: boolean }>(`/sales/companies/${id}`);
  return r.data;
}

/** Lightweight all-companies list for the Contact form's company picker. */
export async function fetchCompanyOptions(): Promise<Company[]> {
  const r = await apiClient.get<CompanyListResponse>('/sales/companies?pageSize=100');
  return r.data.data;
}
