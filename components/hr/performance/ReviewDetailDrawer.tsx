'use client';

import React, { useState, useEffect } from 'react';
import { X, Target, Award, Plus, Trash2, CheckCircle2, AlertCircle, TrendingUp, Save, Printer, ArrowDownToLine } from 'lucide-react';
import { ApiAppraisal, ApiGoal } from '@/lib/hr/performance.types';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { useAuth } from '@/lib/hooks/useAuth';
import { generateAppraisalPdf } from '@/lib/hr/performanceHelper';

interface ReviewDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appraisal: ApiAppraisal | null;
  isLoading: boolean;
  onSubmitSelfReview: (id: number, payload: any) => Promise<void>;
  onSubmitManagerReview: (id: number, payload: any) => Promise<void>;
  onApproveAppraisal: (id: number, final_comments?: string | null) => Promise<void>;
  onRejectAppraisal: (id: number, comments?: string | null) => Promise<void>;
  onCreateGoal: (payload: any) => Promise<void>;
  onUpdateGoal: (goalId: number, appraisalId: number, payload: any) => Promise<void>;
  onDeleteGoal: (goalId: number, appraisalId: number) => Promise<void>;
  employees: any[];
}

const CATEGORIES = [
  { key: 'tech', label: 'Technical Skills', desc: 'Core technical abilities, clean code, engineering practices' },
  { key: 'comm', label: 'Communication', desc: 'Written & verbal updates, transparency, documentation' },
  { key: 'team', label: 'Teamwork', desc: 'Collaboration, support for peers, alignment with goals' },
  { key: 'prod', label: 'Productivity', desc: 'Velocity, output quality, tasks throughput, deadlines' },
  { key: 'solve', label: 'Problem Solving', desc: 'Debugging skills, architectural decisions, creative fixes' },
  { key: 'lead', label: 'Leadership (Optional)', desc: 'Mentorship, leading projects, driving tech initiatives' },
];

const CATEGORY_TO_SCORE_KEY: Record<string, 'technicalSkills' | 'communication' | 'teamwork' | 'productivity' | 'problemSolving' | 'leadership'> = {
  tech: 'technicalSkills',
  comm: 'communication',
  team: 'teamwork',
  prod: 'productivity',
  solve: 'problemSolving',
  lead: 'leadership',
};


