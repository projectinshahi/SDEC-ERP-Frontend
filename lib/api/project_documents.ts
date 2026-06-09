import { apiClient } from './api-client';
import { UserDbResponse } from './users';

export interface ProjectDocument {
  id: number;
  project_id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
  uploader?: Partial<UserDbResponse>;
}

export const fetchProjectDocuments = async (projectId: string): Promise<ProjectDocument[]> => {
  const { data } = await apiClient.get(`/projects/${projectId}/documents`);
  return data as ProjectDocument[];
};

export const uploadProjectDocument = async (
  projectId: string,
  file: File,
  title: string,
  description?: string
): Promise<ProjectDocument> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  if (description) {
    formData.append('description', description);
  }

  const { data } = await apiClient.post(`/projects/${projectId}/documents`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return (data as any).document;
};

export const updateProjectDocument = async (
  projectId: string,
  documentId: number,
  updates: { title?: string; description?: string }
): Promise<ProjectDocument> => {
  const { data } = await apiClient.put(`/projects/${projectId}/documents/${documentId}`, updates);
  return (data as any).document;
};

export const deleteProjectDocument = async (projectId: string, documentId: number): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/documents/${documentId}`);
};

export const downloadProjectDocumentBlob = async (projectId: string, documentId: number): Promise<Blob> => {
  const { data } = await apiClient.get<Blob>(`/projects/${projectId}/documents/${documentId}/download`, {
    responseType: 'blob',
  });
  return data as Blob;
};
