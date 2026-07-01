'use client';

/**
 * Finance → Reports. Phase-1 summary report: Total Income, Total Expenses and
 * Net Profit — all live from the Income/Expenses records via /finance/overview.
 */

import { useCallback, useEffect, useState } from 'react';
import { TrendingUp, CreditCard, Wallet, BarChart3, RefreshCw } from 'lucide-react';
import { Card } from '@/components/Card';
import { useToast } from '@/lib/hooks/useToast';
import { formatINR } from '@/lib/utils/currency';
import { fetchFinanceOverview, type FinanceOverview } from '@/lib/api/finance';

export default function FinanceReportsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setData(await fetchFinanceOverview());
    } catch {
      toast('Failed to load report', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const netProfit = data?.netProfit ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" /> Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Live financial summary across all income and expenses.</p>
        </div>
        <button onClick={load} title="Refresh"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ReportCard label="Total Income" value={data?.totalIncome ?? 0} sub={`${data?.incomeCount ?? 0} entries`} Icon={TrendingUp} tone="emerald" loading={isLoading} />
        <ReportCard label="Total Expenses" value={data?.totalExpenses ?? 0} sub={`${data?.expenseCount ?? 0} entries`} Icon={CreditCard} tone="rose" loading={isLoading} />
        <ReportCard label="Net Profit" value={netProfit} sub={netProfit >= 0 ? 'Profit' : 'Loss'} Icon={Wallet} tone={netProfit >= 0 ? 'blue' : 'rose'} loading={isLoading} />
      </div>

      <Card className="p-6 border border-gray-200 dark:border-gray-800 rounded-2xl">
        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4">Profit &amp; Loss Summary</h2>
        <div className="space-y-3 max-w-md text-sm">
          <Row label="Total Income" value={formatINR(data?.totalIncome ?? 0)} tone="text-emerald-600" />
          <Row label="Total Expenses" value={`− ${formatINR(data?.totalExpenses ?? 0)}`} tone="text-rose-600" />
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="font-bold text-gray-900 dark:text-white">Net Profit</span>
            <span className={`text-lg font-extrabold tabular-nums ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatINR(netProfit)}</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-400">Net Profit = Total Income − Total Expenses · updates automatically as records change.</p>
      </Card>
    </div>
  );
}

const TONES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
};

function ReportCard({ label, value, sub, Icon, tone, loading }: {
  label: string; value: number; sub: string; Icon: React.ComponentType<{ size?: number; className?: string }>; tone: string; loading: boolean;
}) {
  return (
    <Card className="p-5 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white tabular-nums mt-2">
            {loading ? '—' : formatINR(value)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600 dark:text-gray-300">{label}</span>
      <span className={`font-semibold tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}
