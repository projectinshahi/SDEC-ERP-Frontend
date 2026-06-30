'use client';

/**
 * FinanceKit — reusable presentational building blocks for the Master Dashboard
 * Finance Overview (Phase 1, UI only). Components are PURELY presentational:
 * they take data via props and bake in no fetching, so wiring live Finance APIs
 * later only means swapping the dummy data the page passes in.
 */

import { ReactNode } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, ArrowDownLeft, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatINR } from '@/lib/utils/currency';

/** Compact INR for chart axes — 0 / 10L / 20L / 1.2Cr. */
export function compactINR(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n % 1e7 === 0 ? 0 : 1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(n % 1e5 === 0 ? 0 : 1)}L`;
  if (n >= 1e3) return `₹${Math.round(n / 1e3)}K`;
  return `₹${n}`;
}

/* ─────────────────────────── Card shell ──────────────────────────────────── */

export function FinancePanel({
  title, subtitle, action, children, className = '', bodyClassName = 'px-5 pb-5',
}: {
  title?: string; subtitle?: ReactNode; action?: ReactNode; children: ReactNode;
  className?: string; bodyClassName?: string;
}) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            {title && <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>}
            {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

/* ─────────────────────────── KPI stat card ───────────────────────────────── */

export function FinanceStatCard({
  label, value, Icon, tint, trend, trendLabel, trendPositive = true,
}: {
  label: string; value: string; Icon: LucideIcon; tint: string;
  trend?: number; trendLabel?: string; trendPositive?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${tint}`}>
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-3 text-[26px] leading-none font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</p>
      {(trend !== undefined || trendLabel) && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs">
          {trend !== undefined && (
            <span className={`inline-flex items-center gap-0.5 font-bold ${trendPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trendPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(trend)}%
            </span>
          )}
          {trendLabel && <span className="text-slate-400">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Charts ──────────────────────────────────────── */

export function IncomeExpenseBars({ data, height = 280 }: {
  data: { month: string; income: number; expenses: number }[]; height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} tickFormatter={compactINR} />
        <RTooltip
          formatter={(v: any, n: any) => [formatINR(Number(v)), n === 'income' ? 'Income' : 'Expenses']}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
          cursor={{ fill: 'rgba(99,102,241,0.05)' }}
        />
        <Bar dataKey="income" name="income" fill="#22c55e" radius={[5, 5, 0, 0]} maxBarSize={22} />
        <Bar dataKey="expenses" name="expenses" fill="#ef4444" radius={[5, 5, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExpenseDonut({ data, total }: {
  data: { label: string; value: number; color: string }[]; total: number;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative w-[150px] h-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={52} outerRadius={74} paddingAngle={2} stroke="none">
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <RTooltip formatter={(v: any, n: any) => [formatINR(Number(v)), n]} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">{formatINR(total)}</span>
          <span className="text-[11px] text-slate-400">Total</span>
        </div>
      </div>
      <div className="flex-1 w-full space-y-2.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="truncate text-slate-600 dark:text-slate-300">{d.label}</span>
            </span>
            <span className="flex items-center gap-3 shrink-0">
              <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{formatINR(d.value)}</span>
              <span className="text-slate-400 w-12 text-right tabular-nums">{total > 0 ? ((d.value / total) * 100).toFixed(1) : '0'}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CashFlowChart({ data, height = 150 }: {
  data: { label: string; value: number }[]; height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fin-cashflow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <RTooltip formatter={(v: any) => [formatINR(Number(v)), 'Balance']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
        <Area type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2.5} fill="url(#fin-cashflow)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ─────────────────────────── List rows ───────────────────────────────────── */

export function BankAccountRow({ name, type, balance, badge, badgeColor }: {
  name: string; type: string; balance: number; badge: string; badgeColor: string;
}) {
  return (
    <div className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${badgeColor}`}>{badge}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{name}</p>
        <p className="text-xs text-slate-400">{type}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatINR(balance)}</p>
        <p className="text-xs text-slate-400">Available Balance</p>
      </div>
    </div>
  );
}

export function TransactionRow({ title, subtitle, amount, date, income }: {
  title: string; subtitle: string; amount: number; date: string; income: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
      <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${income ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
        {income ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{title}</p>
        <p className="text-xs text-slate-400 truncate">{subtitle}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold tabular-nums ${income ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {income ? '+' : '-'}{formatINR(Math.abs(amount))}
        </p>
        <p className="text-xs text-slate-400">{date}</p>
      </div>
    </div>
  );
}

const ALERT_TONE: Record<'rose' | 'amber' | 'blue', { tint: string }> = {
  rose: { tint: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
  amber: { tint: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  blue: { tint: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
};

export function FinanceAlertRow({ tone, Icon, title, detail }: {
  tone: 'rose' | 'amber' | 'blue'; Icon: LucideIcon; title: string; detail: string;
}) {
  const t = ALERT_TONE[tone];
  return (
    <div className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
      <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.tint}`}><Icon size={16} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{title}</p>
        <p className="text-xs text-slate-400 truncate">{detail}</p>
      </div>
      <ChevronRight size={16} className="text-slate-300 shrink-0" />
    </div>
  );
}
