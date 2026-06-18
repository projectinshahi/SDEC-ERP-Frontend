'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, AreaChart, Area, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts';
import {
  AlertTriangle, RefreshCw, Lock, ShieldAlert, Inbox, Loader2, Activity,
  Briefcase, TrendingUp, CheckCircle2, CalendarDays, Bug, UserPlus, Award,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { classNames } from '@/lib/utils';

/** Enterprise chart palette — consistent across every Master module. */
export const CHART_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#0ea5e9',
];

/* ═══════════════════════════ Resource hook ════════════════════════════════ */

export type ResourceStatus = 'loading' | 'ready' | 'error' | 'unauthorized' | 'forbidden';

export interface MasterResource<T> {
  data: T | null;
  status: ResourceStatus;
  errorMsg: string;
  /** Full reload — shows the loading skeleton (use on first load / retry). */
  reload: () => void;
  /** Silent background refresh — keeps current data on screen, no skeleton. */
  refresh: () => void;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  isLoading: boolean;
}

/**
 * Standardised fetch lifecycle for a Master module. Classifies 401/403 into
 * dedicated states so the UI can show "session expired" vs "not authorized"
 * vs a generic error with retry. Pass a STABLE fetcher (a module-level imported
 * function), not an inline closure.
 */
export function useMasterResource<T>(
  fetcher: () => Promise<T>,
  opts?: { pollMs?: number },
): MasterResource<T> {
  const pollMs = opts?.pollMs;
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ResourceStatus>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const run = useCallback(async (silent: boolean) => {
    if (silent) setIsRefreshing(true);
    else { setStatus('loading'); setErrorMsg(''); }
    try {
      const result = await fetcher();
      setData(result);
      setStatus('ready');
      setLastUpdated(new Date());
    } catch (err: any) {
      // apiClient rejects with an ApiError carrying `statusCode`.
      const code = err?.statusCode ?? err?.status ?? err?.response?.status;
      if (!silent) {
        if (code === 401) setStatus('unauthorized');
        else if (code === 403) setStatus('forbidden');
        else {
          setStatus('error');
          setErrorMsg('Failed to load data. Please check your connection and try again.');
        }
      }
      // A silent background refresh that fails keeps the last good data on
      // screen — no blank screen, no crash.
    } finally {
      if (silent) setIsRefreshing(false);
    }
  }, [fetcher]);

  useEffect(() => {
    run(false);
  }, [run]);

  // Optional auto-refresh polling (real-time-ish KPI updates).
  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(() => { run(true); }, pollMs);
    return () => clearInterval(id);
  }, [pollMs, run]);

  return {
    data, status, errorMsg,
    reload: () => run(false),
    refresh: () => run(true),
    isRefreshing, lastUpdated,
    isLoading: status === 'loading',
  };
}

/* ═══════════════════════════ State screens ════════════════════════════════ */

export function ModuleLoading() {
  return (
    <div className="space-y-8">
      <div className="h-12 w-80 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function CenteredState({
  icon: Icon, iconClass, title, message, action,
}: {
  icon: any; iconClass: string; title: string; message: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col h-[70vh] items-center justify-center text-center space-y-4">
      <div className={classNames('w-16 h-16 rounded-full flex items-center justify-center', iconClass)}>
        <Icon className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
      <p className="text-slate-500 max-w-sm">{message}</p>
      {action}
    </div>
  );
}

/**
 * Renders the right screen for any non-ready resource status. Returns null when
 * ready (callers render their own content instead).
 */
export function ModuleStateScreen({
  status, errorMsg, onRetry,
}: {
  status: ResourceStatus; errorMsg?: string; onRetry: () => void;
}) {
  if (status === 'loading') return <ModuleLoading />;

  if (status === 'unauthorized') {
    return (
      <CenteredState
        icon={Lock}
        iconClass="bg-amber-100 dark:bg-amber-900/30 text-amber-600"
        title="Session Expired"
        message="Your session has expired. Please sign in again to continue."
        action={
          <a href="/login" className="px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition inline-flex items-center gap-2">
            Sign In
          </a>
        }
      />
    );
  }

  if (status === 'forbidden') {
    return (
      <CenteredState
        icon={ShieldAlert}
        iconClass="bg-rose-100 dark:bg-rose-900/30 text-rose-600"
        title="Access Restricted"
        message="You do not have permission to view this SuperAdmin module."
      />
    );
  }

  // error
  return (
    <CenteredState
      icon={AlertTriangle}
      iconClass="bg-red-100 dark:bg-red-900/30 text-red-600"
      title="Unable to Load Data"
      message={errorMsg || 'An unexpected error occurred.'}
      action={
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      }
    />
  );
}

