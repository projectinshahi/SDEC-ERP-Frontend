'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Candidate, CandidateStage } from './recruitment.types';
import {
  fetchCandidates,
  fetchStats,
  createCandidate,
  updateCandidate,
  updateCandidateStage,
  deleteCandidate,
  ApiCandidate,
  ApiRecruitmentStats,
  SaveCandidatePayload,
} from '../api/hr-recruitment';

export function adaptCandidate(c: ApiCandidate): Candidate {
  return {
    id: String(c.id),
    name: c.full_name,
    role: c.position,
    experience: c.experience ?? 'Not specified',
    stage: c.stage as CandidateStage,
    email: c.email ?? '',
    phone: c.phone ?? '',
    notes: c.notes ?? '',
    expectedCtc: c.expected_ctc ?? 0,
    resumeUrl: c.resume_url ?? '',
    interviewDate: c.interview_date ?? '',
    department: c.department ?? '',
    source: c.source ?? '',
  };
}

export function useRecruitment() {
  const [candidates, setCandidates] = useState<ApiCandidate[]>([]);
  const [stats, setStats] = useState<ApiRecruitmentStats>({
    Applied: 0,
    Screening: 0,
    Interview: 0,
    Offer: 0,
    Hired: 0,
    Rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('All');

  // Candidate Entry Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState<ApiCandidate | null>(null);

  // Candidate Details Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [candidatesData, statsData] = await Promise.all([
        fetchCandidates(),
        fetchStats(),
      ]);
      setCandidates(candidatesData);
      setStats(statsData);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? 'Failed to load recruitment data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived filtered candidate list
  const adaptedCandidates = useMemo(() => {
    return candidates.map(adaptCandidate);
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return adaptedCandidates.filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        (c.department && c.department.toLowerCase().includes(q));

      const matchesStage = selectedStage === 'All' || c.stage === selectedStage;

      return matchesSearch && matchesStage;
    });
  }, [adaptedCandidates, search, selectedStage]);

  // Stage change transition
  const handleStageChange = async (candidateId: string, nextStage: CandidateStage) => {
    try {
      const id = Number(candidateId);
      if (isNaN(id)) return;
      await updateCandidateStage(id, nextStage);
      await loadData();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to update candidate stage');
    }
  };

  // Add/Edit Candidate Submit
  const handleSaveCandidate = async (payload: SaveCandidatePayload) => {
    try {
      if (activeCandidate) {
        await updateCandidate(activeCandidate.id, payload);
      } else {
        await createCandidate(payload);
      }
      setIsModalOpen(false);
      setActiveCandidate(null);
      await loadData();
    } catch (err: any) {
      throw new Error(err?.message ?? 'Failed to save candidate');
    }
  };

  // Delete Candidate
  const handleDeleteCandidate = async (candidateId: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    try {
      const id = Number(candidateId);
      if (isNaN(id)) return;
      await deleteCandidate(id);
      await loadData();
    } catch (err: any) {
      alert(err?.message ?? 'Failed to delete candidate');
    }
  };

  const handleOpenAdd = () => {
    setActiveCandidate(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (candidate: Candidate) => {
    const raw = candidates.find((c) => String(c.id) === candidate.id) ?? null;
    if (raw) {
      setActiveCandidate(raw);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveCandidate(null);
  };

  const handleOpenDetail = (candidate: Candidate) => {
    setDetailCandidate(candidate);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailCandidate(null);
    setIsDetailOpen(false);
  };

  return {
    candidates: adaptedCandidates,
    filteredCandidates,
    stats,
    isLoading,
    error,
    search,
    setSearch,
    selectedStage,
    setSelectedStage,
    isModalOpen,
    activeCandidate,
    isDetailOpen,
    detailCandidate,
    handleStageChange,
    handleSaveCandidate,
    handleDeleteCandidate,
    handleOpenAdd,
    handleOpenEdit,
    handleCloseModal,
    handleOpenDetail,
    handleCloseDetail,
    refresh: loadData,
  };
}
