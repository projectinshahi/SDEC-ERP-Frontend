/**
 * SE-022 — Document Approval API. Wrappers over `/sales/approvals`.
 */
import { apiClient } from './api-client';
import type {
  DocumentApproval,
  ApprovalFilters,
  ApprovalDecision,
  DocType,
} from '@/lib/types/salesExecution';

export async function fetchApprovals(filters: ApprovalFilters = {}): Promise<DocumentApproval[]> {
  const params = new URLSearchParams();
  if (filters.dealId != null) params.set('dealId', String(filters.dealId));
  if (filters.leadId != null) params.set('leadId', String(filters.leadId));
  if (filters.status) params.set('status', filters.status);
  if (filters.scope) params.set('scope', filters.scope);
  const qs = params.toString();
  const res = await apiClient.get<DocumentApproval[]>(`/sales/approvals${qs ? `?${qs}` : ''}`);
  return res.data;
}

export async function fetchApproval(id: number): Promise<DocumentApproval> {
  const res = await apiClient.get<DocumentApproval>(`/sales/approvals/${id}`);
  return res.data;
}

export interface SubmitApprovalPayload {
  file: File;
  docType: DocType;
  title: string;
  version?: string;
  changeNotes: string;
  comments?: string;
  leadId?: number;
  dealId?: number;
}

export async function submitApproval(payload: SubmitApprovalPayload): Promise<DocumentApproval> {
  const form = new FormData();
  form.append('file', payload.file);
  form.append('docType', payload.docType);
  form.append('title', payload.title);
  if (payload.version) form.append('version', payload.version);
  form.append('changeNotes', payload.changeNotes);
  if (payload.comments) form.append('comments', payload.comments);
  if (payload.leadId != null) form.append('leadId', String(payload.leadId));
  if (payload.dealId != null) form.append('dealId', String(payload.dealId));
  const res = await apiClient.post<DocumentApproval>('/sales/approvals', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function decideApproval(
  id: number,
  decision: ApprovalDecision,
  comments?: string,
): Promise<DocumentApproval> {
  const res = await apiClient.put<DocumentApproval>(`/sales/approvals/${id}/decision`, { decision, comments });
  return res.data;
}

export async function resubmitApproval(
  id: number,
  changeNotes: string,
  file?: File,
  version?: string,
): Promise<DocumentApproval> {
  const form = new FormData();
  form.append('changeNotes', changeNotes);
  if (version) form.append('version', version);
  if (file) form.append('file', file);
  const res = await apiClient.post<DocumentApproval>(`/sales/approvals/${id}/resubmit`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function sendApprovalToClient(id: number): Promise<DocumentApproval> {
  const res = await apiClient.post<DocumentApproval>(`/sales/approvals/${id}/send`, {});
  return res.data;
}
