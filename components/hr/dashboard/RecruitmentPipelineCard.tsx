'use client';

import Link from 'next/link';
import { Briefcase, ArrowRight } from 'lucide-react';

interface RecruitmentStats {
  Applied: number;
  Screening: number;
  Interview: number;
  Offer: number;
  Hired: number;
  Rejected?: number;
}

interface RecruitmentPipelineCardProps {
  stats?: RecruitmentStats;
  loading?: boolean;
}

const STAGES = [
  { key: 'Applied',   label: 'Applied',   color: '#2563eb', bg: 'bg-blue-600' },
  { key: 'Screening', label: 'Screening', color: '#3b82f6', bg: 'bg-blue-500' },
  { key: 'Interview', label: 'Interview', color: '#60a5fa', bg: 'bg-blue-400' },
  { key: 'Offer',     label: 'Offer',     color: '#6366f1', bg: 'bg-indigo-500' },
  { key: 'Hired',     label: 'Hired',     color: '#4f46e5', bg: 'bg-indigo-600' },
];

export function RecruitmentPipelineCard({ stats, loading = false }: RecruitmentPipelineCardProps) {
  const data = stats ?? null;
  const totalActive = data
    ? STAGES.reduce((s, st) => s + (data[st.key as keyof RecruitmentStats] as number ?? 0), 0)
    : 0;
  const maxCount = data
    ? Math.max(...STAGES.map((s) => data[s.key as keyof RecruitmentStats] as number ?? 0), 1)
    : 1;
  const isEmpty = !loading && !data;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-850 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Briefcase size={14} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Recruitment Pipeline</h2>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-9">Candidates by hiring stage</p>
        </div>
        <Link
          href="/dashboard/hr/recruitment"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          View all <ArrowRight size={11} />
        </Link>
      </div>

      {/* Stats — hide when empty */}
      {!isEmpty && (
        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 px-4 py-2.5 flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400">Total Active</span>
            <span className="text-xl font-black text-gray-900 dark:text-white tabular-nums">{totalActive}</span>
          </div>
        </div>
      )}

      {/* Pipeline bars */}
      <div className="flex-1 px-5 pb-5 pt-3 space-y-4 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {STAGES.map((s) => (
              <div key={s.key}>
                <div className="flex justify-between mb-1.5">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-6" />
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <Briefcase size={28} className="text-gray-300 dark:text-gray-700" />
            <p className="text-sm font-semibold text-gray-400 dark:text-gray-600">No recruitment data yet</p>
          </div>
        ) : (
          STAGES.map((stage) => {
            const count = data ? ((data[stage.key as keyof RecruitmentStats] as number) ?? 0) : 0;
            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return (
              <div key={stage.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">{stage.label}</span>
                  </div>
                  <span className="text-[12px] font-black text-gray-900 dark:text-white tabular-nums">{count}</span>
                </div>
                <div className="relative h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${stage.bg}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
