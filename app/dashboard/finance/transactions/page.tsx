'use client';

/**
 * Finance → Transactions. A unified, read-only feed combining Income + Expense
 * records (live from the backend), with Type / Status / Date-range filters.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Inbox, ArrowLeftRight } from 'lucide-react';
import { Card } from '@/components/Card';
import { FilterSelect, TypeChip, StatusChip, fmtDate } from '@/components/finance/financeUi';
import { useToast } from '@/lib/hooks/useToast';
import { formatINR } from '@/lib/utils/currency';
import { fetchTransactions, type FinanceTransaction } from '@/lib/api/finance';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];
const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'received', label: 'Received' },
  { value: 'paid', label: 'Paid' },
];

export default function FinanceTransactionsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<FinanceTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setRows(await fetchTransactions());
    } catch {
      toast('Failed to load transactions', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Bounds computed in UTC to match the UTC-midnight stored dates (the date
    // inputs are yyyy-mm-dd → UTC midnight); +1 day −1ms makes `to` inclusive.
    const fromT = from ? new Date(from).getTime() : null;
    const toT = to ? new Date(to).getTime() + 86_400_000 - 1 : null;
    return rows.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (q && !(r.title.toLowerCase().includes(q) || (r.party || '').toLowerCase().includes(q) || (r.category || '').toLowerCase().includes(q))) return false;
      const t = new Date(r.date).getTime();
      if (fromT !== null && t < fromT) return false;
      if (toT !== null && t > toT) return false;
      return true;
    });
  }, [rows, search, typeFilter, statusFilter, from, to]);

  const netTotal = useMemo(
    () => visible.reduce((s, r) => s + (r.type === 'income' ? r.amount : -r.amount), 0),
    [visible],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-blue-600" /> Transactions
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">A unified view of all income and expense records.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search title or party…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <FilterSelect ariaLabel="Filter by type" value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
        <FilterSelect ariaLabel="Filter by status" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        <input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        <input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)}
          className="py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {visible.length} · Net <span className={`font-bold ${netTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatINR(netTotal)}</span>
        </span>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden border border-gray-200 dark:border-gray-800 rounded-2xl">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Inbox className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-500">{rows.length === 0 ? 'No transactions yet.' : 'No transactions match your filters.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visible.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3"><TypeChip type={r.type} /></td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.title}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.party || '—'}</td>
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
