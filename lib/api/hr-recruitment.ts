import { apiClient } from './api-client';
import { CandidateStage } from '../hr/recruitment.types';

export interface ApiCandidate {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string;
  stage: string;
  experience: string | null;
  expected_ctc: number | null;
  resume_url: string | null;
  interview_date: string | null;
  notes: string | null;
  department: string | null;
  skills: string | null;
  match_score: number | null;
  source: string | null;
  created_at: string;
}

export interface ApiRecruitmentStats {
  Applied: number;
  Screening: number;
  Interview: number;
  Offer: number;
  Hired: number;
  Rejected: number;
}

export interface SaveCandidatePayload {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  position: string;
  experience?: string | null;
  expected_ctc?: number | null;
  resume_url?: string | null;
  interview_date?: string | null;
  notes?: string | null;
  department?: string | null;
  skills?: string | null;
  match_score?: number | null;
  source?: string | null;
}

/** Fetch all candidates */
export async function fetchCandidates(): Promise<ApiCandidate[]> {
  const res = await apiClient.get<{ success: boolean; data: ApiCandidate[] }>('/hr/recruitment');
  return res.data?.data ?? [];
}

/** Fetch recruitment stats */
export async function fetchStats(): Promise<ApiRecruitmentStats> {
  const res = await apiClient.get<{ success: boolean; data: ApiRecruitmentStats }>('/hr/recruitment/stats');
  return res.data?.data ?? { Applied: 0, Screening: 0, Interview: 0, Offer: 0, Hired: 0, Rejected: 0 };
}

/** Create a new candidate */
export async function createCandidate(payload: SaveCandidatePayload): Promise<any> {
  const res = await apiClient.post('/hr/recruitment', payload);
  return res.data;
}

/** Update an existing candidate */
export async function updateCandidate(id: number, payload: SaveCandidatePayload): Promise<any> {
  const res = await apiClient.put(`/hr/recruitment/${id}`, payload);
  return res.data;
}

/** Update candidate stage */
export async function updateCandidateStage(id: number, stage: CandidateStage): Promise<any> {
  const res = await apiClient.patch(`/hr/recruitment/${id}/stage`, { stage });
  return res.data;
}

/** Delete a candidate */
export async function deleteCandidate(id: number): Promise<any> {
  const res = await apiClient.delete(`/hr/recruitment/${id}`);
  return res.data;
}

/** Upload a resume file to Cloudinary and return the url */
export async function uploadResumeFile(file: File): Promise<{ success: boolean; url: string; fileName: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<{ success: boolean; url: string; fileName: string }>(
    '/hr/recruitment/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return res.data;
}
