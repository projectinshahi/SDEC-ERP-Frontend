'use client';

import Link from 'next/link';
import { Landmark, ArrowRight, CheckCircle2, Clock, PackageOpen } from 'lucide-react';

interface PayrollSnapshotProps {
  totalInCycle?: number;    // total payroll records this month
  paid?: number;            // count with status=Paid
  pending?: number;         // count with status=Pending
  totalAmount?: number;     // sum of net_salary for pending records
  period?: string;          // e.g. "June 2026"
  loading?: boolean;
}

function formatINR(amount: number): string {
  if (amount === 0) return '₹0';
  return '₹' + amount.toLocaleString('en-IN');
}

export function PayrollSnapshot({
  totalInCycle,
  paid,
  pending,
  totalAmount,
  period,
  loading = false,
}: PayrollSnapshotProps) {
  const tot = totalInCycle ?? 0;
  const paidCount = paid ?? 0;
  const pendCount = pending ?? 0;
  const amount = totalAmount ?? 0;
  const periodLabel = period ?? '—';

  // Progress = paid / total, never exceeds 100
  const processedPct = tot > 0 ? Math.min(100, Math.round((paidCount / tot) * 100)) : 0;

  const isEmpty = tot === 0 && !loading;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Landmark size={14} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Payroll Snapshot</h2>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-9">{periodLabel} · Salary processing</p>
        </div>
        <Link
          href="/dashboard/hr/payroll"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
        >
          Manage <ArrowRight size={11} />
        </Link>
      </div>

      {/* Body */}
      <div className="flex-1 p-5 flex flex-col gap-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full" />
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-center">
            <PackageOpen size={32} className="text-gray-300 dark:text-gray-700" />
            <p className="text-sm font-semibold text-gray-400 dark:text-gray-600">No payroll records this month</p>
            <Link href="/dashboard/hr/payroll" className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
              Go to Payroll →
            </Link>
          </div>
        ) : (
          <>
            {/* Pending amount headline */}
            <div className="rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/60 dark:bg-amber-950/15 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400 mb-1">Pending Payroll Amount</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{formatINR(amount)}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{tot} records this cycle</p>
            </div>

            {/* Progress bar — paid / total */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Processing Progress</span>
                <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">{processedPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-700"
                  style={{ width: `${processedPct}%` }}
                />
              </div>
            </div>

            {/* Mini stat grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/20 p-3 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Records</p>
                <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums">{tot}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/60 dark:bg-emerald-950/15 p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle2 size={10} className="text-emerald-500" />
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Paid</p>
                </div>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 tabular-nums">{paidCount}</p>
              </div>
              <div className="rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/60 dark:bg-amber-950/15 p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock size={10} className="text-amber-500" />
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Pending</p>
                </div>
                <p className="text-lg font-black text-amber-700 dark:text-amber-400 tabular-nums">{pendCount}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
