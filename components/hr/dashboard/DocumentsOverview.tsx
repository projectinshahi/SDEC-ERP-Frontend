'use client';

import Link from 'next/link';
import { FileCheck, ArrowRight, CheckCircle2, Clock, XCircle, PackageOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchDocuments } from '@/lib/api/hr-documents';

interface DocumentStats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
}

interface DocumentsOverviewProps {
  loading?: boolean;
}

export function DocumentsOverview({ loading: parentLoading = false }: DocumentsOverviewProps) {
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLocalLoading(true);
    fetchDocuments()
      .then((docs) => {
        const verified = docs.filter((d) => d.status === 'Verified').length;
        const pending = docs.filter((d) => d.status === 'Pending').length;
        const rejected = docs.filter((d) => d.status === 'Rejected').length;
        setStats({ total: docs.length, verified, pending, rejected });
        setError(false);
      })
      .catch(() => {
        setError(true);
        setStats(null);
      })
      .finally(() => setLocalLoading(false));
  }, []);

  const loading = parentLoading || localLoading;
  const tot = stats?.total ?? 0;
  const ver = stats?.verified ?? 0;
  const pen = stats?.pending ?? 0;
  const rej = stats?.rejected ?? 0;
  const verPct = tot > 0 ? Math.round((ver / tot) * 100) : 0;
  const isEmpty = !loading && !error && tot === 0;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-gray-900 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-850 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <FileCheck size={14} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Documents Overview</h2>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-9">HR document verification status</p>
        </div>
        <Link
          href="/dashboard/hr/documents"
          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-305 transition-colors"
        >
          View all <ArrowRight size={11} />
        </Link>
      </div>

      {/* Body */}
      <div className="flex-1 p-5 flex flex-col gap-4">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full" />
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 gap-2 text-center">
            <XCircle size={28} className="text-rose-450" />
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-500">Failed to load documents</p>
          </div>
        ) : isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 gap-3 text-center">
            <PackageOpen size={32} className="text-gray-300 dark:text-gray-750" />
            <p className="text-sm font-semibold text-gray-400 dark:text-gray-650">No documents uploaded yet</p>
            <Link href="/dashboard/hr/documents" className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">
              Upload Document →
            </Link>
          </div>
        ) : (
          <>
            {/* Total documents */}
            <div className="rounded-xl border border-sky-100 dark:border-sky-900/30 bg-sky-50/60 dark:bg-sky-950/15 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-500 dark:text-sky-450 mb-1">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{tot}</p>
              <p className="text-[11px] text-gray-550 dark:text-gray-400 mt-0.5">{verPct}% verified</p>
            </div>

            {/* Verification progress bar */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Verification Rate</span>
                <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">{verPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-700"
                  style={{ width: `${verPct}%` }}
                />
              </div>
            </div>

            {/* Status breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/60 dark:bg-gray-800/20 p-3 text-center">
                <CheckCircle2 size={14} className="text-gray-400 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Verified</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums mt-0.5">{ver}</p>
              </div>
              <div className="rounded-xl border border-sky-100 dark:border-sky-900/30 bg-sky-50/60 dark:bg-sky-950/15 p-3 text-center">
                <Clock size={14} className="text-sky-500 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide">Pending</p>
                <p className="text-lg font-bold text-sky-700 dark:text-sky-400 tabular-nums mt-0.5">{pen}</p>
              </div>
              <div className="rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/60 dark:bg-gray-800/20 p-3 text-center">
                <XCircle size={14} className="text-gray-400 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rejected</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums mt-0.5">{rej}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