const getRatingBadge = (score: number | null) => {
  if (score === null || score === undefined) return null;
  if (score >= 4.5) return { label: 'Outstanding', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-205' };
  if (score >= 3.5) return { label: 'Excellent', color: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 border border-green-205' };
  if (score >= 2.5) return { label: 'Good', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-205' };
  if (score >= 1.5) return { label: 'Needs Improvement', color: 'bg-yellow-100 text-yellow-805 dark:bg-yellow-950/40 dark:text-yellow-550 border border-yellow-250' };
  return { label: 'Poor', color: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-205' };
};

export function ReviewDetailDrawer({
  isOpen,
  onClose,
  appraisal,
  isLoading,
  onSubmitSelfReview,
  onSubmitManagerReview,
  onApproveAppraisal,
  onRejectAppraisal,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
  employees,
}: ReviewDetailDrawerProps) {
  const { permissions, roleName, isSuperAdmin, hasPermission } = usePermissions();
  const { user } = useAuth();

  // Self review form state
  const [selfRatings, setSelfRatings] = useState<Record<string, number>>({});
  const [selfComments, setSelfComments] = useState('');

  // Manager review form state
  const [managerScores, setManagerScores] = useState<{
    technicalSkills: number;
    communication: number;
    teamwork: number;
    productivity: number;
    problemSolving: number;
    leadership: number;
  }>({
    technicalSkills: 0,
    communication: 0,
    teamwork: 0,
    productivity: 0,
    problemSolving: 0,
    leadership: 0,
  });
  const [managerComments, setManagerComments] = useState('');
  const [strengths, setStrengths] = useState('');
  const [improvementAreas, setImprovementAreas] = useState('');
  const [promotionRecommendation, setPromotionRecommendation] = useState('');

  // HR final approval comments
  const [hrComments, setHrComments] = useState('');

  // Rejection form state
  const [rejectComments, setRejectComments] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Goal form state
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalWeight, setNewGoalWeight] = useState('20');
  const [newGoalProgress, setNewGoalProgress] = useState('0');
  const [newGoalScore, setNewGoalScore] = useState('0');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when appraisal loads
  useEffect(() => {
    if (appraisal) {
      setSelfRatings({
        tech: appraisal.self_rating_tech ?? 0,
        comm: appraisal.self_rating_comm ?? 0,
        team: appraisal.self_rating_team ?? 0,
        prod: appraisal.self_rating_prod ?? 0,
        solve: appraisal.self_rating_solve ?? 0,
        lead: appraisal.self_rating_lead ?? 0,
      });
      setSelfComments(appraisal.self_comments ?? '');

      setManagerScores({
        technicalSkills: appraisal.manager_rating_tech ?? 0,
        communication: appraisal.manager_rating_comm ?? 0,
        teamwork: appraisal.manager_rating_team ?? 0,
        productivity: appraisal.manager_rating_prod ?? 0,
        problemSolving: appraisal.manager_rating_solve ?? 0,
        leadership: appraisal.manager_rating_lead ?? 0,
      });
      setManagerComments(appraisal.manager_comments ?? '');
      setStrengths(appraisal.manager_scores?.strengths ?? '');
      setImprovementAreas(appraisal.manager_scores?.improvement_areas ?? '');
      setPromotionRecommendation(appraisal.manager_scores?.promotion_recommendation ?? '');
      setHrComments(appraisal.final_comments ?? '');
      setIsAddingGoal(false);
    }
  }, [appraisal]);

  // Inject print styles dynamically on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const style = document.createElement('style');
    style.id = 'appraisal-print-styles';
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden !important;
        }
        #printable-appraisal-report, #printable-appraisal-report * {
          visibility: visible !important;
        }
        #printable-appraisal-report {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          background: white !important;
          color: black !important;
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById('appraisal-print-styles');
      if (el) el.remove();
    };
  }, []);

  if (!isOpen) return null;

  const currentEmployee = employees?.find((e: any) => Number(e.user_id) === Number(user?.id));

  // Derive permissions
  const isHR = isSuperAdmin || roleName === 'HR Admin' || permissions.includes('hr.performance.approve');
  const isSelf = appraisal ? permissions.includes('hr.performance.view') && !isHR : false;
  
  const isEvaluator = appraisal
    ? (isHR ||
       hasPermission('hr.performance.review') ||
       (appraisal.evaluator_id !== null && currentEmployee && Number(appraisal.evaluator_id) === Number(currentEmployee.id)))
    : false;

  console.log({
    'appraisal.evaluator_id': appraisal?.evaluator_id,
    'currentEmployee.id': currentEmployee?.id,
    isEvaluator,
    roleName
  });

  const canEditSelf = appraisal?.status === 'draft' || appraisal?.status === 'self_review' || (appraisal?.status as string) === 'Pending Self Review';
  const canEditManager = appraisal?.status === 'manager_review' && isEvaluator;
  const canApprove = appraisal?.status === 'completed' && isHR;

  // Auto-calculate dynamic overall score on the fly for UI feedback
  const managerScoresList = [
    managerScores.technicalSkills || 0,
    managerScores.communication || 0,
    managerScores.teamwork || 0,
    managerScores.productivity || 0,
    managerScores.problemSolving || 0,
  ];
  if (managerScores.leadership) {
    managerScoresList.push(managerScores.leadership);
  }
  const activeManagerScores = managerScoresList.filter(s => s > 0);
  const currentLiveOverallRating = activeManagerScores.length > 0
    ? Number((activeManagerScores.reduce((a, b) => a + b, 0) / activeManagerScores.length).toFixed(2))
    : null;

  const handleSelfRatingChange = (key: string, val: number) => {
    setSelfRatings(prev => ({ ...prev, [key]: val }));
  };

  const handleManagerRatingChange = (key: string, val: number) => {
    const scoreKey = CATEGORY_TO_SCORE_KEY[key];
    if (scoreKey) {
      setManagerScores(prev => ({ ...prev, [scoreKey]: val }));
    }
  };

  const submitSelf = async (isDraft = false) => {
    if (!appraisal) return;
    if (!isDraft) {
      const reqKeys = ['tech', 'comm', 'team', 'prod', 'solve'];
      const missing = reqKeys.filter(k => !selfRatings[k]);
      if (missing.length > 0) {
        setError('Please rate all 5 core mandatory categories before submitting.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmitSelfReview(appraisal.id, {
        self_rating_tech: selfRatings.tech || null,
        self_rating_comm: selfRatings.comm || null,
        self_rating_team: selfRatings.team || null,
        self_rating_prod: selfRatings.prod || null,
        self_rating_solve: selfRatings.solve || null,
        self_rating_lead: selfRatings.lead || null,
        self_comments: selfComments,
        is_draft: isDraft,
      });
      if (!isDraft) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitManager = async (isDraft = false) => {
    if (!appraisal) return;
    if (!isDraft) {
      const reqKeys = ['tech', 'comm', 'team', 'prod', 'solve'];
      const missing = reqKeys.filter(k => {
        const scoreKey = CATEGORY_TO_SCORE_KEY[k];
        return !scoreKey || !managerScores[scoreKey];
      });
      if (missing.length > 0) {
        setError('Please rate all 5 core mandatory categories before submitting.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmitManagerReview(appraisal.id, {
        manager_rating_tech: managerScores.technicalSkills || null,
        manager_rating_comm: managerScores.communication || null,
        manager_rating_team: managerScores.teamwork || null,
        manager_rating_prod: managerScores.productivity || null,
        manager_rating_solve: managerScores.problemSolving || null,
        manager_rating_lead: managerScores.leadership || null,
        manager_comments: managerComments,
        strengths: strengths,
        improvement_areas: improvementAreas,
        promotion_recommendation: promotionRecommendation,
        is_draft: isDraft,
      });
      if (!isDraft) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const approveReview = async () => {
    if (!appraisal) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await onApproveAppraisal(appraisal.id, hrComments);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to approve review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const rejectReview = async () => {
    if (!appraisal) return;
    if (!rejectComments) {
      setError('Please provide comments stating the reason for rejection.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      await onRejectAppraisal(appraisal.id, rejectComments);
      setShowRejectForm(false);
      setRejectComments('');
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to reject review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addGoal = async () => {
    if (!appraisal || !newGoalTitle) return;
    try {
      setIsSubmitting(true);
      await onCreateGoal({
        employee_id: appraisal.employee_id,
        appraisal_id: appraisal.id,
        title: newGoalTitle,
        weight: Number(newGoalWeight),
        progress_pct: Number(newGoalProgress),
        score: Number(newGoalScore),
      });
      setNewGoalTitle('');
      setIsAddingGoal(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to add goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateGoalScore = async (goal: ApiGoal, val: number) => {
    if (!appraisal) return;
    try {
      await onUpdateGoal(goal.id, appraisal.id, {
        title: goal.title,
        description: goal.description,
        weight: goal.weight,
        progress_pct: goal.progress_pct,
        score: val,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to update goal');
    }
  };

  const updateGoalProgress = async (goal: ApiGoal, val: number) => {
    if (!appraisal) return;
    try {
      await onUpdateGoal(goal.id, appraisal.id, {
        title: goal.title,
        description: goal.description,
        weight: goal.weight,
        progress_pct: val,
        score: goal.score,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to update goal');
    }
  };

  const deleteGoalItem = async (goalId: number) => {
    if (!appraisal) return;
    try {
      await onDeleteGoal(goalId, appraisal.id);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete goal');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs" onClick={onClose} />

      {/* Sliding Drawer Container */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-850 flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-850 px-6 py-5 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">
              Performance Review
            </span>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mt-1 truncate">
              {isLoading || !appraisal ? 'Loading Details...' : appraisal.employee_name}
            </h2>
            {appraisal && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium leading-none">
                {appraisal.designation} &bull; {appraisal.department} &bull; {appraisal.cycle_title}
              </p>
            )}
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Container */}
        {isLoading || !appraisal ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
            <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <span className="text-xs text-gray-400 font-semibold">Retrieving review cycles, categories & objectives...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-semibold border border-rose-100 dark:border-rose-900/30 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {appraisal.status === 'completed' || (appraisal.status as string) === 'Approved' ? (
              <div id="printable-appraisal-report" className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-3xl space-y-6 shadow-xs">
                {/* Report Header */}
                <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-850 pb-5">
                  <div>
                    <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider">Official Document</span>
                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">Performance Appraisal Report</h3>
                    <p className="text-[10px] text-gray-450 mt-1">Review Cycle: {appraisal.cycle_title}</p>
                  </div>
                  <div className="flex items-center gap-2 no-print">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 rounded-lg transition border border-gray-200 dark:border-gray-750"
                    >
                      <Printer size={13.5} />
                      <span>Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => generateAppraisalPdf(appraisal)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-850 text-white text-xs font-bold rounded-lg transition shadow-sm shadow-blue-500/20"
                    >
                      <ArrowDownToLine size={13.5} />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>

                {/* Info Cards Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5 p-3.5 bg-gray-50/50 dark:bg-gray-800/10 rounded-2xl border border-gray-100 dark:border-gray-850/40">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Employee Details</span>
                    <div className="font-extrabold text-gray-800 dark:text-gray-255">{appraisal.employee_name}</div>
                    <div className="text-gray-405 font-medium">Code: {appraisal.employee_code}</div>
                    <div className="text-gray-405 font-medium">{appraisal.designation} &bull; {appraisal.department}</div>
                  </div>
                  <div className="space-y-1.5 p-3.5 bg-gray-50/50 dark:bg-gray-800/10 rounded-2xl border border-gray-100 dark:border-gray-850/40">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Evaluator Details</span>
                    <div className="font-extrabold text-gray-800 dark:text-gray-255">{appraisal.manager_name || 'Unassigned'}</div>
                    <div className="text-gray-405 font-medium">Code: {appraisal.manager_code || '—'}</div>
                    <div className="text-gray-450 font-medium">Assigned: {new Date(appraisal.created_at).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Score & Badge Panel */}
                <div className="p-4 bg-amber-500/5 dark:bg-amber-950/5 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-extrabold uppercase text-amber-600 dark:text-amber-450 tracking-wider block">Appraisal Grade</span>
                    {appraisal.overall_rating != null ? (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const badge = getRatingBadge(appraisal.overall_rating);
                          return badge ? (
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${badge.color}`}>
                              {badge.label}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Rating calculation pending</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-amber-500 dark:text-amber-400 tracking-tight leading-none">
                      {appraisal.overall_rating ?? appraisal.final_rating ?? '0.00'} / 5.0
                    </div>
                    <span className="text-[8px] font-bold text-gray-455 block mt-1 uppercase tracking-wider">Overall Rating</span>
                  </div>
                </div>

                {/* Ratings Table */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Category Ratings Summary</span>
                  <div className="border border-gray-150 dark:border-gray-850 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/10 border-b border-gray-150 dark:border-gray-850 font-bold text-gray-500">
                          <th className="px-4 py-2.5">Category</th>
                          <th className="px-4 py-2.5 text-center">Self Score</th>
                          <th className="px-4 py-2.5 text-center">Manager Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                        {CATEGORIES.map((cat) => (
                          <tr key={cat.key} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/5">
                            <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300">{cat.label}</td>
                            <td className="px-4 py-2.5 text-center font-bold text-gray-500 dark:text-gray-455">{(appraisal as any)[`self_rating_${cat.key}`] ?? '—'}</td>
                            <td className="px-4 py-2.5 text-center font-bold text-gray-800 dark:text-gray-200">{(appraisal as any)[`manager_rating_${cat.key}`] ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Goals Summary */}
                {appraisal.goals && appraisal.goals.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Goals & Objectives</span>
                    <div className="border border-gray-150 dark:border-gray-850 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800/10 border-b border-gray-150 dark:border-gray-850 font-bold text-gray-500">
                            <th className="px-4 py-2.5">Goal Description</th>
                            <th className="px-4 py-2.5 text-center">Weight</th>
                            <th className="px-4 py-2.5 text-center">Progress</th>
                            <th className="px-4 py-2.5 text-center">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                          {appraisal.goals.map((g) => (
                            <tr key={g.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/5">
                              <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300">{g.title}</td>
                              <td className="px-4 py-2.5 text-center font-semibold text-gray-500">{g.weight}%</td>
                              <td className="px-4 py-2.5 text-center font-semibold text-gray-500">{g.progress_pct}%</td>
                              <td className="px-4 py-2.5 text-center font-bold text-gray-800 dark:text-gray-200">{g.score || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Detailed Feedback & Comments */}
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Feedback Comments & Notes</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="font-bold text-gray-500">Employee Self Comments</span>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/20 border border-gray-155 dark:border-gray-850 rounded-xl leading-relaxed text-gray-650 dark:text-gray-400">
                        {appraisal.self_comments || 'No self feedback logged.'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-gray-500">Manager Review Comments</span>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/20 border border-gray-155 dark:border-gray-850 rounded-xl leading-relaxed text-gray-650 dark:text-gray-400">
                        {appraisal.manager_comments || 'No evaluation comments logged.'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="font-bold text-gray-500 block">Strengths Notes</span>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/20 border border-gray-155 dark:border-gray-850 rounded-xl leading-relaxed text-gray-650 dark:text-gray-400">
                        {appraisal.manager_scores?.strengths || '—'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-gray-500 block">Areas of Improvement</span>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/20 border border-gray-155 dark:border-gray-850 rounded-xl leading-relaxed text-gray-650 dark:text-gray-400">
                        {appraisal.manager_scores?.improvement_areas || '—'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-gray-500 block">Promotion Recommendation</span>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/20 border border-gray-155 dark:border-gray-850 rounded-xl leading-relaxed text-gray-650 dark:text-gray-400 font-semibold">
                        {appraisal.manager_scores?.promotion_recommendation || 'No promotion details logged.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sign Off Remarks */}
                {appraisal.final_comments && (
                  <div className="space-y-1 text-xs pt-4 border-t border-gray-150 dark:border-gray-850">
                    <span className="font-bold text-gray-500 block">HR Approver Remarks & Sign-Off</span>
                    <div className="p-3.5 bg-gray-50 dark:bg-gray-800/25 border border-gray-150 dark:border-gray-850 rounded-xl leading-relaxed text-gray-700 dark:text-gray-350 italic">
                      "{appraisal.final_comments}"
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Overall Rating Section */}
                {(currentLiveOverallRating != null || appraisal.overall_rating != null) ? (
                  <div className="p-5 bg-amber-50 dark:bg-amber-950/15 rounded-2xl border border-amber-100 dark:border-amber-900/20 flex items-center justify-between">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block leading-none">Overall Appraisal Rating</span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Badge:</span>
                        {(() => {
                          const badge = getRatingBadge(currentLiveOverallRating ?? appraisal.overall_rating);
                          return badge ? (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${badge.color}`}>
                              {badge.label}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      {appraisal.approved_at && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                          Approved on: {new Date(appraisal.approved_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 text-3xl font-black text-amber-500 dark:text-amber-400 tracking-tight tabular-nums">
                        <TrendingUp size={28} />
                        {currentLiveOverallRating ?? appraisal.overall_rating ?? appraisal.final_rating}
                      </div>
                      <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 block mt-1 uppercase tracking-wider">Out of 5.0</span>
                    </div>
                  </div>
                ) : null}

                {/* Review Category Ratings Tab */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">Assessment Categories</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-normal">
                      Rates performance categories from 1 (Needs Improvement) to 5 (Outstanding).
                    </p>
                  </div>

                  <div className="space-y-4 bg-gray-50/50 dark:bg-gray-800/10 p-5 rounded-2xl border border-gray-100 dark:border-gray-850/40">
                    {CATEGORIES.map((cat) => {
                      const selfVal = selfRatings[cat.key] || 0;
                      const scoreKey = CATEGORY_TO_SCORE_KEY[cat.key];
                      const managerVal = scoreKey ? (managerScores[scoreKey] || 0) : 0;

                      return (
                        <div key={cat.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 border-b border-gray-100 dark:border-gray-850/50 last:border-0">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">{cat.label}</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 block mt-0.5 leading-normal">{cat.desc}</span>
                          </div>

                          <div className="flex items-center gap-6 shrink-0">
                            {/* Employee Self-Score */}
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Self</span>
                              {canEditSelf ? (
                                <div className="flex items-center gap-1 mt-1 bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-850">
                                  {[1, 2, 3, 4, 5].map(val => (
                                    <button
                                      type="button"
                                      key={val}
                                      onClick={() => handleSelfRatingChange(cat.key, val)}
                                      className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center border ${
                                        selfVal === val
                                          ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                          : 'border-gray-200 dark:border-gray-850 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-850'
                                      }`}
                                    >
                                      {val}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm font-bold text-gray-600 dark:text-gray-400 mt-1 tabular-nums">
                                  {selfVal || '—'}
                                </div>
                              )}
                            </div>

                            {/* Manager Review Score */}
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">Manager</span>
                              {canEditManager ? (
                                <div className="flex items-center gap-1 mt-1 bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-850">
                                  {[1, 2, 3, 4, 5].map(val => (
                                    <button
                                      type="button"
                                      key={val}
                                      onClick={() => handleManagerRatingChange(cat.key, val)}
                                      className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center border ${
                                        managerVal === val
                                          ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                          : 'border-gray-200 dark:border-gray-850 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-850'
                                      }`}
                                    >
                                      {val}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm font-black text-gray-700 dark:text-gray-300 mt-1 tabular-nums">
                                  {managerVal || '—'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Comments Area */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Employee comments */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Employee Self Comments
                    </label>
                    {canEditSelf ? (
                      <textarea
                        rows={4}
                        value={selfComments}
                        onChange={(e) => setSelfComments(e.target.value)}
                        placeholder="Enter self-reflection, highlights, areas for growth..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-850 bg-transparent text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition resize-none leading-relaxed"
                      />
                    ) : (
                      <div className="p-3.5 bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-850/40 rounded-2xl text-xs text-gray-600 dark:text-gray-400 min-h-[100px] leading-relaxed whitespace-pre-wrap">
                        {appraisal.self_comments || 'No comments submitted.'}
                      </div>
                    )}
                  </div>

                  {/* Manager comments */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Manager Review Comments
                    </label>
                    {canEditManager && isEvaluator ? (
                      <textarea
                        rows={4}
                        value={managerComments}
                        onChange={(e) => setManagerComments(e.target.value)}
                        placeholder="Enter manager feedback, goals evaluation, performance summary..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-850 bg-transparent text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition resize-none leading-relaxed"
                      />
                    ) : (
                      <div className="p-3.5 bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-850/40 rounded-2xl text-xs text-gray-600 dark:text-gray-400 min-h-[100px] leading-relaxed whitespace-pre-wrap">
                        {appraisal.manager_comments || 'No comments submitted.'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Phase 2 Manager Textareas (Strengths, Improvements, Recommendations) */}
                {canEditManager && isEvaluator ? (
                  <div className="space-y-4 border-t border-gray-100 dark:border-gray-850/60 pt-6">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Manager Evaluation Areas</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Strengths */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                          Strengths & Accomplishments
                        </label>
                        <textarea
                          rows={4}
                          value={strengths}
                          onChange={(e) => setStrengths(e.target.value)}
                          placeholder="Key strengths, major milestones achieved, positive attributes..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-850 bg-transparent text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition resize-none leading-relaxed"
                        />
                      </div>

                      {/* Improvement Areas */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                          Areas of Improvement
                        </label>
                        <textarea
                          rows={4}
                          value={improvementAreas}
                          onChange={(e) => setImprovementAreas(e.target.value)}
                          placeholder="Identified weaknesses, training needs, process enhancements..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-850 bg-transparent text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition resize-none leading-relaxed"
                        />
                      </div>

                      {/* Promotion Recommendation */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                          Promotion Recommendation
                        </label>
                        <textarea
                          rows={4}
                          value={promotionRecommendation}
                          onChange={(e) => setPromotionRecommendation(e.target.value)}
                          placeholder="Recommend for promotion? Next level designation..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-850 bg-transparent text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Goals & KPI Tracking */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-gray-900 dark:text-white">Goals & KPI Targets</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-normal">
                        Individual deliverables contributing 40% to the overall appraisal rating.
                      </p>
                    </div>
                    {/* Allow goal adjustments if review is active and user has evaluator/HR rights */}
                    {(appraisal.status === 'draft' || appraisal.status === 'self_review' || appraisal.status === 'manager_review') && (isEvaluator || isHR) && (
                      <PermissionGuard require="hr.performance.create">
                        <button
                          type="button"
                          onClick={() => setIsAddingGoal(!isAddingGoal)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                        >
                          <Plus size={13} />
                          {isAddingGoal ? 'Cancel' : 'Add Goal'}
                        </button>
                      </PermissionGuard>
                    )}
                  </div>

                  {/* Goal Insert Inline form */}
                  {isAddingGoal && (
                    <div className="p-4 border border-amber-100 dark:border-amber-900/30 bg-amber-500/5 dark:bg-amber-950/5 rounded-2xl space-y-3.5">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Goal Title *</label>
                          <input
                            type="text"
                            value={newGoalTitle}
                            onChange={(e) => setNewGoalTitle(e.target.value)}
                            placeholder="e.g. Complete SDEC integrations framework..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Weightage (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={newGoalWeight}
                            onChange={(e) => setNewGoalWeight(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Progress (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={newGoalProgress}
                            onChange={(e) => setNewGoalProgress(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Initial Score (1-5)</label>
                          <select
                            value={newGoalScore}
                            onChange={(e) => setNewGoalScore(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition"
                          >
                            <option value="0">Unrated</option>
                            {[1, 2, 3, 4, 5].map(v => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1.5 border-t border-gray-100 dark:border-gray-850/50">
                        <button
                          type="button"
                          onClick={() => setIsAddingGoal(false)}
                          className="px-3.5 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:underline"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={addGoal}
                          className="px-3.5 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition"
                        >
                          Add Goal
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Goals list */}
                  {!appraisal.goals || appraisal.goals.length === 0 ? (
                    <div className="p-6 bg-gray-50 dark:bg-gray-800/10 rounded-2xl border border-gray-100 dark:border-gray-850/40 text-center flex flex-col items-center justify-center gap-2">
                      <Target className="text-gray-300 dark:text-gray-700" size={24} />
                      <span className="text-xs text-gray-400 font-semibold">No target goals assigned for this review cycle.</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {appraisal.goals.map((g) => {
                        const isGoalEditable = (appraisal.status === 'draft' || appraisal.status === 'self_review' || appraisal.status === 'manager_review') && (isEvaluator || isHR);

                        return (
                          <div key={g.id} className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-850 flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <span className="text-[9px] font-extrabold text-amber-500 dark:text-amber-500 uppercase tracking-wider block">
                                  Goal Objective &bull; Weight {g.weight}%
                                </span>
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1 block">
                                  {g.title}
                                </span>
                              </div>

                              {isGoalEditable && (
                                <button
                                  type="button"
                                  onClick={() => deleteGoalItem(g.id)}
                                  className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition shrink-0"
                                  title="Delete Goal"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-gray-50 dark:border-gray-850/50">
                              <div className="flex items-center gap-4 shrink-0">
                                <div className="space-y-0.5">
                                  <span className="text-[9px] font-extrabold text-gray-450 dark:text-gray-500 uppercase block">Progress</span>
                                  {isGoalEditable ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={g.progress_pct ?? 0}
                                        onChange={(e) => updateGoalProgress(g, Number(e.target.value))}
                                        className="w-24 h-1.5 bg-gray-150 rounded-lg appearance-none cursor-pointer accent-amber-500 dark:bg-gray-800"
                                      />
                                      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                                        {g.progress_pct}%
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                                      {g.progress_pct}%
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-0.5">
                                <span className="text-[9px] font-extrabold text-gray-450 dark:text-gray-500 uppercase block">Rating Score</span>
                                {isGoalEditable ? (
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map(v => (
                                      <button
                                        type="button"
                                        key={v}
                                        onClick={() => updateGoalScore(g, v)}
                                        className={`text-[10px] font-extrabold w-5 h-5 rounded-md border flex items-center justify-center transition ${
                                          g.score === v
                                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                            : 'border-gray-200 dark:border-gray-850 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-850'
                                        }`}
                                      >
                                        {v}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                                    {g.score || 'Unrated'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Rejection Form Drawer UI */}
                {showRejectForm && (
                  <div className="p-5 border border-rose-200 dark:border-rose-900 bg-rose-500/5 dark:bg-rose-950/5 rounded-2xl space-y-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-rose-600 dark:text-rose-450 tracking-wider">
                        Reject Assessment Review
                      </h3>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                        Send the appraisal back as rejected.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block">Rejection Reason *</label>
                        <textarea
                          rows={3}
                          value={rejectComments}
                          onChange={(e) => setRejectComments(e.target.value)}
                          placeholder="Explain why this review is being returned..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-rose-500 dark:focus:border-rose-500 transition resize-none leading-relaxed"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1 border-t border-gray-100 dark:border-gray-850/50">
                        <button
                          type="button"
                          onClick={() => setShowRejectForm(false)}
                          className="px-3.5 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:underline"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={rejectReview}
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition"
                        >
                          Confirm Rejection
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* HR Sign Off Review */}
                {canApprove && (
                  <div className="p-5 border border-gray-200 dark:border-gray-850 rounded-2xl space-y-4">
                    <div>
                      <h3 className="text-xs font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                        HR Sign-Off & Approvals
                      </h3>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                        HR review comments and final sign-off lock.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={hrComments}
                        onChange={(e) => setHrComments(e.target.value)}
                        placeholder="Enter HR approval remarks, final performance increment notes, action plans..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-850 bg-transparent text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Drawer Action Bar */}
        {!isLoading && appraisal && (
          <div className="border-t border-gray-200 dark:border-gray-850 px-6 py-4 bg-gray-50/50 dark:bg-gray-900 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-850 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              disabled={isSubmitting}
            >
              Close Drawer
            </button>

            {/* Self-Review buttons */}
            {canEditSelf && (
              <>
                <button
                  type="button"
                  onClick={() => submitSelf(true)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-850 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  disabled={isSubmitting}
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => submitSelf(false)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 dark:bg-amber-600 hover:bg-amber-600 dark:hover:bg-amber-700 text-sm font-semibold text-white transition shadow-sm flex items-center gap-1.5"
                  disabled={isSubmitting}
                >
                  <CheckCircle2 size={16} />
                  {isSubmitting ? 'Submitting...' : 'Submit Self Review'}
                </button>
              </>
            )}

            {/* Manager-Review buttons */}
            {canEditManager && isEvaluator && (
              <>
                {!showRejectForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectForm(true);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-sm font-semibold transition"
                    disabled={isSubmitting}
                  >
                    Reject Review
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => submitManager(true)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-850 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  disabled={isSubmitting}
                >
                  Save Draft
                </button>
                <PermissionGuard require="hr.performance.review">
                  <button
                    type="button"
                    onClick={() => submitManager(false)}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 dark:bg-amber-600 hover:bg-amber-600 dark:hover:bg-amber-700 text-sm font-semibold text-white transition shadow-sm flex items-center gap-1.5"
                    disabled={isSubmitting}
                  >
                    <CheckCircle2 size={16} />
                    {isSubmitting ? 'Submitting...' : 'Submit Manager Review'}
                  </button>
                </PermissionGuard>
              </>
            )}

            {/* Approve Review button */}
            {canApprove && (
              <PermissionGuard require="hr.performance.approve">
                {!showRejectForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectForm(true);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-rose-250 dark:border-rose-900 text-rose-600 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-sm font-semibold transition"
                    disabled={isSubmitting}
                  >
                    Reject Review
                  </button>
                )}
                <button
                  type="button"
                  onClick={approveReview}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-800 text-sm font-semibold text-white transition shadow-sm flex items-center gap-1.5"
                  disabled={isSubmitting}
                >
                  <CheckCircle2 size={16} />
                  {isSubmitting ? 'Approving...' : 'Approve & Sign-Off'}
                </button>
              </PermissionGuard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
