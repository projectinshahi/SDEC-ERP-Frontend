'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  ListTodo,
  AlertTriangle,
  CalendarClock,
  PauseCircle,
  CalendarCheck2,
  CalendarX2,
  CheckCircle2,
  Users,
  UserPlus,
  Target as TargetIcon,
  TrendingUp,
  Briefcase,
  Pause,
  Trophy,
  XCircle,
} from 'lucide-react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { PermissionPageGuard } from '@/components/permissions/PermissionPageGuard';
import { useToast } from '@/lib/hooks/useToast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';
import { fetchBdeDashboard } from '@/lib/api/bdeDashboard';
import type { BdeDashboard } from '@/lib/types/salesExecution';
import { SmartAlertsBanner } from '@/components/sales-execution/bde/SmartAlertsBanner';
import { TargetProgressCard } from '@/components/sales-execution/bde/TargetProgressCard';
import { SetTargetModal } from '@/components/sales-execution/bde/SetTargetModal';
import { TaskTodayList } from '@/components/sales-execution/bde/TaskTodayList';
import { ProductivityCard } from '@/components/sales-execution/bde/ProductivityCard';

type StatTone = 'indigo' | 'blue' | 'rose' | 'amber' | 'emerald' | 'violet';

const TONE_STYLES: Record<StatTone, string> = {
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel(): string {
  return new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function BdeDashboardPage() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { user } = useAuth();

  const [data, setData] = useState<BdeDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);

  const canEdit = hasPermission('sales.edit');

  const load = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) setIsRefreshing(true);
        else setIsLoading(true);
        setData(await fetchBdeDashboard());
      } catch {
        toast('Failed to load BDE dashboard', 'error');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PermissionPageGuard module="sales">
      <div className="space-y-6">
        {/* Greeting header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {greeting()}
              {user?.name ? `, ${user.name}` : ''}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{todayLabel()}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => load(true)} disabled={isLoading || isRefreshing}>
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : data ? (
          <>
            {/* Smart alerts */}
            <SmartAlertsBanner alerts={data.smartAlerts} />

            {/* Summary stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile label="Today's Tasks" value={data.tasks.counts.dueToday} icon={ListTodo} tone="indigo" />
              <StatTile label="Overdue" value={data.tasks.counts.overdue} icon={AlertTriangle} tone="rose" />
              <StatTile label="Follow-ups Due" value={data.followUps.dueToday} icon={CalendarClock} tone="blue" />
              <StatTile label="Stalled Deals" value={data.deals.stalled} icon={PauseCircle} tone="amber" />
            </div>

            {/* Two-column: tasks + target/follow-ups */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left: Today's Tasks */}
              <Card className="lg:col-span-2 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Today&apos;s Tasks</h3>
                <div className="space-y-5">
                  <TaskTodayList title="Overdue" tasks={data.tasks.overdue} accent="red" />
                  <div className="border-t border-gray-100 dark:border-gray-800" />
                  <TaskTodayList title="Due Today" tasks={data.tasks.dueToday} accent="blue" />
                  <div className="border-t border-gray-100 dark:border-gray-800" />
                  <TaskTodayList title="Upcoming" tasks={data.tasks.upcoming} accent="green" />
                </div>
              </Card>

              {/* Right: Target + follow-ups summary */}
              <div className="space-y-6">
                <TargetProgressCard target={data.target} canEdit={canEdit} onEdit={() => setShowTargetModal(true)} />

                <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Follow-ups</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <MiniTile label="Scheduled" value={data.followUps.scheduled} icon={CalendarCheck2} tone="blue" />
                    <MiniTile label="Missed" value={data.followUps.missed} icon={CalendarX2} tone="rose" />
                    <MiniTile label="Completed" value={data.followUps.completed} icon={CheckCircle2} tone="emerald" />
                  </div>
                </Card>
              </div>
            </div>

            {/* Lead + Deal summaries */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Lead Summary</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MiniTile label="Assigned" value={data.leads.assigned} icon={Users} tone="indigo" />
                  <MiniTile label="New" value={data.leads.new} icon={UserPlus} tone="blue" />
                  <MiniTile label="Qualified" value={data.leads.qualified} icon={TargetIcon} tone="violet" />
                  <MiniTile label="Converted" value={data.leads.converted} icon={TrendingUp} tone="emerald" />
                </div>
              </Card>

              <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Deal Summary</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MiniTile label="Active" value={data.deals.active} icon={Briefcase} tone="blue" />
                  <MiniTile label="Stalled" value={data.deals.stalled} icon={Pause} tone="amber" />
                  <MiniTile label="Won" value={data.deals.won} icon={Trophy} tone="emerald" />
                  <MiniTile label="Lost" value={data.deals.lost} icon={XCircle} tone="rose" />
                </div>
              </Card>
            </div>

            {/* Productivity */}
            <ProductivityCard productivity={data.productivity} />

            {/* Set target modal */}
            <SetTargetModal
              isOpen={showTargetModal}
              onClose={() => setShowTargetModal(false)}
              currentAmount={data.target.target}
              period={data.target.period}
              onSaved={() => load(true)}
            />
          </>
        ) : null}
      </div>
    </PermissionPageGuard>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: StatTone;
}) {
  return (
    <Card className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${TONE_STYLES[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}

function MiniTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: StatTone;
}) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3.5">
      <span className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${TONE_STYLES[tone]}`}>
        <Icon size={16} />
      </span>
      <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
