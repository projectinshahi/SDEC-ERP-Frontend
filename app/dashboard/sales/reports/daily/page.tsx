'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Phone,
  Users,
  CheckSquare,
  UserPlus,
  Briefcase,
  Trophy,
  XCircle,
  IndianRupee,
  CalendarDays,
  Radio,
  FileBarChart,
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Badge, type BadgeVariant } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { fetchDailyReport } from '@/lib/api/salesReports';
import { fetchAssignableUsers } from '@/lib/api/leads';
import type { DailyReportResponse, DailyReportState } from '@/lib/types/salesReports';
import type { AssignableUser } from '@/lib/types/lead';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat('en-IN');

const STATE_VARIANT: Record<DailyReportState, BadgeVariant> = {
  generated: 'success',
  pending: 'warning',
  failed: 'danger',
};
const STATE_LABEL: Record<DailyReportState, string> = {
  generated: 'Generated',
  pending: 'Pending',
  failed: 'Failed',
};

function todayIso(): string {
  // Local date in YYYY-MM-DD (avoids UTC off-by-one from toISOString).
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

interface Kpi {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  accent: string;
}

function DailyReportContent() {
  const { toast } = useToast();

  const [date, setDate] = useState<string>(todayIso());
  const [ownerId, setOwnerId] = useState<string>(''); // '' = all owners
  const [owners, setOwners] = useState<AssignableUser[]>([]);
  const [report, setReport] = useState<DailyReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load assignable users once for the owner filter.
  useEffect(() => {
    let active = true;
    fetchAssignableUsers()
      .then((users) => {
        if (active) setOwners(users);
      })
      .catch(() => {
        if (active) setOwners([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDailyReport({
        date: date || undefined,
        ownerId: ownerId ? Number(ownerId) : undefined,
      });
      setReport(data);
    } catch {
      setReport(null);
      toast('Failed to load the daily report.', 'error');
    } finally {
      setLoading(false);
    }
  }, [date, ownerId, toast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const ownerOptions = useMemo(
    () => [
      { value: '', label: 'All owners' },
      ...owners.map((u) => ({ value: String(u.id), label: u.name })),
    ],
    [owners]
  );

  const kpis = useMemo<Kpi[]>(() => {
    const t = report?.totals;
    return [
      { label: 'Calls', value: numberFormatter.format(t?.calls ?? 0), icon: Phone, accent: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
      { label: 'Meetings', value: numberFormatter.format(t?.meetings ?? 0), icon: Users, accent: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' },
      { label: 'Follow-ups', value: numberFormatter.format(t?.followUpsCompleted ?? 0), icon: CheckSquare, accent: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30' },
      { label: 'Leads Contacted', value: numberFormatter.format(t?.leadsContacted ?? 0), icon: UserPlus, accent: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30' },
      { label: 'Deals Created', value: numberFormatter.format(t?.dealsCreated ?? 0), icon: Briefcase, accent: 'text-violet-600 bg-violet-50 dark:bg-violet-950/30' },
      { label: 'Deals Won', value: numberFormatter.format(t?.dealsWon ?? 0), icon: Trophy, accent: 'text-green-600 bg-green-50 dark:bg-green-950/30' },
      { label: 'Deals Lost', value: numberFormatter.format(t?.dealsLost ?? 0), icon: XCircle, accent: 'text-red-600 bg-red-50 dark:bg-red-950/30' },
      { label: 'Revenue Won', value: inrFormatter.format(t?.revenueWon ?? 0), icon: IndianRupee, accent: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
    ];
  }, [report]);

  const rows = report?.rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Sales', href: '/dashboard/sales/leads' },
            { label: 'Daily Report', href: '/dashboard/sales/reports/daily' },
          ]}
        />
        {report?.isLive && (
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            Live — today, in progress
          </span>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Daily Report</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Per-owner sales activity and outcomes for the selected day.
        </p>
      </div>

      {/* Filters */}
      <Card variant="outlined">
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <InputField
              id="report-date"
              label="Report date"
              type="date"
              value={date}
              max={todayIso()}
              onChange={setDate}
              icon={CalendarDays}
            />
            <SelectField
              id="report-owner"
              label="Owner"
              value={ownerId}
              onChange={setOwnerId}
              options={ownerOptions}
              placeholder="All owners"
              icon={Users}
            />
          </div>
        </CardBody>
      </Card>

      {/* KPI strip */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800 p-4 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 truncate">
                    {kpi.label}
                  </p>
                  <p className="mt-1.5 text-xl font-bold text-gray-900 dark:text-white truncate">{kpi.value}</p>
                </div>
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${kpi.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Per-owner table */}
      <Card variant="outlined">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Per-owner breakdown</h2>
            {!loading && rows.length > 0 && (
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                {rows.length} {rows.length === 1 ? 'owner' : 'owners'}
              </span>
            )}
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<FileBarChart className="h-9 w-9" />}
                title="No report data"
                description="There is no activity for the selected day and owner."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    <th className="px-4 py-3 font-semibold">Owner</th>
                    <th className="px-4 py-3 font-semibold text-right">Calls</th>
                    <th className="px-4 py-3 font-semibold text-right">Meetings</th>
                    <th className="px-4 py-3 font-semibold text-right">Leads Contacted</th>
                    <th className="px-4 py-3 font-semibold text-right">Follow-ups</th>
                    <th className="px-4 py-3 font-semibold text-right">Deals Created</th>
                    <th className="px-4 py-3 font-semibold text-right">Deals Won</th>
                    <th className="px-4 py-3 font-semibold text-right">Deals Lost</th>
                    <th className="px-4 py-3 font-semibold text-right">Revenue Won</th>
                    <th className="px-4 py-3 font-semibold">State</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.ownerId}
                      className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-white">{row.name}</div>
                        {row.email && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">{row.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{numberFormatter.format(row.calls)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{numberFormatter.format(row.meetings)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{numberFormatter.format(row.leadsContacted)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{numberFormatter.format(row.followUpsCompleted)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{numberFormatter.format(row.dealsCreated)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-green-600 dark:text-green-500 font-medium">{numberFormatter.format(row.dealsWon)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-500 font-medium">{numberFormatter.format(row.dealsLost)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900 dark:text-white">{inrFormatter.format(row.revenueWon)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATE_VARIANT[row.state]}>{STATE_LABEL[row.state]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default function DailyReportPage() {
  return (
    <PermissionPageGuard module="sales">
      <DailyReportContent />
    </PermissionPageGuard>
  );
}
