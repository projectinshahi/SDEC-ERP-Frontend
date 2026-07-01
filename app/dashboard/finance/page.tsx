'use client';

/**
 * Finance → Dashboard (landing page). LIVE financial summary derived from the
 * Income + Expense records via /finance/overview: Total Income, Total Expenses,
 * Net Profit and Recent Transactions. Refetches on mount + window focus and via
 * the Refresh control, so it reflects any add/edit/delete automatically.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, CreditCard, Wallet, ArrowLeftRight, RefreshCw, Inbox, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/Card';
import { TypeChip, StatusChip, fmtDate } from '@/components/finance/financeUi';
import { useToast } from '@/lib/hooks/useToast';
import { formatINR } from '@/lib/utils/currency';
import { fetchFinanceOverview, type FinanceOverview } from '@/lib/api/finance';

const TONES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
};

export default function FinanceDashboardPage() {
  const { toast } = useToast();
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setData(await fetchFinanceOverview());
    } catch {
      if (!silent) toast('Failed to load finance overview', 'error');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Keep the summary live: refetch when the tab/window regains focus (e.g. after
  // adding an income/expense on another tab) — no manual refresh needed.
  useEffect(() => {
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [load]);

  const netProfit = data?.netProfit ?? 0;
  const recent = data?.recentTransactions ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-indigo-600" /> Finance Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your live financial summary across income and expenses.</p>
        </div>
        <button onClick={() => load()} title="Refresh"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Total Income" value={data?.totalIncome ?? 0} Icon={TrendingUp} tone="emerald" loading={isLoading} />
        <KpiCard label="Total Expenses" value={data?.totalExpenses ?? 0} Icon={CreditCard} tone="rose" loading={isLoading} />
        <KpiCard label="Net Profit" value={netProfit} Icon={Wallet} tone={netProfit >= 0 ? 'blue' : 'rose'} loading={isLoading} />
      </div>

      {/* Recent transactions */}
      <Card className="p-0 overflow-hidden border border-gray-200 dark:border-gray-800 rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <ArrowLeftRight size={16} className="text-blue-500" /> Recent Transactions
          </h2>
          <Link href="/dashboard/finance/transactions" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
            View all <ArrowUpRight size={13} />
          </Link>
        </div>
        {isLoading ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
            <Inbox className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-500">No transactions yet. Add income or expenses to see them here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recent.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3"><TypeChip type={r.type} /></td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.title}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${r.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {r.type === 'income' ? '+' : '−'}{formatINR(r.amount)}
                    </td>
                    <td className="px-4 py-3"><StatusChip status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function KpiCard({ label, value, Icon, tone, loading }: {
  label: string; value: number; Icon: React.ComponentType<{ size?: number; className?: string }>; tone: string; loading: boolean;
}) {
  return (
    <Card className="p-5 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white tabular-nums mt-2">
            {loading ? '—' : formatINR(value)}
          </p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}