export function EmptyState({
  icon: Icon = Inbox, title, message,
}: {
  icon?: any; title: string; message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16">
      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{title}</h3>
      {message && <p className="text-slate-500 max-w-sm mt-2">{message}</p>}
    </div>
  );
}

export function ChartEmpty({ label = 'No data available' }: { label?: string }) {
  return (
    <div className="h-[240px] flex flex-col items-center justify-center text-center text-slate-400">
      <Inbox className="w-8 h-8 mb-2 text-slate-300" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/* ═══════════════════════════ Header ═══════════════════════════════════════ */

export function ModuleHeader({
  icon: Icon, title, subtitle, accent = 'bg-indigo-600', shadow = 'shadow-indigo-500/20',
  actions, onRefresh,
}: {
  icon: any; title: string; subtitle: string; accent?: string; shadow?: string;
  actions?: ReactNode; onRefresh?: () => void;
}) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className={classNames('w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg', accent, shadow)}>
            <Icon className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        )}
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold border border-emerald-200 dark:border-emerald-800/50">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Data
        </span>
      </div>
    </header>
  );
}

/* ═══════════════════════════ Stat cards ═══════════════════════════════════ */

const TONES: Record<string, string> = {
  indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50',
  emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
  rose: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
  amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
  violet: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-400 border-violet-200 dark:border-violet-800/50',
  slate: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

export function StatCard({
  label, value, format, sub, icon: Icon, tone = 'indigo', alert,
}: {
  label: string; value: number; format?: (n: number) => string; sub?: string;
  icon: any; tone?: keyof typeof TONES | string; alert?: boolean;
}) {
  return (
    <Card className={classNames(
      'p-6 shadow-sm rounded-2xl relative overflow-hidden transition-all',
      alert ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
    )}>
      {alert && <span className="absolute top-4 right-4 w-3 h-3 bg-rose-500 rounded-full animate-ping" />}
      <div className="flex items-start justify-between relative z-10">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">{label}</p>
          <h4 className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            <AnimatedCounter value={value ?? 0} format={format} />
          </h4>
          {sub && <p className="text-xs font-medium text-slate-400 mt-2 truncate">{sub}</p>}
        </div>
        <div className={classNames('w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border', TONES[tone] ?? TONES.indigo)}>
          <Icon size={22} />
        </div>
      </div>
    </Card>
  );
}

export function MiniStat({
  label, value, icon: Icon, tone = 'indigo',
}: {
  label: string; value: number | string; icon: any; tone?: keyof typeof TONES | string;
}) {
  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardBody className="p-4 flex items-center gap-3">
        <div className={classNames('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border', TONES[tone] ?? TONES.indigo)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}

/* ═══════════════════════════ Chart card + charts ══════════════════════════ */

export function ChartCard({
  title, subtitle, children, className, action,
}: {
  title: string; subtitle?: string; children: ReactNode; className?: string; action?: ReactNode;
}) {
  return (
    <Card className={classNames('border-slate-200 dark:border-slate-800 shadow-sm', className)}>
      <CardHeader className="px-6 pt-5 pb-0 border-0 flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </CardHeader>
      <CardBody className="p-4 pt-2">{children}</CardBody>
    </Card>
  );
}

export interface Point { label: string; value: number }

export function DonutChart({ data, colors }: { data: Point[]; colors?: string[] }) {
  if (!data || data.length === 0) return <ChartEmpty />;
  const total = data.reduce((s, d) => s + d.value, 0);
  // All-zero buckets (e.g. the 4 priority buckets before any tickets exist)
  // must not render an invisible/degenerate pie.
  if (total === 0) return <ChartEmpty label="No data yet" />;
  const palette = colors && colors.length ? colors : CHART_COLORS;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
          </Pie>
          <RechartsTooltip
            formatter={(v: any, n: any) => [`${v} (${total > 0 ? Math.round((Number(v) / total) * 100) : 0}%)`, n]}
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="w-full sm:w-44 space-y-1.5">
        {data.slice(0, 6).map((d, i) => (
          <div key={d.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: palette[i % palette.length] }} />
              <span className="text-slate-600 dark:text-slate-300 capitalize truncate">{d.label}</span>
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineTrend({
  data, series, height = 280,
}: {
  data: Array<Record<string, any>>;
  series: Array<{ key: string; name: string; color: string }>;
  height?: number;
}) {
  const hasData = data && data.length > 0 && data.some((d) => series.some((s) => Number(d[s.key]) > 0));
  if (!hasData) return <ChartEmpty label="No trend data yet" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
        <RechartsTooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryBars({
  data, valueFormatter,
}: {
  data: Array<Point & { amount?: number }>; valueFormatter?: (n: number) => string;
}) {
  if (!data || data.length === 0) return <ChartEmpty />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={120} />
        <RechartsTooltip
          cursor={{ fill: 'rgba(99,102,241,0.06)' }}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
          formatter={(v: any) => (valueFormatter ? valueFormatter(Number(v)) : v)}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AreaTrend({
  data, dataKey = 'value', color = '#6366f1', valueFormatter, height = 260,
}: {
  data: Array<Record<string, any>>; dataKey?: string; color?: string;
  valueFormatter?: (n: number) => string; height?: number;
}) {
  const hasData = data && data.some((d) => Number(d[dataKey]) > 0);
  if (!hasData) return <ChartEmpty label="No trend data yet" />;
  const gradId = `grad-${dataKey}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          width={valueFormatter ? 70 : 40} allowDecimals={false}
          tickFormatter={valueFormatter ? (v) => valueFormatter(Number(v)) : undefined}
        />
        <RechartsTooltip
          formatter={(v: any) => (valueFormatter ? valueFormatter(Number(v)) : v)}
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#${gradId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GroupedTrend({
  data, series, height = 260,
}: {
  data: Array<Record<string, any>>;
  series: Array<{ key: string; name: string; color: string }>;
  height?: number;
}) {
  const hasData = data && data.some((d) => series.some((s) => Number(d[s.key]) > 0));
  if (!hasData) return <ChartEmpty label="No trend data yet" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
        <RechartsTooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} barSize={16} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ═══════════════════════════ Activity feed ════════════════════════════════ */

export interface FeedActivity {
  id: number;
  actor: string;
  type: string;
  description: string;
  created_at: string;
}

function activityVisual(type: string): { icon: any; tint: string } {
  const t = (type || '').toLowerCase();
  if (t.includes('deal') && t.includes('won')) return { icon: Award, tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' };
  if (t.includes('project')) return { icon: Briefcase, tint: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' };
  if (t.includes('deal') || t.includes('lead') || t.includes('sales')) return { icon: TrendingUp, tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' };
  if (t.includes('task')) return { icon: CheckCircle2, tint: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' };
  if (t.includes('meeting')) return { icon: CalendarDays, tint: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' };
  if (t.includes('bug') || t.includes('ticket') || t.includes('blocker')) return { icon: Bug, tint: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' };
  if (t.includes('user') || t.includes('member') || t.includes('role')) return { icon: UserPlus, tint: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' };
  return { icon: Activity, tint: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
}

export function ActivityFeed({
  activities, title = 'Recent Activity', emptyLabel = 'No recent activity recorded.', maxHeight = 'max-h-[460px]',
}: {
  activities: FeedActivity[]; title?: string; emptyLabel?: string; maxHeight?: string;
}) {
  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 px-6 py-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" /> {title}
        </h3>
      </CardHeader>
      <CardBody className="p-0">
        <div className={classNames('divide-y divide-slate-100 dark:divide-slate-800/50 overflow-y-auto', maxHeight)}>
          {activities && activities.length > 0 ? (
            activities.map((act) => {
              const { icon: Icon, tint } = activityVisual(act.type);
              return (
                <div key={act.id} className="p-4 px-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-4">
                  <div className={classNames('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', tint)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-200">
                      <span className="font-semibold">{act.actor}</span> {act.description}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(act.created_at).toLocaleString()}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-10 text-center text-slate-500">
              <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              {emptyLabel}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export { Loader2 };
