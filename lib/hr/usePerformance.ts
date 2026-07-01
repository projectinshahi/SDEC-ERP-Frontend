'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ApiPerformanceCycle, ApiAppraisal, ApiGoal, PerformanceStats } from './performance.types';
import {
  fetchCycles,
  createCycle,
  fetchAppraisals,
  fetchAppraisalById,
  createAppraisal,
  updateAppraisal,
  updateAppraisalStatus,
  deleteAppraisal,
  submitSelfReview,
  submitManagerReview,
  approveAppraisal,
  rejectAppraisal,
  fetchPerformanceStats,
  fetchGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from '../api/hr-performance';
import { fetchEmployees, ApiEmployee } from '../api/hr';

export function usePerformance() {
  const [cycles, setCycles] = useState<ApiPerformanceCycle[]>([]);
  const [appraisals, setAppraisals] = useState<ApiAppraisal[]>([]);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [stats, setStats] = useState<PerformanceStats>({ active: 0, self_pending: 0, manager_pending: 0, completed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [filterCycle, setFilterCycle] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modal / Drawer States
  const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
  const [isAppraisalModalOpen, setIsAppraisalModalOpen] = useState(false);
  const [isReviewDrawerOpen, setIsReviewDrawerOpen] = useState(false);
  const [selectedAppraisalId, setSelectedAppraisalId] = useState<number | null>(null);
  const [detailedAppraisal, setDetailedAppraisal] = useState<ApiAppraisal | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [cyclesData, appraisalsData, employeesData, statsData] = await Promise.all([
        fetchCycles(),
        fetchAppraisals(),
        fetchEmployees(),
        fetchPerformanceStats(),
      ]);
      setCycles(cyclesData);
      setAppraisals(appraisalsData);
      setEmployees(employeesData);
      setStats(statsData);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? 'Failed to load performance data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load single appraisal details with goals
  const loadAppraisalDetails = useCallback(async (id: number) => {
    try {
      setIsLoadingDetails(true);
      const details = await fetchAppraisalById(id);
      setDetailedAppraisal(details);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  const openReviewDrawer = useCallback(async (id: number) => {
    setSelectedAppraisalId(id);
    setIsReviewDrawerOpen(true);
    await loadAppraisalDetails(id);
  }, [loadAppraisalDetails]);

  const closeReviewDrawer = useCallback(() => {
    setIsReviewDrawerOpen(false);
    setSelectedAppraisalId(null);
    setDetailedAppraisal(null);
  }, []);

  // Filtered appraisals list
  const filteredAppraisals = useMemo(() => {
    return appraisals.filter(a => {
      const matchesSearch =
        a.employee_name.toLowerCase().includes(search.toLowerCase()) ||
        a.employee_code.toLowerCase().includes(search.toLowerCase()) ||
        a.department.toLowerCase().includes(search.toLowerCase()) ||
        a.designation.toLowerCase().includes(search.toLowerCase()) ||
        (a.manager_name && a.manager_name.toLowerCase().includes(search.toLowerCase()));

      const matchesCycle = filterCycle === 'All' || String(a.cycle_id) === filterCycle;
      const matchesStatus = filterStatus === 'All' || a.status === filterStatus;

      return matchesSearch && matchesCycle && matchesStatus;
    });
  }, [appraisals, search, filterCycle, filterStatus]);

  // Mutator functions
  const handleCreateCycle = async (payload: { title: string; start_date: string; end_date: string; status?: string }) => {
    await createCycle(payload);
    await loadData();
  };

  const handleAssignAppraisal = async (payload: { employee_id: number; cycle_id: number; evaluator_id?: number | null }) => {
    await createAppraisal(payload);
    await loadData();
  };

  const handleUpdateAppraisal = async (id: number, payload: { evaluator_id: number; cycle_id: number }) => {
    await updateAppraisal(id, payload);
    await loadData();
    if (selectedAppraisalId === id) {
      await loadAppraisalDetails(id);
    }
  };

  const handleUpdateStatus = async (id: number, payload: { status: string; final_comments?: string | null }) => {
    await updateAppraisalStatus(id, payload);
    await loadData();
    if (selectedAppraisalId === id) {
      await loadAppraisalDetails(id);
    }
  };

  const handleDeleteAppraisal = async (id: number) => {
    await deleteAppraisal(id);
    await loadData();
    if (selectedAppraisalId === id) {
      closeReviewDrawer();
    }
  };

  const handleSubmitSelfReview = async (
    id: number,
    payload: {
      self_rating_tech: number;
      self_rating_comm: number;
      self_rating_team: number;
      self_rating_prod: number;
      self_rating_solve: number;
      self_rating_lead?: number | null;
      self_comments?: string | null;
      is_draft?: boolean;
    }
  ) => {
    await submitSelfReview(id, payload);
    await loadData();
    if (selectedAppraisalId === id) {
      await loadAppraisalDetails(id);
    }
  };

  const handleSubmitManagerReview = async (
    id: number,
    payload: {
      manager_rating_tech: number;
      manager_rating_comm: number;
      manager_rating_team: number;
      manager_rating_prod: number;
      manager_rating_solve: number;
      manager_rating_lead?: number | null;
      manager_comments?: string | null;
      strengths?: string | null;
      improvement_areas?: string | null;
      promotion_recommendation?: string | null;
      is_draft?: boolean;
    }
  ) => {
    await submitManagerReview(id, payload);
    await loadData();
    if (selectedAppraisalId === id) {
      await loadAppraisalDetails(id);
    }
  };

  const handleApproveAppraisal = async (id: number, final_comments?: string | null) => {
    await approveAppraisal(id, final_comments);
    await loadData();
    if (selectedAppraisalId === id) {
      await loadAppraisalDetails(id);
    }
  };

  const handleRejectAppraisal = async (id: number, comments?: string | null) => {
    await rejectAppraisal(id, comments);
    await loadData();
    if (selectedAppraisalId === id) {
      await loadAppraisalDetails(id);
    }
  };

  // Goals CRUD wrappers (auto-refresh details when editing within an appraisal context)
  const handleCreateGoal = async (payload: {
    employee_id: number;
    appraisal_id?: number | null;
    title: string;
    description?: string | null;
    weight?: number;
    progress_pct?: number;
    score?: number;
    target_date?: string | null;
  }) => {
    await createGoal(payload);
    await loadData();
    if (payload.appraisal_id) {
      await loadAppraisalDetails(payload.appraisal_id);
    }
  };

  const handleUpdateGoal = async (
    goalId: number,
    appraisalId: number | null,
    payload: {
      title: string;
      description?: string | null;
      weight?: number;
      progress_pct?: number;
      score?: number;
      target_date?: string | null;
    }
  ) => {
    await updateGoal(goalId, payload);
    await loadData();
    if (appraisalId) {
      await loadAppraisalDetails(appraisalId);
    }
  };

  const handleDeleteGoal = async (goalId: number, appraisalId: number | null) => {
    await deleteGoal(goalId);
    await loadData();
    if (appraisalId) {
      await loadAppraisalDetails(appraisalId);
    }
  };

  return {
    cycles,
    appraisals,
    employees,
    stats,
    isLoading,
    error,
    search,
    setSearch,
    filterCycle,
    setFilterCycle,
    filterStatus,
    setFilterStatus,
    filteredAppraisals,

    // Modal state
    isCycleModalOpen,
    setIsCycleModalOpen,
    isAppraisalModalOpen,
    setIsAppraisalModalOpen,
    isReviewDrawerOpen,
    detailedAppraisal,
    isLoadingDetails,
    openReviewDrawer,
    closeReviewDrawer,
    refreshDetails: () => selectedAppraisalId && loadAppraisalDetails(selectedAppraisalId),

    // Mutator callbacks
    handleCreateCycle,
    handleAssignAppraisal,
    handleUpdateAppraisal,
    handleUpdateStatus,
    handleDeleteAppraisal,
    handleSubmitSelfReview,
    handleSubmitManagerReview,
    handleApproveAppraisal,
    handleRejectAppraisal,
    handleCreateGoal,
    handleUpdateGoal,
    handleDeleteGoal,
  };
}
