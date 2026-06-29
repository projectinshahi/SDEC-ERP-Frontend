import { apiClient } from './api-client';

export interface ApiHrDocument {
  id: number;
  employee_id: number;
  document_type: string;
  file_url: string;
  file_name: string;
  expiry_date: string | null;
  status: string;
  notes: string | null;
  verified_by: number | null;
  verified_at: string | null;
  created_at: string;
  employee_code: string;
  employee_name: string | null;
  designation: string;
  verified_by_name: string | null;
}

export interface SaveDocumentPayload {
  employee_id: number;
  document_type: string;
  file_url: string;
  file_name: string;
  expiry_date?: string | null;
  notes?: string | null;
}

/** Fetch all employee documents */
export async function fetchDocuments(): Promise<ApiHrDocument[]> {
  const res = await apiClient.get<{ success: boolean; data: ApiHrDocument[] }>('/hr/documents');
  return res.data?.data ?? [];
}

/** Create/register a new document */
export async function createDocument(payload: SaveDocumentPayload): Promise<any> {
  const res = await apiClient.post('/hr/documents', payload);
  return res.data;
}

/** Update status of a document */
export async function updateDocumentStatus(id: number, status: 'Pending' | 'Verified' | 'Rejected'): Promise<any> {
  const res = await apiClient.patch(`/hr/documents/${id}/status`, { status });
  return res.data;
}

/** Delete a document */
export async function deleteDocument(id: number): Promise<any> {
  const res = await apiClient.delete(`/hr/documents/${id}`);
  return res.data;
}

/** Upload document file (PDF/JPG/PNG) to Cloudinary */
export async function uploadDocumentFile(file: File): Promise<{ success: boolean; url: string; fileName: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<{ success: boolean; url: string; fileName: string }>('/hr/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}
