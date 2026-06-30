'use client';

/**
 * Master Dashboard → Finance Overview (Phase 1 — UI ONLY).
 *
 * Everything below is DUMMY/STATIC data. There are no API calls, no backend, no
 * Finance role/permissions yet. The page lives under the existing SuperAdmin-gated
 * Master Dashboard layout, so it inherits founder-only access automatically.
 *
 * Data is declared as plain constants and passed into the reusable FinanceKit
 * components, so Phase 2 only needs to replace these constants with live API data.
 */

import { useMemo, useState } from 'react';
import {
  Wallet, CreditCard, TrendingUp, Coins, Calendar, ChevronDown, Download,
  Bell, AlertTriangle,
} from 'lucide-react';
import { useAuthContext } from '@/lib/context/AuthContext';
import { formatINR } from '@/lib/utils/currency';
import {
  FinancePanel, FinanceStatCard, IncomeExpenseBars, ExpenseDonut, CashFlowChart,
  BankAccountRow, TransactionRow, FinanceAlertRow,
} from '@/components/master/finance/FinanceKit';

/* ───────────────────────────── DUMMY DATA ────────────────────────────────── */

const KPIS = [
  { label: 'Total Revenue', value: 2580000, Icon: Wallet, tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400', trend: 18.6, trendLabel: 'vs Apr 1 - Apr 30' },
  { label: 'Total Expenses', value: 1645000, Icon: CreditCard, tint: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400', trend: 12.4, trendLabel: 'vs Apr 1 - Apr 30' },
  { label: 'Net Profit', value: 935000, Icon: TrendingUp, tint: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400', trend: 27.8, trendLabel: 'vs Apr 1 - Apr 30' },
  { label: 'Cash in Hand', value: 780500, Icon: Coins, tint: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400', trend: 8.3, trendLabel: 'vs Apr 1 - Apr 30' },
];

const INCOME_EXPENSE = [
  { month: 'Dec', income: 1800000, expenses: 1100000 },
  { month: 'Jan', income: 1600000, expenses: 1200000 },
  { month: 'Feb', income: 1900000, expenses: 1250000 },
  { month: 'Mar', income: 2300000, expenses: 1300000 },
  { month: 'Apr', income: 2000000, expenses: 1300000 },
  { month: 'May', income: 2580000, expenses: 1645000 },
];
const INCOME_TOTAL = 2580000;
const EXPENSE_TOTAL = 1645000;

const EXPENSE_BREAKDOWN = [
  { label: 'Salaries & Wages', value: 620000, color: '#3b82f6' },
  { label: 'Marketing & Sales', value: 310000, color: '#22c55e' },
  { label: 'Software & Tools', value: 185000, color: '#8b5cf6' },
  { label: 'Office & Admin', value: 160000, color: '#f59e0b' },
  { label: 'Rent & Utilities', value: 120000, color: '#14b8a6' },
  { label: 'Other Expenses', value: 250000, color: '#94a3b8' },
];

const CASH_FLOW = [
  { label: 'W1', value: 520000 },
  { label: 'W2', value: 610000 },
  { label: 'W3', value: 575000 },
  { label: 'W4', value: 690000 },
  { label: 'W5', value: 640000 },
  { label: 'W6', value: 720000 },
  { label: 'W7', value: 700000 },
  { label: 'W8', value: 780500 },
];
const CASH_INFLOW = 2830000;
const CASH_OUTFLOW = 2049500;
const NET_CASH_FLOW = 780500;

const BANK_ACCOUNTS = [
  { name: 'HDFC Bank', type: 'Current Account', balance: 485300, badge: 'HD', badgeColor: 'bg-red-500' },
  { name: 'ICICI Bank', type: 'Current Account', balance: 215200, badge: 'IC', badgeColor: 'bg-orange-500' },
  { name: 'Axis Bank', type: 'Current Account', balance: 85000, badge: 'AX', badgeColor: 'bg-rose-700' },
  { name: 'Cash in Hand', type: 'Physical Cash', balance: 195000, badge: '₹', badgeColor: 'bg-emerald-500' },
];

const TRANSACTIONS = [
  { title: 'Invoice #INV-1048', subtitle: 'Acme Corporation', amount: 240000, date: 'May 31, 2026', income: true },
  { title: 'Salary Payment', subtitle: 'May 2026', amount: 620000, date: 'May 30, 2026', income: false },
  { title: 'Invoice #INV-1047', subtitle: 'XYZ Retail Pvt Ltd', amount: 180000, date: 'May 29, 2026', income: true },
  { title: 'Office Rent', subtitle: 'May 2026', amount: 100000, date: 'May 28, 2026', income: false },
];

const ALERTS = [
  { tone: 'rose' as const, Icon: Bell, title: 'Expenses are 12.4% higher than last month', detail: 'Review your expenses to optimize costs' },
  { tone: 'amber' as const, Icon: AlertTriangle, title: '2 Invoices overdue', detail: 'Total overdue amount: ₹3,20,000' },
];

const DATE_RANGES = ['May 1 - May 31, 2026', 'Apr 1 - Apr 30, 2026', 'Q2 2026 (Apr - Jun)', 'FY 2025 - 2026'];

/* ──────────────────────────────── Page ───────────────────────────────────── */

export default function MasterFinancePage() {
  const { user } = useAuthContext();
  const [range, setRange] = useState(DATE_RANGES[0]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }, []);
  const firstName = (user?.name || 'there').split(' ')[0];

  // Phase-1 export: download the dummy snapshot as CSV (client-side, no backend).
  const handleExport = () => {
    const L: string[] = ['Finance Overview (sample data)', `Range,${range}`, '', 'KPI,Value'];
    KPIS.forEach((k) => L.push(`${k.label},${k.value}`));
    L.push('', 'Expense Breakdown,Amount');
    EXPENSE_BREAKDOWN.forEach((e) => L.push(`${e.label},${e.value}`));
    const blob = new Blob([L.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finance-overview-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            {greeting}, {firstName} <span aria-hidden>👋</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Here&apos;s your business finance overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              aria-label="Date range"
              className="appearance-none pl-9 pr-8 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {DATE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white text-sm font-semibold shadow-sm transition"
          >
            <Download size={15} /> Export Report
          </button>
        </div>
      </header>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((k) => (
          <FinanceStatCard
            key={k.label}
            label={k.label}
            value={formatINR(k.value)}
            Icon={k.Icon}
            tint={k.tint}
            trend={k.trend}
            trendLabel={k.trendLabel}
            trendPositive
          />
        ))}
      </div>

      {/* ── Income vs Expenses + Expense Breakdown (60 / 40 split, matches Figma) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <FinancePanel
          title="Income vs Expenses"
          className="lg:col-span-3"
          action={<StaticSelect options={['Monthly', 'Quarterly', 'Yearly']} />}
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-3 text-sm">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-slate-500">Income</span><span className="font-bold text-slate-800 dark:text-slate-100 ml-1 tabular-nums">{formatINR(INCOME_TOTAL)}</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /><span className="text-slate-500">Expenses</span><span className="font-bold text-slate-800 dark:text-slate-100 ml-1 tabular-nums">{formatINR(EXPENSE_TOTAL)}</span></span>
          </div>
          <IncomeExpenseBars data={INCOME_EXPENSE} />
        </FinancePanel>

        <FinancePanel
          title="Expense Breakdown"
          className="lg:col-span-2"
          action={<span className="text-xs text-slate-400">Total: {formatINR(EXPENSE_TOTAL)}</span>}
        >
          <ExpenseDonut data={EXPENSE_BREAKDOWN} total={EXPENSE_TOTAL} />
          <button type="button" className="mt-4 w-full flex items-center justify-end gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
            View full expense report <ChevronDown size={13} className="-rotate-90" />
          </button>
        </FinancePanel>
      </div>

      {/* ── Cash Flow + Bank Accounts + (Transactions / Alerts) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cash Flow */}
        <FinancePanel title="Cash Flow" action={<StaticSelect options={['This Month', 'Last Month', 'This Quarter']} />}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-600">Cash Inflow</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatINR(CASH_INFLOW)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-rose-600">Cash Outflow</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatINR(CASH_OUTFLOW)}</span>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500">Net Cash Flow</p>
              <p className="text-2xl font-extrabold text-emerald-600 tabular-nums mt-0.5">{formatINR(NET_CASH_FLOW)}</p>
            </div>
            <CashFlowChart data={CASH_FLOW} />
          </div>
        </FinancePanel>

        {/* Bank Accounts */}
        <FinancePanel
          title="Bank Accounts"
          action={<button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View All</button>}
          bodyClassName="px-3 pb-4"
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {BANK_ACCOUNTS.map((b) => <BankAccountRow key={b.name} {...b} />)}
          </div>
          <button type="button" className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
            Manage Bank Accounts <ChevronDown size={13} className="-rotate-90" />
          </button>
        </FinancePanel>

        {/* Recent Transactions + Financial Alerts */}
        <div className="space-y-5">
          <FinancePanel
            title="Recent Transactions"
            action={<button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View All</button>}
            bodyClassName="px-3 pb-3"
          >
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {TRANSACTIONS.map((t) => <TransactionRow key={t.title} {...t} />)}
            </div>
          </FinancePanel>

          <FinancePanel
            title="Financial Alerts"
            action={<button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View All</button>}
            bodyClassName="px-3 pb-3"
          >
            <div className="space-y-1">
              {ALERTS.map((a) => <FinanceAlertRow key={a.title} {...a} />)}
            </div>
          </FinancePanel>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 pt-1">All amounts are in INR (₹) · sample data (Finance module — Phase 1)</p>
    </div>
  );
}

/** Small inert dropdown used as a Phase-1 placeholder control (visual only). */
function StaticSelect({ options }: { options: string[] }) {
  const [value, setValue] = useState(options[0]);
  return (
    <div className="relative">
      <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
