export interface ApiPerformanceCycle {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  status: 'Upcoming' | 'Active' | 'Closed';
  created_at: string;
}

export interface ApiAppraisal {
  id: number;
  employee_id: number;
  evaluator_id: number | null;
  cycle_id: number;
  status: 'draft' | 'self_review' | 'manager_review' | 'completed' | 'rejected';

  // Categories (Self)
  self_rating_tech: number | null;
  self_rating_comm: number | null;
  self_rating_team: number | null;
  self_rating_prod: number | null;
  self_rating_solve: number | null;
  self_rating_lead: number | null;
  self_comments: string | null;

  // Categories (Manager)
  manager_rating_tech: number | null;
  manager_rating_comm: number | null;
  manager_rating_team: number | null;
  manager_rating_prod: number | null;
  manager_rating_solve: number | null;
  manager_rating_lead: number | null;
  manager_comments: string | null;

  // JSONB scores container (includes strengths, improvements, recommendations, and ratings)
  manager_scores: {
    tech: number | null;
    comm: number | null;
    team: number | null;
    prod: number | null;
    solve: number | null;
    lead: number | null;
    strengths: string | null;
    improvement_areas: string | null;
    promotion_recommendation: string | null;
  } | null;

  overall_rating: number | null;
  approved_at: string | null;

  final_rating: number;
  final_comments: string | null;
  created_at: string;
  updated_at: string;

  // Joined columns
  cycle_title: string;
  cycle_status: string;
  employee_code: string;
  employee_name: string;
  department: string;
  designation: string;
  manager_code: string | null;
  manager_name: string | null;

  goals?: ApiGoal[];
}

export interface ApiGoal {
  id: number;
  employee_id: number;
  appraisal_id: number | null;
  title: string;
  description: string | null;
  weight: number;      // weightage %
  progress_pct: number; // progress %
  score: number;       // rating 1-5
  target_date: string | null;
  created_at: string;
  updated_at: string;

  // Joined columns
  employee_code?: string;
  employee_name?: string;
}

export interface PerformanceStats {
  active: number;
  self_pending: number;
  manager_pending: number;
  completed: number;
}
