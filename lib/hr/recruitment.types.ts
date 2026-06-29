export type CandidateStage =
  | 'Applied'
  | 'Screening'
  | 'Interview'
  | 'Offer'
  | 'Hired'
  | 'Rejected';

export interface Candidate {
  id: string;
  name: string;
  role: string;
  experience: string;
  matchScore?: number;
  skills?: string[];
  stage: CandidateStage;
  email: string;
  phone: string;
  source?: string;
  notes?: string;
  expectedCtc?: number;
  resumeUrl?: string;
  interviewDate?: string;
  department?: string;
}

export interface JobOpening {
  id: string;
  title: string;
  department: string;
  applicants: number;
  deadline: string;
  status: 'Open' | 'Closing Soon';
}