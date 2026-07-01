'use client';

import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { CandidatePipeline } from '@/components/hr/recruitment/CandidatePipeline';
import { useRecruitment } from '@/lib/hr/useRecruitment';

export default function RecruitmentPage() {
  const state = useRecruitment();

  if (state.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-xs font-semibold text-gray-500">Loading recruitment module…</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 mb-4">
          <AlertCircle size={22} />
        </div>
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Failed to load recruitment data</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-xs">{state.error}</p>
        <button
          onClick={state.refresh}
          className="mt-4 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Recruitment Pipeline
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track applicants and hiring progress
        </p>
      </div>

      <CandidatePipeline state={state} />
    </div>
  );
}